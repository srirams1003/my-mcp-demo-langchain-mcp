import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatVertexAI } from "@langchain/google-vertexai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
		const tools = await client.getTools();
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
			stateModifier: `You are a helpful AI assistant with access to a Long-Term Memory.

RULES FOR MEMORY:
1. If the user tells you a fact, use 'remember_fact' to save it.
2. If you find CONFLICTING memories (e.g. "Favorite animal is dog" vs "cat"), trust the entry with the MOST RECENT timestamp.
3. If the user asks a question that relies on past context (e.g. "What is the weather at my home?"), use 'recall_facts' to find that information first.
4. Do not ask the user for information you already have.
5. CRITICAL: If the 'recall_facts' tool returns information that CONFLICTS with earlier parts of this conversation, TRUST THE TOOL. The tool contains the most up-to-date truth, even if I said something different earlier in this chat.`,
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


	} catch (error) {
		console.error("Error running agent:", error);
	} finally {
		await client.close();
	}
}

main();
