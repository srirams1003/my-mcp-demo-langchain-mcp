# Langsmith Studio Integration

This directory contains a LangGraph.js agent that is integrated with Langsmith Studio.

## Setup

1.  **Install Dependencies:**
    ```sh
    npm install
    ```

2.  **Install `langgraphjs` CLI:**
    ```sh
    npm install -g @langchain/langgraph-cli
    ```

## `agent_graph.js`

This script defines a LangGraph agent that connects to the `math`, `weather`, and `memory` servers. This is the entry point for Langsmith Studio integration.

### Langsmith Studio Integration

Langsmith Studio allows you to debug, trace, and visualize your LangGraph agents. To use it with this project, you can use the `langgraphjs dev` command.

1.  **Start the LangGraph development server:**
    ```sh
    langgraphjs dev
    ```
    This command will start a development server that watches for changes in your `agent_graph.js` file and provides a UI for interacting with your agent.

2.  **Open Langsmith Studio:**
    The command will output a URL to the Langsmith Studio UI. Open this URL in your browser to start interacting with your agent.
