import asyncio
import os
import sqlite3
from typing import List, Literal, Dict, Any
from contextlib import AsyncExitStack

# LangChain / LangGraph Imports
from langchain_core.tools import tool, StructuredTool
from langchain_core.messages import SystemMessage
from langchain_google_vertexai import ChatVertexAI
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.sqlite import SqliteSaver
from pydantic import BaseModel, Field

# Official MCP Python SDK Imports
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# --- 1. Helper Class to Connect to MCP Servers ---
class MultiServerMCPClient:
    def __init__(self, server_configs: Dict[str, Dict[str, Any]]):
        self.server_configs = server_configs
        self.exit_stack = AsyncExitStack()
        self.sessions = []

    async def __aenter__(self):
        tools = []
        for name, config in self.server_configs.items():
            server_params = StdioServerParameters(
                command=config["command"],
                args=config["args"],
                env=os.environ.copy()
            )
            
            read, write = await self.exit_stack.enter_async_context(stdio_client(server_params))
            session = await self.exit_stack.enter_async_context(ClientSession(read, write))
            await session.initialize()
            
            self.sessions.append(session)
            
            mcp_list = await session.list_tools()
            for mcp_tool in mcp_list.tools:
                tools.append(self._convert_to_langchain_tool(mcp_tool, session))
                
        return tools

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.exit_stack.aclose()

    def _convert_to_langchain_tool(self, mcp_tool, session):
        async def _call_mcp_tool(**kwargs):
            result = await session.call_tool(mcp_tool.name, arguments=kwargs)
            return "\n".join([c.text for c in result.content if c.type == "text"])

        return StructuredTool.from_function(
            func=None,
            coroutine=_call_mcp_tool,
            name=mcp_tool.name,
            description=mcp_tool.description or "",
        )

# --- 2. Define the Todo Tool ---

class TodoItem(BaseModel):
    task: str = Field(description="The description of the task to be done")
    status: Literal["pending", "in_progress", "completed"] = Field(description="The current status of the task")

class TodoInput(BaseModel):
    todos: List[TodoItem] = Field(description="The list of tasks representing the plan")

@tool("write_todos", args_schema=TodoInput)
def write_todos(todos: List[TodoItem]) -> str:
    """
    Create and manage a list of todo items. ALWAYS use this tool first to plan out 
    the steps for complex user requests, and use it again to update the status of 
    tasks as you complete them.
    """
    formatted_list = [f"{i + 1}. [{t.status.upper()}] {t.task}" for i, t in enumerate(todos)]
    formatted_str = "\n".join(formatted_list)
    return f"Current Plan:\n{formatted_str}"

# --- 3. Main Application ---

async def main():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Define Paths
    math_server_path = os.path.join(current_dir, "math_server.js")
    memory_server_path = os.path.join(current_dir, "memory_server.js")
    weather_server_path = os.path.join(current_dir, "typescript-weather-mcp-server/build/index.js")
    rag_server_path = os.path.join(current_dir, "rag_server.py")

    # Define Server Configs
    mcp_config = {
        "math": {
            "command": "node",
            "args": [math_server_path],
        },
        "weather": {
            "command": "node",
            "args": [weather_server_path],
        },
        "memory": {
            "command": "node",
            "args": [memory_server_path],
        },
        "rag": {
            "command": "bash",
            "args": ["-c", f'source mcp-rag-env/bin/activate && python "{rag_server_path}"'],
        },
    }

    print("Connecting to MCP servers...")
    
    try:
        async with MultiServerMCPClient(mcp_config) as mcp_tools:
            # Combine MCP tools with the Todo tool
            tools = mcp_tools + [write_todos]
            print(f"Connected! Found {len(tools)} tools.")

            # Setup Checkpointer (SQLite)
            conn = sqlite3.connect("memory.db", check_same_thread=False)
            checkpointer = SqliteSaver(conn)

            # Create the Agent
            # Note: Removed deprecated 'vertexai' arg and cleaned up config
            model = ChatVertexAI(
                model="gemini-2.5-flash",
                project="fluid-stratum-481605-m8",
                location="us-central1",
                temperature=0
            )

            system_prompt = """You are a helpful AI assistant with access to a Long-Term Memory and a Todo List manager.

RULES FOR MEMORY:
1. If the user tells you a fact, use 'remember_fact' to save it.
2. If you find CONFLICTING memories, trust the entry with the MOST RECENT timestamp.
3. If the user asks a question that relies on past context, use 'recall_facts' first.
4. If 'recall_facts' conflicts with earlier conversation, TRUST THE TOOL.

RULES FOR PLANNING (TODO LIST):
1. For any complex request (requiring multiple steps or tools), you MUST use 'write_todos' FIRST to create a plan.
2. As you complete steps, call 'write_todos' again to update the specific task's status to 'completed'.
3. Do not assume tasks are done until you have confirmed the output of the relevant tool."""

            # FIXED: Changed 'state_modifier' to 'messages_modifier'
            agent = create_react_agent(
                model, 
                tools, 
                checkpointer=checkpointer, 
                messages_modifier=system_prompt
            )

            # --- Test Run ---
            print("\n--- Testing Todo List Tool ---")
            print("User: Check the weather in New York and then multiply the temperature by 2.")
            
            config = {"configurable": {"thread_id": "test_todo_py_v2"}}
            
            async for event in agent.astream_events(
                {"messages": [("user", "Check the weather in New York and then multiply the temperature by 2.")]}, 
                config=config, 
                version="v1"
            ):
                kind = event["event"]
                if kind == "on_tool_start":
                    print(f"🛠️ Agent called tool: {event['name']}")
                elif kind == "on_tool_end":
                    print(f"✅ Tool returned: {str(event['data'].get('output'))[:100]}...")
                elif kind == "on_chat_model_stream":
                    # print(event['data']['chunk'].content, end="", flush=True) 
                    pass
            
            print("\n--- Finished Todo Test ---")

    except Exception as e:
        print(f"Error running agent: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
