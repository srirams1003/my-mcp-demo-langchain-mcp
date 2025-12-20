import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { MemorySaver } from "@langchain/langgraph-checkpoint"; // <--- 1. Import Memory
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const mathServerPath = path.resolve(__dirname, "math_server.js");
	const memoryServerPath = path.resolve(__dirname, "memory_server.js");

    // Initialize MCP Client
    const client = new MultiServerMCPClient({
        math: {
            transport: "stdio",
            command: "node",
            args: [mathServerPath], 
        },
        // weather: {
        //     transport: "sse",
        //     url: "http://localhost:8000/mcp",
        // },
		weather: {
			transport: "stdio",
			command: "node",
			args: ["/Users/sriramsuresh/terralogic/my-mcp-demo-modelcontextprotocol.io-typescript/build/index.js"],
		},
		memory: {
            transport: "stdio",
            command: "node",
            args: [memoryServerPath],
        }
    });

    try {
        console.log("Connecting to MCP servers...");
        const tools = await client.getTools();
        console.log(`Connected! Found ${tools.length} tools.`);

        // // 2. Initialize the Checkpointer (In-Memory Database) - short term memory
        // const checkpointer = new MemorySaver();
		// 2. Create a file called 'memory.db' on your hard drive for long-term memory
		const db = new Database("memory.db");
		const checkpointer = new SqliteSaver(db);

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
			// System Prompt to teach the Agent about Memory
			stateModifier: `You are a helpful AI assistant with access to a Long-Term Memory.

			RULES FOR MEMORY:
			1. If the user tells you a fact, use 'remember_fact' to save it.
			2. If you find CONFLICTING memories (e.g. "Favorite animal is dog" vs "cat"), trust the entry with the MOST RECENT timestamp.
            3. If the user asks a question that relies on past context (e.g. "What is the weather at my home?"), use 'recall_facts' to find that information first.
			4. Do not ask the user for information you already have.
			5. CRITICAL: If the 'recall_facts' tool returns information that CONFLICTS with earlier parts of this conversation, TRUST THE TOOL. The tool contains the most up-to-date truth, even if I said something different earlier in this chat.`,
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
            if (userQuery.toLowerCase() === "exit" || userQuery.toLowerCase() === "quit") break;

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
