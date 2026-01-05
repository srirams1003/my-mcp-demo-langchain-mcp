# Analysis of the `python-system-info-mcp-server` Directory

This directory contains a concise and powerful example of an MCP server that goes beyond just defining tools. It showcases the broader capabilities of the Model-Context-Protocol, including **tools**, **resources**, and **prompts**, to create a more comprehensive "System Monitor" agent.

## Core Concepts and Orchestration

The central idea is to provide an agent with a holistic set of capabilities for interacting with the local system. Instead of just giving it functions to call, we also provide it with structured data sources (`resources`) and pre-defined tasks (`prompts`). This enriches the context available to the agent.

The server is built using the `FastMCP` Python library, which provides simple decorators (`@mcp.tool`, `@mcp.resource`, `@mcp.prompt`) to expose these different components.

### Key Architectural Patterns:

1.  **Capability-Oriented Design**: The server is not just a "tool server"; it's a "capability server." It exposes three distinct types of capabilities:
    *   **Tools (`@mcp.tool`)**: These are active functions that the agent can execute to perform an action or get dynamic information. `check_disk_usage` and `list_files` are classic examples. They provide a safe, sandboxed way for the agent to interact with the filesystem.
    *   **Resources (`@mcp.resource`)**: These represent data sources that the agent can read. `get_system_logs` is defined as a resource with a unique URI (`system://logs`). This is a powerful abstraction. It separates the *act of reading* from the *data itself*. The agent can simply request to read the `system://logs` resource, and the MCP server handles the execution of the underlying `get_system_logs` function to provide the data. This is useful for providing access to logs, database records, configuration files, or other static or semi-static data.
    *   **Prompts (`@mcp.prompt`)**: These are pre-defined templates or instructions for the agent. `diagnose_system` is a prompt that gives the agent a specific goal. An orchestrator or a user could tell the agent to "execute the `diagnose_system` prompt," and the agent would receive the text "Please review the system logs and disk usage to check for any critical issues." This is useful for storing complex, multi-step tasks or standard operating procedures that the agent can be instructed to follow.

2.  **Decorator-Based API**: The use of decorators makes the code extremely clean and declarative. It's immediately clear what each function's role is in the MCP server (a tool, a resource, or a prompt). The `FastMCP` library handles all the underlying complexity of setting up the server and advertising these capabilities.

## File-by-File Analysis

### `system_agent.py`

*   **Thought Process**: The goal was to create a single, simple script that demonstrates the full breadth of the Model-Context-Protocol's features beyond just remote function calling. The "System Monitor" is an intuitive use case for showcasing tools, logs (resources), and diagnostic tasks (prompts).
*   **Orchestration**:
    1.  **Initialization**: `mcp = FastMCP("Local System Monitor")` creates the server instance.
    2.  **Tools**:
        *   `@mcp.tool() def check_disk_usage()`: This function uses Python's built-in `shutil.disk_usage` to get filesystem statistics. It's wrapped in the `@mcp.tool()` decorator, instantly making it available for an agent to call.
        *   `@mcp.tool() def list_files(directory: str = ".")`: This function uses `os.listdir` to list directory contents. It demonstrates a tool with a typed argument and a default value.
    3.  **Resource**:
        *   `@mcp.resource("system://logs") def get_system_logs()`: This function returns a hardcoded string of mock log data. The key part is the `@mcp.resource("system://logs")` decorator, which registers this function as the handler for the `system://logs` URI. An agent doesn't call `get_system_logs()`; it requests to read the content at that URI.
    4.  **Prompt**:
        *   `@mcp.prompt() def diagnose_system()`: This function returns a string that constitutes a prompt. The `@mcp.prompt()` decorator registers it under the function's name, `diagnose_system`.
    5.  **Execution**: The `if __name__ == "__main__": mcp.run()` block makes the script runnable, starting the server so it can be connected to by an MCP client or the MCP Inspector UI. The `README.md` provides excellent examples of how to interact with each of these capabilities using the `@modelcontextprotocol/inspector` CLI.
