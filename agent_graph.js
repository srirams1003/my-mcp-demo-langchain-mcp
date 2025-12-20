import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Setup Paths
const mathServerPath = path.resolve(__dirname, "math_server.js");
const memoryServerPath = path.resolve(__dirname, "memory_server.js");
const weatherServerPath = path.resolve("/Users/sriramsuresh/terralogic/my-mcp-demo-modelcontextprotocol.io-typescript/build/index.js");

// 2. Initialize Client (Top-Level Code)
const client = new MultiServerMCPClient({
    math: { transport: "stdio", command: "node", args: [mathServerPath] },
    weather: { transport: "stdio", command: "node", args: [weatherServerPath] },
    memory: { transport: "stdio", command: "node", args: [memoryServerPath] }
});

// 3. Await Tools (This works in modern Node.js)
const tools = await client.getTools();

// 4. Initialize Memory
const checkpointer = new MemorySaver();

// 5. Create and Export the Graph DIRECTLY
export const graph = createReactAgent({
    llm: new ChatVertexAI({
        model: "gemini-2.5-flash",
        vertexai: true,
        project: "fluid-stratum-481605-m8",
        location: "us-central1",
        temperature: 0
    }),
    tools,
    checkpointSaver: checkpointer,
    stateModifier: `You are a helpful AI assistant with Long-Term Memory.
    RULES:
    1. If user tells you a fact, use 'remember_fact'.
    2. If you find CONFLICTING memories, trust the entry with the MOST RECENT timestamp.
    3. Use 'recall_facts' for personal questions.
    4. Use 'get_coordinates' before 'get_forecast' for weather.`
});
