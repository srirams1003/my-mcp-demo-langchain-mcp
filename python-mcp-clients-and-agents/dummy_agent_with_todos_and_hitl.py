import os
from typing import List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from langchain_google_vertexai import ChatVertexAI
from langchain_core.tools import tool
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command
from langchain.agents.middleware.todo import TodoListMiddleware

# --- 1. Define The Tool for the Middleware ---
# Even with middleware, the tool function usually needs to exist somewhere.
# (If using the real imported middleware, it might provide this internally, 
# but we define it here to be safe for the polyfill).
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

# --- 2. Define Worker Tools ---
@tool
def get_weather(city: str):
    """Get the current weather for a specific city."""
    print(f"[SYSTEM] 🌦️ WEATHER TOOL: Checking weather for {city}...")
    return f"The weather in {city} is Sunny, 25°C."

@tool
def calculate_math(expression: str):
    """Evaluate a mathematical expression."""
    print(f"[SYSTEM] 🧮 MATH TOOL: Calculating '{expression}'...")
    try:
        return str(eval(expression))
    except Exception as e:
        return f"Error: {e}"

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

    model = ChatVertexAI(
        model="gemini-2.5-flash",
        temperature=0
    )

    # --- 3. Configure Middleware ---
    
    # A. Todo Middleware (Manages the planning tool & prompt)
    todo_middleware = TodoListMiddleware()

    # B. HITL Middleware (Manages the interrupts)
    hitl_middleware = HumanInTheLoopMiddleware(
        interrupt_on={
            "write_todos": True,   # 🛑 Interrupt when the plan is created
            "write_file": True,    # 🛑 Interrupt when writing to disk
            "get_weather": False,
            "calculate_math": False,
        },
        description_prefix="⚠️  REVIEW REQUIRED",
    )

    checkpointer = InMemorySaver()

    # --- 4. Create the Agent ---
    # Note: We do NOT pass 'write_todos' in the tools list here explicitly if 
    # the middleware handles it, but passing it doesn't hurt. 
    # We pass the OTHER tools.
    tools = [get_weather, calculate_math, write_file, write_todos]

    agent = create_agent(
        model=model,
        tools=tools,
        middleware=[todo_middleware, hitl_middleware], # Chaining middleware
        checkpointer=checkpointer,
    )

    # --- 5. Run the Workflow ---
    config = {"configurable": {"thread_id": "middleware_demo_v2"}}

    user_query = "Check the weather in Austin, multiply the temperature by 2, and save the result to 'austin_stats.txt'."
    
    print("\n" + "="*50)
    print(f"User Request: '{user_query}'")
    print("="*50 + "\n")

    response = agent.invoke(
        {"messages": [{"role": "user", "content": user_query}]},
        config=config
    )

    # --- 6. Handle Interrupts ---
    while "__interrupt__" in response:
        interrupt_data = response["__interrupt__"][0]
        action_request = interrupt_data.value['action_requests'][0]
        tool_name = action_request['name']
        tool_args = action_request['args']

        print(f"\n🛑 INTERRUPT TRIGGERED by tool: '{tool_name}'")
        
        if tool_name == "write_todos":
            print("\n📋 Proposed Plan (via TodoMiddleware):")
            tasks = tool_args.get('tasks', [])
            for i, task in enumerate(tasks, 1):
                print(f"   {i}. {task}")
            print(f"   (Reason: {tool_args.get('reason', 'None')})")
            print("\n👉 Approve Plan?")
        else:
            print(f"Args: {tool_args}")
            print(f"\n👉 Approve Action?")

        decision = input("(y/n): ")

        if decision.lower() == "y":
            print("✅ Approved.")
            resume_command = Command(resume={"decisions": [{"type": "approve"}]})
            response = agent.invoke(resume_command, config=config)
        else:
            print("❌ Rejected.")
            feedback = input("Feedback: ")
            resume_command = Command(
                resume={"decisions": [{"type": "reject", "message": feedback}]}
            )
            response = agent.invoke(resume_command, config=config)

    print("\n🏁 Workflow Complete")
    print("Final Response:", response["messages"][-1].content)

if __name__ == "__main__":
    run_agent()
