# Python System Info MCP Server

This directory contains a Python-based MCP server that provides tools for monitoring the local system.

## Setup

1.  **Create a virtual environment:**
    ```sh
    python -m venv .venv
    ```

2.  **Activate the virtual environment:**
    *   **macOS/Linux:**
        ```sh
        source .venv/bin/activate
        ```
    *   **Windows:**
        ```sh
        .venv\Scripts\activate
        ```

3.  **Install Dependencies:**
    ```sh
    pip install "model-context-protocol[cli]"
    ```

## `system_agent.py`

This script starts an MCP server that provides the following tools and resources:

*   **Tools:**
    *   `check_disk_usage()`: Checks the disk usage of the current system.
    *   `list_files(directory: str = ".")`: Lists files in a directory.
*   **Resources:**
    *   `get_system_logs()`: Reads the last few lines of a mock log file.
*   **Prompts:**
    *   `diagnose_system()`: Creates a prompt for the AI to diagnose the system.

### How to Run

You can run the server and interact with it using the MCP Inspector.

**To run with the UI:**
```sh
source .venv/bin/activate && npx @modelcontextprotocol/inspector python system_agent.py
```

**To run in CLI mode:**

*   **List tools:**
    ```sh
    npx @modelcontextprotocol/inspector --cli python system_agent.py --method tools/list
    ```
*   **Call a tool:**
    ```sh
    npx @modelcontextprotocol/inspector --cli python system_agent.py --method tools/call --tool-name check_disk_usage
    ```
*   **List resources:**
    ```sh
    npx @modelcontextprotocol/inspector --cli python system_agent.py --method resources/list
    ```
*   **Read a resource:**
    ```sh
    npx @modelcontextprotocol/inspector --cli python system_agent.py --method resources/read get_system_logs --uri system://logs
    ```