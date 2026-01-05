# JavaScript MCP Servers and Agents

This directory contains a collection of Node.js scripts that showcase how to build and interact with MCP servers and agents.

## Setup

1.  **Install Dependencies:**
    ```sh
    npm install
    ```

2.  **Set up Environment Variables:**
    You may need to set up environment variables for some of the scripts. Refer to the individual script descriptions for more details.

## Available Scripts

### `bm25_demo.js`

This script demonstrates the use of the BM25Retriever for keyword search and the EnsembleRetriever for hybrid search (keyword + semantic).

**To run:**
```sh
node bm25_demo.js
```

### `concatenate_string_mcp_server.js`

This script starts an MCP server that provides a `concatenate_two_strings` tool. The server runs on `http://localhost:3000` and it uses the "Streamable HTTP" transport method.

**To run:**
```sh
node concatenate_string_mcp_server.js
```

### `git_server.js`

This script starts an MCP server that provides `git_status`, `git_diff`, and `git_log` tools. The server communicates over stdio.

**To run:**
```sh
node git_server.js
```

### `graph_demo.js`

This script demonstrates how to connect to a Neo4j graph database, create nodes and relationships, and query the graph.

**To run:**
```sh
node graph_demo.js
```

### `math_server.js`

This script starts an MCP server that provides `add` and `multiply` tools. The server communicates over stdio.

**To run:**
```sh
node math_server.js
```

### `mcp_agent_memory.js`

This script creates an interactive command-line agent that connects to the `math`, `weather`, and `memory` servers. The agent uses a local SQLite database (`memory.db`) for long-term memory.

**To run:**
```sh
node mcp_agent_memory.js
```

### `memory_server.js`

This script starts an MCP server that provides `remember_fact` and `recall_facts` tools. The server communicates over stdio and uses a local vector store (`.vectra`) and a JSON file (`brain.json`) for persistence.

**To run:**
```sh
node memory_server.js
```

### `multi_server_mcp_client.js`

This script is a command-line client that connects to the `math`, `weather`, `memory`, and `rag` servers. It demonstrates how to use the tools provided by these servers by running a few tests.

**To run:**
```sh
node multi_server_mcp_client.js
```

### `weather_server.js`

This script starts an MCP server that provides a `get_weather` tool. The server runs on `http://localhost:8000` and it uses the SSE transport method.

**To run:**
```sh
node weather_server.js
```
