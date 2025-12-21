# LangChain MCP Agent Demo

This project demonstrates a couple of multi-tool agents built with LangChain.js, LangGraph.js, and the Model-Context-Protocol (MCP). The agents in these files can interact with multiple independent MCP servers that provide tools for different functionalities.

## Project Overview

This repository contains a collection of Node.js scripts that showcase how to build and interact with MCP servers. These servers provide tools for:

*   **Math:** Adding and multiplying numbers.
*   **Weather:** Getting the weather for a location.
*   **Memory:** Storing and recalling facts.
*   **Git:** Checking the status, diff, and log of a Git repository.

The agent is built using LangGraph.js and can be connected to Langsmith Studio for debugging and tracing.

## Setup

1.  **Install Dependencies:**
    ```sh
    npm install
    ```

2.  **Set up Environment Variables:**
    ```sh
    cp .env.example .env
    ```
    You will need to add your Gemini API key to the `.env` file.

## Available Scripts

### `math_server.js`

This script starts an MCP server that provides `add` and `multiply` tools. The server communicates over stdio.

**To run:**
```sh
node math_server.js
```

### `memory_server.js`

This script starts an MCP server that provides `remember_fact` and `recall_facts` tools. The server communicates over stdio and uses a local vector store (`.vectra`) and a JSON file (`brain.json`) for persistence.

**To run:**
```sh
node memory_server.js
```

### `git_server.js`

This script starts an MCP server that provides `git_status`, `git_diff`, and `git_log` tools. The server communicates over stdio.

**To run:**
```sh
node git_server.js
```

### `multi_server_mcp_client.js`

This script is a command-line client that connects to the `math`, `weather`, and `memory` servers. It demonstrates how to use the tools provided by these servers by running a few tests.

**To run:**
```sh
node multi_server_mcp_client.js
```

### `mcp_agent_memory.js`

This script creates an interactive command-line agent that connects to the `math`, `weather`, and `memory` servers. The agent uses a local SQLite database (`memory.db`) for long-term memory.

**To run:**
```sh
node mcp_agent_memory.js
```

### `weather_server.js`

This script starts an MCP server that provides a `get_weather` tool. The server runs on `http://localhost:8000` and it uses the SSE transport method.

**To run:**
```sh
node weather_server.js
```

### `agent_graph.js`

This script defines a LangGraph agent that connects to the `math`, `weather`, and `memory` servers. This is the entry point for Langsmith Studio integration.

## Langsmith Studio Integration

Langsmith Studio allows you to debug, trace, and visualize your LangGraph agents. To use it with this project, you can use the `langgraphjs dev` command.

1.  **Start the LangGraph development server:**
    ```sh
    langgraphjs dev
    ```
    This command will start a development server that watches for changes in your `agent_graph.js` file and provides a UI for interacting with your agent.

2.  **Open Langsmith Studio:**
    The command will output a URL to the Langsmith Studio UI. Open this URL in your browser to start interacting with your agent.


