import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# [FIX 1] Revert to ChatVertexAI for GCP Credentials support
from langchain_google_vertexai import ChatVertexAI
from langchain_core.tools import tool
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

# --- 1. Define Tools ---
@tool
def write_file(filename: str, content: str):
    """Writes content to a file."""
    try:
        # actually open the file and write the content
        with open(filename, "w") as f:
            f.write(content)
        
        print(f"\n[SYSTEM] 📝 EXECUTION: Actually wrote to file '{filename}'...")
        return f"Successfully wrote to {filename}"
    except Exception as e:
        return f"Error writing file: {str(e)}"

@tool
def read_file(filename: str):
    """Reads content from a file."""
    return f"Content of {filename}"

def run_demo():
    print(f"Connecting to Google Cloud Project: {os.getenv('GOOGLE_CLOUD_PROJECT')}...")

    # [FIX 2] Use ChatVertexAI. 
    # Note: "gemini-2.5-flash" does not exist on Vertex AI yet. 
    # The current standard is "gemini-1.5-flash" or "gemini-2.0-flash-exp".
    # I have set it to 1.5-flash to ensure it runs.
    model = ChatVertexAI(
        model="gemini-2.5-flash",
        temperature=0
    )

    # --- 3. Configure HITL Middleware ---
    hitl_middleware = HumanInTheLoopMiddleware(
        interrupt_on={
            "write_file": True,
            "read_file": False,
        },
        description_prefix="⚠️  APPROVAL REQUIRED",
    )

    checkpointer = InMemorySaver()

    # --- 4. Create the Agent ---
    agent = create_agent(
        model=model,
        tools=[write_file, read_file],
        middleware=[hitl_middleware],
        checkpointer=checkpointer,
    )

    # --- 5. Run the Workflow ---
    config = {"configurable": {"thread_id": "vertex_demo_final"}}

    print("\n--- STEP 1: Sending Request ---")
    user_query = "Write a haiku about coding to file haiku.txt"
    print(f"User: '{user_query}'")

    initial_response = agent.invoke(
        {"messages": [{"role": "user", "content": user_query}]},
        config=config
    )

    # --- 6. Handle the Interrupt ---
    if "__interrupt__" in initial_response:
        interrupt_data = initial_response["__interrupt__"][0]
        action_request = interrupt_data.value['action_requests'][0]

        print(f"\n🛑 INTERRUPT CAUGHT!")
        print(f"Agent wants to call tool: {action_request['name']}")
        
        print(f"Arguments: {action_request['args']}")

        print("\n--- STEP 2: Human Review ---")
        decision = input("Do you want to approve this action? (y/n): ")

        if decision.lower() == "y":
            print("Human Admin: Approving...")
            resume_command = Command(
                resume={"decisions": [{"type": "approve"}]}
            )
            final_response = agent.invoke(resume_command, config=config)
            print("\n--- Final Agent Response ---")
            print(final_response["messages"][-1].content)
        else:
            print("Human Admin: Rejecting...")
            resume_command = Command(
                resume={
                    "decisions": [{
                        "type": "reject", 
                        "message": "User denied permission to write to disk."
                    }]
                }
            )
            final_response = agent.invoke(resume_command, config=config)
            print("\n--- Final Agent Response ---")
            print(final_response["messages"][-1].content)

    else:
        print("Agent finished without interruption.")

if __name__ == "__main__":
    run_demo()
