import os
import json
from typing import List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from langchain_google_vertexai import ChatVertexAI
from langchain_core.tools import tool
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command
from langchain_core.messages import SystemMessage

# --- 1. Define The "Todo" Tool (Planning) ---
# This tool allows the agent to save a stateful list of tasks.
@tool
def write_todos(tasks: List[str], reason: str):
    """
    Call this tool FIRST to create a plan of action.
    Args:
        tasks: A list of strings, where each string is a step to perform.
        reason: A short explanation of why this plan was chosen.
    """
    print(f"\n[SYSTEM] 📅 PLAN GENERATED: {reason}")
    for i, task in enumerate(tasks, 1):
        print(f"    {i}. {task}")
    return "Plan saved successfully. You may now proceed with step 1."

# --- 2. Define Worker Tools (Mimicking your MCP Servers) ---
@tool
def get_weather(city: str):
    """Get the current weather for a specific city."""
    print(f"[SYSTEM] 🌦️ WEATHER TOOL: Checking weather for {city}...")
    # Mock response
    return f"The weather in {city} is Sunny, 25°C."

@tool
def calculate_math(expression: str):
    """Evaluate a mathematical expression."""
    print(f"[SYSTEM] 🧮 MATH TOOL: Calculating '{expression}'...")
    try:
        # Safe eval for demo purposes
        return str(eval(expression))
    except Exception as e:
        return f"Error: {e}"

@tool
def rag_search(query: str):
    """Search the knowledge base (RAG) for information."""
    print(f"[SYSTEM] 🔍 RAG TOOL: Searching for '{query}'...")
    return "Result: The user is a software engineer moving to Texas."

@tool
def write_file(filename: str, content: str):
    """Writes content to a file on the local disk."""
    try:
        with open(filename, "w") as f:
            f.write(content)
        print(f"\n[SYSTEM] 📝 DISK IO: Wrote to file '{filename}'")
        return f"Successfully wrote to {filename}"
    except Exception as e:
        return f"Error writing file: {str(e)}"

def run_agent():
    print(f"Connecting to Google Cloud Project: {os.getenv('GOOGLE_CLOUD_PROJECT')}...")

    # Initialize Gemini
    model = ChatVertexAI(
        model="gemini-2.5-flash",
        temperature=0
    )

    # --- 3. Configure HITL Middleware ---
    # We configure it to interrupt SPECIFICALLY on 'write_todos'.
    # This satisfies the "Bonus" requirement: asking user before proceeding with the plan.
    hitl_middleware = HumanInTheLoopMiddleware(
        interrupt_on={
            "write_todos": True,   # 🛑 STOP here to review the plan
            "write_file": True,    # 🛑 STOP here for safety (optional)
            "get_weather": False,  # ✅ Auto-approve read-only tools
            "calculate_math": False,
            "rag_search": False,
        },
        description_prefix="⚠️  REVIEW REQUIRED",
    )

    checkpointer = InMemorySaver()

    # --- 4. Create the Agent ---
    # We give the agent a system prompt to enforce using the Todo tool first.
    system_prompt = SystemMessage(content=(
        "You are a helpful AI assistant."
        "You have access to a 'write_todos' tool."
        "ALWAYS start by creating a todo list plan using 'write_todos' before taking any other actions."
    ))

    tools = [write_todos, get_weather, calculate_math, rag_search, write_file]

    agent = create_agent(
        model=model,
        tools=tools,
        middleware=[hitl_middleware],
        checkpointer=checkpointer,
        system_prompt=system_prompt 
    )

    # --- 5. Run the Workflow ---
    config = {"configurable": {"thread_id": "todo_hitl_demo_v1"}}

    # A complex query that requires planning
    user_query = "Check the weather in Austin, multiply the temperature by 2, and save the result to 'austin_stats.txt'."
    
    print("\n" + "="*50)
    print(f"User Request: '{user_query}'")
    print("="*50 + "\n")

    # Initial invoke
    response = agent.invoke(
        {"messages": [{"role": "user", "content": user_query}]},
        config=config
    )

    # Loop to handle potentially multiple interrupts (Plan approval -> File write approval)
    while "__interrupt__" in response:
        interrupt_data = response["__interrupt__"][0]
        action_request = interrupt_data.value['action_requests'][0]
        tool_name = action_request['name']
        tool_args = action_request['args']

        print(f"\n🛑 INTERRUPT TRIGGERED by tool: '{tool_name}'")
        
        # Special handling for the Todo List interrupt
        if tool_name == "write_todos":
            print("\n📋 Proposed Plan:")
            tasks = tool_args.get('tasks', [])
            for i, task in enumerate(tasks, 1):
                print(f"   {i}. {task}")
            print(f"   (Reason: {tool_args.get('reason', 'None')})")
            
            print("\n👉 The agent wants to lock in this plan. Do you approve?")
        
        # Handling for other interrupts (like write_file)
        else:
            print(f"Args: {tool_args}")
            print(f"\n👉 The agent wants to execute this action. Do you approve?")

        # Input loop
        decision = input("(y/n): ")

        if decision.lower() == "y":
            print("✅ Approved. Resuming...")
            resume_command = Command(resume={"decisions": [{"type": "approve"}]})
            response = agent.invoke(resume_command, config=config)
        else:
            print("❌ Rejected.")
            feedback = input("Provide feedback for rejection: ")
            resume_command = Command(
                resume={
                    "decisions": [{
                        "type": "reject",
                        "message": feedback
                    }]
                }
            )
            response = agent.invoke(resume_command, config=config)

    # Final output
    print("\n" + "="*50)
    print("🏁 Workflow Complete")
    print("Final Response:", response["messages"][-1].content)
    print("="*50)

if __name__ == "__main__":
    run_agent()
