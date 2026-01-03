import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatVertexAI } from "@langchain/google-vertexai";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises"; // Added for file system operations
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

	const ragServerPath = path.resolve(__dirname, "rag_server.py");

	const client = new MultiServerMCPClient({
		math: {
			transport: "stdio",
			command: "node",
			args: [mathServerPath], 
		},
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
		rag: {
			transport: "stdio",
			command: "bash",
			args: ["-c", `source mcp-rag-env/bin/activate && python "${ragServerPath}"`],
		},
	});

	try {
		console.log("Connecting to MCP servers...");
		const mcpTools = await client.getTools();
		// combine mcp tools with the new todo tool
        const tools = [...mcpTools, todoTool];
		console.log(`Connected! Found ${tools.length} tools.`);

		// create a Gemini agent using your GCP Vertex AI (ADC)
		const agent = createReactAgent({
			llm: new ChatVertexAI({
				model: "gemini-2.5-flash",
				vertexai: true,
				project: "fluid-stratum-481605-m8",
				location: "us-central1",

				temperature: 0
			}),
			tools,
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

		console.log("\n--- Testing Math Agent ---");
		const mathResponse = await agent.invoke({
			messages: [{ role: "user", content: "what's (3 + 5) x 12?" }],
		});

		// Loop through all messages to see the "hidden" tool steps
		mathResponse.messages.forEach((msg, index) => {
			// This catches Steps 1 and 3 (The Agent's intent)
			if (msg.tool_calls && msg.tool_calls.length > 0) {
				msg.tool_calls.forEach(tc => {
					console.log(`[Step ${index}] 🛠️ Agent called tool: ${tc.name} (${JSON.stringify(tc.args)})`);
				});
			} 
			// This catches Steps 2 and 4 (Your MCP Server's output)
			else if (msg.constructor.name === 'ToolMessage' || msg._getType() === 'tool') {
				console.log(`[Step ${index}] ✅ MCP Server returned: ${msg.content}`);
			}
		});

		// Final Answer
		console.log("Final Agent Answer:", mathResponse.messages[mathResponse.messages.length - 1].content);

		console.log("\n--- Testing Weather Agent ---");
		const weatherResponse = await agent.invoke({
			messages: [{ role: "user", content: "what is the weather in New York City, NY?" }],
		});
		// Loop through all messages to see the "hidden" tool steps
		weatherResponse.messages.forEach((msg, index) => {
			// This catches Steps 1 and 3 (The Agent's intent)
			if (msg.tool_calls && msg.tool_calls.length > 0) {
				msg.tool_calls.forEach(tc => {
					console.log(`[Step ${index}] 🛠️ Agent called tool: ${tc.name} (${JSON.stringify(tc.args)})`);
				});
			} 
			// This catches Steps 2 and 4 (Your MCP Server's output)
			else if (msg.constructor.name === 'ToolMessage' || msg._getType() === 'tool') {
				console.log(`[Step ${index}] ✅ MCP Server returned: ${msg.content}`);
			}
		});

		// Final Answer
		console.log("Final Agent Answer:", weatherResponse.messages[weatherResponse.messages.length - 1].content);

		// console.log("\n--- Testing Memory Agent Store ---");
		// const memoryResponse1 = await agent.invoke({
		// 	messages: [{ role: "user", content: "remember that my favorite color is crimson" }],
		// });
		// memoryResponse1.messages.forEach((msg, index) => {
		// 	if (msg.tool_calls && msg.tool_calls.length > 0) {
		// 		msg.tool_calls.forEach(tc => {
		// 			console.log(`[Step ${index}] 🛠️ Agent called tool: ${tc.name} (${JSON.stringify(tc.args)})`);
		// 		});
		// 	} 
		// 	else if (msg.constructor.name === 'ToolMessage' || msg._getType() === 'tool') {
		// 		console.log(`[Step ${index}] ✅ MCP Server returned: ${msg.content}`);
		// 	}
		// });
		// console.log("Final Agent Answer:", memoryResponse1.messages[memoryResponse1.messages.length - 1].content);

		console.log("\n--- Testing RAG Agent ---");
		const ragResponse = await agent.invoke({
			messages: [{ role: "user", content: "What are programming concepts?" }],
		});
		ragResponse.messages.forEach((msg, index) => {
			if (msg.tool_calls && msg.tool_calls.length > 0) {
				msg.tool_calls.forEach(tc => {
					console.log(`[Step ${index}] 🛠️ Agent called tool: ${tc.name} (${JSON.stringify(tc.args)})`);
				});
			} 
			else if (msg.constructor.name === 'ToolMessage' || msg._getType() === 'tool') {
				console.log(`[Step ${index}] ✅ MCP Server returned: ${msg.content}`);
			}
		});
		console.log("Final Agent Answer:", ragResponse.messages[ragResponse.messages.length - 1].content);

		console.log("\n--- Testing Memory Agent Recall ---");
		const memoryResponse2 = await agent.invoke({
			messages: [{ role: "user", content: "what is my favorite color?" }],
		});
		memoryResponse2.messages.forEach((msg, index) => {
			if (msg.tool_calls && msg.tool_calls.length > 0) {
				msg.tool_calls.forEach(tc => {
					console.log(`[Step ${index}] 🛠️ Agent called tool: ${tc.name} (${JSON.stringify(tc.args)})`);
				});
			} 
			else if (msg.constructor.name === 'ToolMessage' || msg._getType() === 'tool') {
				console.log(`[Step ${index}] ✅ MCP Server returned: ${msg.content}`);
			}
		});
		console.log("Final Agent Answer:", memoryResponse2.messages[memoryResponse2.messages.length - 1].content);

		console.log("\n--- Testing Todo List Tool ---");
		const todoListResponse = await agent.invoke({
			messages: [{ role: "user", content: "Check the weather in New York and then multiply the temperature by 2." }],
		});
		todoListResponse.messages.forEach((msg, index) => {
			if (msg.tool_calls && msg.tool_calls.length > 0) {
				msg.tool_calls.forEach(tc => {
					console.log(`[Step ${index}] 🛠️ Agent called tool: ${tc.name} (${JSON.stringify(tc.args)})`);
				});
			} 
			else if (msg.constructor.name === 'ToolMessage' || msg._getType() === 'tool') {
				console.log(`[Step ${index}] ✅ MCP Server returned: ${msg.content}`);
			}
		});
		console.log("Final Agent Answer:", todoListResponse.messages[todoListResponse.messages.length - 1].content);
	} catch (error) {
		console.error("Error running agent:", error);
	} finally {
		await client.close();
	}
}

main();
