import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";

// A simple file to store our long-term facts
const MEMORY_FILE = path.resolve("brain.json");

// Initialize memory file if it doesn't exist
async function initDB() {
    try {
        await fs.access(MEMORY_FILE);
    } catch {
        await fs.writeFile(MEMORY_FILE, JSON.stringify([]));
    }
}

const server = new Server(
    { name: "long-term-memory", version: "0.1.0" },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "remember_fact",
                description: "Save an important fact about the user or the world for the long term. Use this for names, preferences, locations, or specific project details.",
                inputSchema: {
                    type: "object",
                    properties: {
                        fact: { type: "string", description: "The fact to remember (e.g. 'User lives in Texas')" },
                        tags: { type: "string", description: "Comma-separated tags for retrieval (e.g. 'personal, location')" }
                    },
                    required: ["fact"],
                },
            },
            {
                name: "recall_facts",
                description: "Search for facts in long-term memory based on a query.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Topic to search for (e.g. 'where does user live')" },
                    },
                    required: ["query"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    await initDB();
    const data = JSON.parse(await fs.readFile(MEMORY_FILE, "utf-8"));

    switch (request.params.name) {
        case "remember_fact": {
            const { fact, tags } = request.params.arguments;
            const newEntry = { id: Date.now(), fact, tags: tags || "general", date: new Date().toISOString() };
            data.push(newEntry);
            await fs.writeFile(MEMORY_FILE, JSON.stringify(data, null, 2));
            return { content: [{ type: "text", text: `Saved fact: "${fact}"` }] };
        }

        case "recall_facts": {
            const { query } = request.params.arguments;
            const terms = query.toLowerCase().split(" ");
            
            // Simple keyword matching (In production, use Vector Search)
            const results = data.filter(item => 
                terms.some(term => item.fact.toLowerCase().includes(term) || item.tags.toLowerCase().includes(term))
            );

            if (results.length === 0) {
                return { content: [{ type: "text", text: "No relevant memories found." }] };
            }

            const formatted = results.map(r => `- ${r.fact} (Tags: ${r.tags})`).join("\n");
            return { content: [{ type: "text", text: `Found memories:\n${formatted}` }] };
        }
        default:
            throw new Error(`Unknown tool: ${request.params.name}`);
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Memory MCP Server running on stdio");
}

main();
