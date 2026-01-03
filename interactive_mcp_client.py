import asyncio
import os
from contextlib import AsyncExitStack
from typing import List, Optional, Type
from pydantic import BaseModel, Field, create_model

from dotenv import load_dotenv
from langchain_google_vertexai import ChatVertexAI
from langchain_core.tools import tool, StructuredTool
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langchain.agents.middleware import TodoListMiddleware
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command
from langchain_core.messages import SystemMessage, ToolMessage, AIMessage, HumanMessage

# Import MCP SDK
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

load_dotenv()

# --- 1. Helper: Dynamic Schema Conversion ---
def jsonschema_to_pydantic(schema: dict, model_name: str) -> Type[BaseModel]:
    """Converts MCP JSON Schema to Pydantic for LangChain/Gemini compatibility."""
    fields = {}
    required_fields = schema.get("required", [])
    properties = schema.get("properties", {})

    for field_name, field_def in properties.items():
        field_type = str
        t = field_def.get("type")
        if t == "integer": field_type = int
        elif t == "number": field_type = float
        elif t == "boolean": field_type = bool
        elif t == "array": field_type = list
        elif t == "object": field_type = dict
        
        default = ... if field_name in required_fields else None
        fields[field_name] = (field_type, Field(default=default, description=field_def.get("description")))

    return create_model(model_name, **fields)

# --- 2. MCP Client Wrapper ---
class MultiServerMCPClient:
    def __init__(self):
        self.exit_stack = AsyncExitStack()
        self.sessions = []
        self.tools = []

    async def connect_server(self, name: str, command: str, args: List[str], env: Optional[dict] = None):
        print(f"🔌 Connecting to {name} server...")
        server_params = StdioServerParameters(command=command, args=args, env={**os.environ, **(env or {})})

        try:
            read, write = await self.exit_stack.enter_async_context(stdio_client(server_params))
            session = await self.exit_stack.enter_async_context(ClientSession(read, write))
            await session.initialize()
            mcp_tools = await session.list_tools()
            self.sessions.append(session)

            for tool_def in mcp_tools.tools:
                args_schema = jsonschema_to_pydantic(tool_def.inputSchema, f"{tool_def.name}Schema")

                async def make_tool_func(tool_name=tool_def.name, **kwargs):
                    try:
                        result = await session.call_tool(tool_name, arguments=kwargs)
                        if result.isError: return f"Tool Error: {result.content}"
                        
                        texts = [c.text for c in result.content if c.type == "text"]
                        final_text = "\n".join(texts)
                        return final_text if final_text.strip() else "Task completed."
                    except Exception as e:
                        return f"Execution Error: {str(e)}"

                lc_tool = StructuredTool.from_function(
                    func=None,
                    coroutine=make_tool_func,
                    name=tool_def.name,
                    description=tool_def.description or f"MCP Tool: {tool_def.name}",
                    args_schema=args_schema 
                )
                self.tools.append(lc_tool)
                
            print(f"   ✅ Connected to {name}. Found {len(mcp_tools.tools)} tools.")
        except Exception as e:
            print(f"   ❌ Failed to connect to {name}: {e}")

    async def cleanup(self):
        await self.exit_stack.aclose()

# --- 3. Robust Todo Tool Definition ---
class TodoItem(BaseModel):
    task: str = Field(..., description="The task description")
    status: str = Field(..., description="Status: 'pending', 'in_progress', or 'completed'")

class TodoInput(BaseModel):
    todos: List[TodoItem] = Field(..., description="List of tasks to plan")

@tool(args_schema=TodoInput)
def write_todos(todos: List[TodoItem]):
    """
    Create and manage a list of todo items. 
    ALWAYS use this tool first to plan out the steps.
    IMPORTANT: After marking the final task as 'completed', you MUST generate a text response to the user with the final answer.
    """
    formatted = "\n".join([f"{i+1}. [{t.status.upper()}] {t.task}" for i, t in enumerate(todos)])
    return f"Current Plan:\n{formatted}"

