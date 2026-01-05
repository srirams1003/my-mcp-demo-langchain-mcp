# Python MCP Clients and Agents

This directory contains Python scripts that demonstrate how to build and interact with MCP clients and agents.

## Setup

1.  **Install Dependencies:**
    ```sh
    pip install -r requirements.txt
    ```

2.  **Set up Environment Variables:**
    You may need to set up environment variables for some of the scripts. Refer to the individual script descriptions for more details. A `.env` file is used to load environment variables.

## Available Scripts

### `dummy_agent_with_todos_and_hitl.py`

This script demonstrates a dummy agent with a todo list and human-in-the-loop (HITL) functionality. The agent can get the weather, calculate math, and write files.

**To run:**
```sh
python dummy_agent_with_todos_and_hitl.py
```

### `dummy_human_in_the_loop.py`

This script demonstrates a dummy human-in-the-loop (HITL) functionality. The agent can write and read files, and it asks for approval before writing a file.

**To run:**
```sh
python dummy_human_in_the_loop.py
```

### `interactive_mcp_client.py`

This script provides an interactive command-line REPL for an MCP agent. The agent is connected to `math`, `weather`, `memory`, and `rag` servers.

**To run:**
```sh
python interactive_mcp_client.py
```

### `mcp_client.py`

This script is a non-interactive MCP client that runs a series of tests against the `math`, `weather`, `memory`, and `rag` servers.

**To run:**
```sh
python mcp_client.py
```
