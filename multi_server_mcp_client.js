import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
// CHANGE 1: Import Google instead of Anthropic
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"; 
import path from "path";
import { fileURLToPath } from "url";
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const mathServerPath = path.resolve(__dirname, "math_server.js");

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
        console.log(`Connected! Found ${tools.length} tools:`, tools.map(t => t.name).join(", "));

        // CHANGE 2: Create a Gemini Agent
        const agent = createReactAgent({
            llm: new ChatGoogleGenerativeAI({
                model: "gemini-2.5-flash", // "flash" is fast and free-tier eligible
                apiKey: process.env.GOOGLE_API_KEY,
                temperature: 0
            }),
            tools,
        });

        console.log("\n--- Testing Math Agent ---");
        const mathResponse = await agent.invoke({
            messages: [{ role: "user", content: "what's (3 + 5) x 12?" }],
        });
        // Gemini's response structure is slightly different, but LangGraph handles it.
        // We look at the last message content.
        console.log("Agent:", mathResponse.messages[mathResponse.messages.length - 1].content);

        console.log("\n--- Testing Weather Agent ---");
        const weatherResponse = await agent.invoke({
            messages: [{ role: "user", content: "what is the weather in nyc?" }],
        });
        console.log("Agent:", weatherResponse.messages[weatherResponse.messages.length - 1].content);

    } catch (error) {
        console.error("Error running agent:", error);
    } finally {
        await client.close();
    }
}

main();
