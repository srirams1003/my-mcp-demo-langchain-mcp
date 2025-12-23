from mcp.server.fastmcp import FastMCP
import shutil
import os

# 1. Initialize the Server
mcp = FastMCP("Local System Monitor")

# 2. Define a TOOL (Function the Agent can call)
@mcp.tool()
def check_disk_usage() -> str:
    """Checks the disk usage of the current system."""
    total, used, free = shutil.disk_usage("/")
    return f"Total: {total // (2**30)}GB, Used: {used // (2**30)}GB, Free: {free // (2**30)}GB"

@mcp.tool()
def list_files(directory: str = ".") -> str:
    """Lists files in a directory."""
    try:
        return "\n".join(os.listdir(directory))
    except Exception as e:
        return str(e)

# 3. Define a RESOURCE (Data the Agent can read)
@mcp.resource("system://logs")
def get_system_logs() -> str:
    """Reads the last few lines of a mock log file."""
    return "Log Entry 1: System Booted\nLog Entry 2: Disk Healthy\nLog Entry 3: Network Connected"

# 4. Define a PROMPT (Template for the Agent)
@mcp.prompt()
def diagnose_system() -> str:
    """Creates a prompt for the AI to diagnose the system."""
    return "Please review the system logs and disk usage to check for any critical issues."

if __name__ == "__main__":
    mcp.run()