# --- 4. Main REPL ---
async def main():
    base_dir = os.getcwd() 
    math_server = os.path.join(base_dir, "math_server.js")
    memory_server = os.path.join(base_dir, "memory_server.js")
    weather_server = os.path.join(base_dir, "typescript-weather-mcp-server", "build", "index.js")
    rag_server = os.path.join(base_dir, "rag_server.py")
    venv_python = os.path.join(base_dir, "mcp-rag-env", "bin", "python")

    client = MultiServerMCPClient()
    try:
        await client.connect_server("math", "node", [math_server])
        await client.connect_server("weather", "node", [weather_server])
        await client.connect_server("memory", "node", [memory_server])
        await client.connect_server("rag", venv_python, [rag_server])

        model = ChatVertexAI(model="gemini-2.5-flash", temperature=0)

        hitl_middleware = HumanInTheLoopMiddleware(
            interrupt_on={"write_todos": True},
            description_prefix="⚠️  REVIEW REQUIRED",
        )
        
        system_prompt = SystemMessage(content=(
            "You are a helpful AI assistant connected to various tools including Math, Weather, Memory, and RAG.\n"
            "You also have a Todo List manager to help plan complex tasks.\n\n"
            "PROTOCOL:\n"
            "1. For complex requests involving multiple steps, you MUST use 'write_todos' FIRST to create a plan.\n"
            "2. As you complete steps, call 'write_todos' again to update the task status to 'completed'.\n"
            "3. Once all tasks are done, you MUST generate a final natural language response to the user with the answer."
        ))

        all_tools = client.tools + [write_todos]

        agent = create_agent(
            model=model,
            tools=all_tools, 
            middleware=[TodoListMiddleware(), hitl_middleware],
            checkpointer=InMemorySaver(),
            system_prompt=system_prompt 
        )

        print("\n" + "="*50)
        print("🤖 MCP Agent REPL Started")
        print("Type 'exit' or 'quit' to stop.")
        print("="*50 + "\n")

        # REPL Loop
        # We reuse the same thread_id so the bot remembers context across inputs!
        config = {"configurable": {"thread_id": "repl_session_v1"}}

        while True:
            try:
                user_input = input("\nUser: ").strip()
                if user_input.lower() in ["exit", "quit"]:
                    print("Goodbye!")
                    break
                
                if not user_input:
                    continue

                await run_interactive(agent, user_input, config)

            except KeyboardInterrupt:
                print("\nGoodbye!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")

    finally:
        print("\nClosing MCP connections...")
        await client.cleanup()

async def run_interactive(agent, query, config):
    try:
        # Stream/invoke on the SAME config to preserve history
        response = await agent.ainvoke({"messages": [{"role": "user", "content": query}]}, config=config)

        # HITL Loop
        while "__interrupt__" in response:
            interrupt_data = response["__interrupt__"][0]
            action = interrupt_data.value['action_requests'][0]
            tool_name = action['name']
            
            print(f"\n🛑 INTERRUPT: Agent wants to call '{tool_name}'")
            
            if tool_name == 'write_todos':
                print("📋 Proposed Plan:")
                todos = action['args'].get('todos', [])
                for t in todos:
                    status = t.get('status', '?') if isinstance(t, dict) else t.status
                    task = t.get('task', '') if isinstance(t, dict) else t.task
                    print(f"   - [{status}] {task}")
            else:
                print(f"Arguments: {action['args']}")

            # --- USER INTERACTION ---
            print("\nOptions:")
            print("  [y] Approve")
            print("  [n] Reject / Suggest Changes")
            
            choice = input("👉 Your decision: ").strip().lower()

            if choice == 'y':
                print("✅ Approved.")
                resume = Command(resume={"decisions": [{"type": "approve"}]})
                response = await agent.ainvoke(resume, config=config)
            
            else: 
                feedback = input("📝 Enter your feedback/changes: ")
                print(f"❌ Rejected with feedback: '{feedback}'")
                resume = Command(resume={
                    "decisions": [{
                        "type": "reject", 
                        "message": f"User rejected this plan. Feedback: {feedback}"
                    }]
                })
                response = await agent.ainvoke(resume, config=config)

        # --- VERBOSE LOGGING (Cleaned) ---
        print("\n--- Execution Trace ---")
        messages = response['messages']
        
        # 1. Find the index of the LAST user message
        last_human_idx = -1
        for i in range(len(messages) - 1, -1, -1):
            if isinstance(messages[i], HumanMessage):
                last_human_idx = i
                break
        
        # 2. Slice to show only messages generated *after* that input
        recent_activity = messages[last_human_idx + 1:] if last_human_idx != -1 else messages

        for i, msg in enumerate(recent_activity):
            if isinstance(msg, AIMessage) and msg.tool_calls:
                for tc in msg.tool_calls:
                    print(f"[Step {i+1}] 🛠️ Agent called tool: {tc['name']} ({tc['args']})")
            
            elif isinstance(msg, ToolMessage):
                content = msg.content
                if isinstance(content, list):
                    content = " ".join([c.get('text', '') for c in content if isinstance(c, dict) and 'text' in c])
                
                display_content = (content[:150] + '...') if len(content) > 150 else content
                print(f"[Step {i+1}] ✅ MCP Server returned: {display_content}")

        # Final Answer
        last_msg = response['messages'][-1]
        content = last_msg.content
        
        if not content:
            print("\nFinal Answer: [Agent completed tasks but returned no text.]")
        elif isinstance(content, list):
            text_parts = [block.get('text', '') for block in content if 'text' in block]
            print(f"\nFinal Answer: {' '.join(text_parts)}")
        else:
            print(f"\nFinal Answer: {content}")
            
    except Exception as e:
        print(f"❌ Error during execution: {e}")

if __name__ == "__main__":
    asyncio.run(main())
