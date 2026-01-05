# TypeScript Weather MCP Server

This directory contains a TypeScript-based MCP server that provides tools for getting weather information.

## Setup

1.  **Install Dependencies:**
    ```sh
    npm install
    ```

2.  **Build the project:**
    ```sh
    npm run build
    ```

## `src/index.ts`

This script starts an MCP server that provides the following tools:

*   `get_coordinates(city: string, state: string)`: Get latitude and longitude for a city.
*   `get_alerts(state: string)`: Get weather alerts for a state.
*   `get_forecast(latitude: number, longitude: number)`: Get weather forecast for a location.

### How to Run

You can run the server and interact with it using the MCP Inspector.

**To run with the UI:**
```sh
npx @modelcontextprotocol/inspector node build/index.js
```

**To run in CLI mode:**

*   **List tools:**
    ```sh
    npx @modelcontextprotocol/inspector --cli node build/index.js --method tools/list
    ```
*   **Call a tool (get_coordinates):**
    ```sh
    npx @modelcontextprotocol/inspector --cli node build/index.js --method tools/call --tool-name get_coordinates --tool-args '{"city": "Livermore", "state": "CA"}'
    ```
*   **Call a tool (get_alerts):**
    ```sh
    npx @modelcontextprotocol/inspector --cli node build/index.js --method tools/call --tool-name get_alerts --tool-args '{"state": "CA"}'
    ```
*   **Call a tool (get_forecast):**
    ```sh
    npx @modelcontextprotocol/inspector --cli node build/index.js --method tools/call --tool-name get_forecast --tool-args '{"latitude": 37.6819, "longitude": -121.7680}'
    ```