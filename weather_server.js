import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

const app = express();
// NOTE: We do NOT use express.json() for the message endpoint in some versions 
// because handlePostMessage handles the stream, but for standard express it's usually fine.
// However, the safest bet for MCP SDK is to let the transport handle the body processing 
// or ensure it matches what the SDK expects. 
// For this fix, we will keep it simple.

const server = new Server(
    {
        name: "weather-server",
        version: "0.1.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// ... (Your ListToolsRequestSchema and CallToolRequestSchema handlers remain exactly the same) ...
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [{
            name: "get_weather",
            description: "Get weather for location",
            inputSchema: {
                type: "object",
                properties: {
                    location: { type: "string", description: "Location to get weather for" },
                },
                required: ["location"],
            },
        }],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "get_weather") {
        const { location } = request.params.arguments;
        return {
            content: [{ type: "text", text: `It's always sunny in ${location}` }],
        };
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
});

// --- THIS IS THE FIXED PART ---

let transport; // In a real app, you'd map this to session IDs

// 1. The SSE Endpoint (GET) - Establishes the connection
app.get("/mcp", async (req, res) => {
    console.log("New SSE connection established");
    
    // We tell the client: "Send your POST messages to /messages"
    transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
});

// 2. The Message Endpoint (POST) - Handles the actual data
app.post("/messages", async (req, res) => {
    console.log("Received message via POST");
    if (transport) {
        // This processes the JSON-RPC message and sends the result back to the GET stream
        await transport.handlePostMessage(req, res);
    } else {
        res.status(404).send("No active session");
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Weather MCP server running on port ${PORT}`);
});
