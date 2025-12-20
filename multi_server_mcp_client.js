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
			messages: [{ role: "user", content: "what is the weather in nyc?" }],
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

		console.log("\n--- Testing Memory Agent ---");
		const memoryResponse1 = await agent.invoke({
			messages: [{ role: "user", content: "remember that my favorite color is blue" }],
		});
		memoryResponse1.messages.forEach((msg, index) => {
			if (msg.tool_calls && msg.tool_calls.length > 0) {
				msg.tool_calls.forEach(tc => {
					console.log(`[Step ${index}] 🛠️ Agent called tool: ${tc.name} (${JSON.stringify(tc.args)})`);
				});
			} 
			else if (msg.constructor.name === 'ToolMessage' || msg._getType() === 'tool') {
				console.log(`[Step ${index}] ✅ MCP Server returned: ${msg.content}`);
			}
		});
		console.log("Final Agent Answer:", memoryResponse1.messages[memoryResponse1.messages.length - 1].content);

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
		// Detailed error logging to see if it's still an auth issue
		console.error("Error running agent:", error);
	} finally {
		await client.close();
	}
}

main();
