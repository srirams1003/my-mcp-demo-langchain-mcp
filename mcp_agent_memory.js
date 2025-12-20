import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { MemorySaver } from "@langchain/langgraph-checkpoint"; // <--- 1. Import Memory
import path from "path";
import { fileURLToPath } from "url";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const mathServerPath = path.resolve(__dirname, "math_server.js");

    // Initialize MCP Client
    const client = new MultiServerMCPClient({
        math: {
            transport: "stdio",
            command: "node",
            args: [mathServerPath], 
        },
        weather: {
            transport: "sse",
            url: "http://localhost:8000/mcp",
        },
    });

    try {
        console.log("Connecting to MCP servers...");
        const tools = await client.getTools();
        console.log(`Connected! Found ${tools.length} tools.`);

        // 2. Initialize the Checkpointer (In-Memory Database)
        const checkpointer = new MemorySaver();

        // Create the Agent with Memory
        const agent = createReactAgent({
            llm: new ChatVertexAI({
                model: "gemini-2.5-flash",
                vertexai: true,
                project: "fluid-stratum-481605-m8",
                location: "us-central1",
                temperature: 0
            }),
            tools,
            checkpointSaver: checkpointer, // <--- 3. Inject Memory Here
        });

        // 4. Interactive Chat Loop
        const rl = readline.createInterface({ input, output });
        
        // This ID is the "Key" to the memory. 
        // As long as this ID stays the same, the agent remembers you.
        const config = { configurable: { thread_id: "session-123" } };

        console.log("\n--- Interactive MCP Agent (Type 'exit' to quit) ---");
        console.log("Try: 'Calculate 5 + 5', then ask 'Multiply that by 10' (It should remember 10!)");

        while (true) {
            const userQuery = await rl.question("\nYou: ");
            if (userQuery.toLowerCase() === "exit") break;

            // We use .stream() to see the thinking process in real-time
            const stream = await agent.stream(
                { messages: [{ role: "user", content: userQuery }] },
                config // <--- Pass the thread_id config here
            );

            for await (const chunk of stream) {
                // Log Agent's Thoughts/Answers
                if (chunk.agent && chunk.agent.messages) {
                    const msg = chunk.agent.messages[0];
                    console.log(`🤖 Agent: ${msg.content}`);
                }
                // Log Tool Usage
                if (chunk.tools && chunk.tools.messages) {
                    const msg = chunk.tools.messages[0];
                    console.log(`🛠️ Tool (${msg.name}): ${msg.content.slice(0, 50)}...`);
                }
            }
        }

        rl.close();

    } catch (error) {
        console.error("Error running agent:", error);
    } finally {
        await client.close();
    }
}

main();
