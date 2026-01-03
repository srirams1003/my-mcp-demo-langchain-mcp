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
import { z } from "zod"; // Added for schema definition
import { Tool, DynamicStructuredTool } from "@langchain/core/tools"; // Updated: Added DynamicStructuredTool

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const todoTool = new DynamicStructuredTool({
    name: "write_todos",
    description: "Create and manage a list of todo items. ALWAYS use this tool first to plan out the steps for complex user requests, and use it again to update the status of tasks as you complete them.",
    schema: z.object({
        todos: z.array(z.object({
            task: z.string().describe("The description of the task to be done"),
            status: z.enum(["pending", "in_progress", "completed"]).describe("The current status of the task"),
        })).describe("The list of tasks representing the plan"),
    }),
    func: async ({ todos }) => {
        // By returning the stringified list, we inject the current state of the plan
        // back into the chat history so the agent 'remembers' it for the next step.
        const formatted = todos.map((t, i) => `${i + 1}. [${t.status.toUpperCase()}] ${t.task}`).join("\n");
        return `Current Plan:\n${formatted}`;
    },
});

async function main() {
	const mathServerPath = path.resolve(__dirname, "math_server.js");
	const memoryServerPath = path.resolve(__dirname, "memory_server.js");
	const weatherServerPath = path.resolve(__dirname, "typescript-weather-mcp-server/build/index.js");

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
			args: [weatherServerPath],
		},
		memory: {
			transport: "stdio",
			command: "node",
			args: [memoryServerPath],
		},
	});

	try {
		console.log("Connecting to MCP servers...");
		const mcpTools = await client.getTools();
		// combine mcp tools with the new todo tool
        const tools = [...mcpTools, todoTool];
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
			stateModifier: `You are a helpful AI assistant with access to a Long-Term Memory and a Todo List manager.

RULES FOR MEMORY:
1. If the user tells you a fact, use 'remember_fact' to save it.
2. If you find CONFLICTING memories, trust the entry with the MOST RECENT timestamp.
3. If the user asks a question relying on past context, use 'recall_facts' first.
4. If 'recall_facts' conflicts with earlier conversation, TRUST THE TOOL.

RULES FOR PLANNING (TODO LIST):
1. For any complex request (requiring multiple steps or tools), you MUST use 'write_todos' FIRST to create a plan.
2. As you complete steps, call 'write_todos' again to update the specific task's status to 'completed'.
3. Do not assume tasks are done until you have confirmed the output of the relevant tool.`,
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
