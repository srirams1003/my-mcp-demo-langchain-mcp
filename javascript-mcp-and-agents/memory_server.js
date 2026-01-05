import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { pipeline } from "@xenova/transformers";
import { LocalIndex } from "vectra";

const MEMORY_FILE = path.resolve("brain.json");
const index = new LocalIndex(path.resolve(".vectra"));

// global variable to hold the AI model
let embedder = null;

async function init() {
	try { await fs.access(MEMORY_FILE); } 
	catch { await fs.writeFile(MEMORY_FILE, JSON.stringify([])); }

	if (!await index.isIndexCreated()) {
		await index.createIndex();
	}

	console.error("Loading AI Model (this may take a moment)...");
	embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
	console.error("AI Model Ready!");
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
				description: "Save an important fact about the user.",
				inputSchema: {
					type: "object",
					properties: {
						fact: { type: "string" },
						tags: { type: "string" }
					},
					required: ["fact"],
				},
			},
			{
				name: "recall_facts",
				description: "Search for facts in long-term memory.",
				inputSchema: {
					type: "object",
					properties: {
						query: { type: "string" },
					},
					required: ["query"],
				},
			},
		],
	};
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	// NOTE: We don't need to read the JSON file for every request if we are using the vector store for search,
	// but we keep it here to maintain the backup file.
	// --- SAFE READ START ---
	let data = [];
	try {
		const fileContent = await fs.readFile(MEMORY_FILE, "utf-8");
		data = JSON.parse(fileContent);
	} catch (error) {
		console.error("Warning: Could not read memory file (corrupt or missing). Starting fresh.");
		data = []; // Reset to empty array so the server doesn't crash
	}
	// --- SAFE READ END ---

	switch (request.params.name) {
		// --- CASE 1: REMEMBER ---
		case "remember_fact": {
			const { fact, tags } = request.params.arguments;
			const newEntry = { 
				id: Date.now(), 
				fact, 
				tags: tags || "general", 
				date: new Date().toISOString() // This is the timestamp
			};

			// 1. Backup to JSON
			data.push(newEntry);
			await fs.writeFile(MEMORY_FILE, JSON.stringify(data, null, 2));

			// 2. Generate Embedding
			const embedding = await embedder(fact, { pooling: 'mean', normalize: true });

			// 3. Insert into Vector DB with Timestamp Metadata
			await index.insertItem({
				vector: Array.from(embedding.data),
				metadata: { 
					factId: newEntry.id, 
					fact, 
					tags: newEntry.tags,
					created_at: newEntry.date // <--- Storing it here!
				}
			});

			return { content: [{ type: "text", text: `Saved fact: "${fact}"` }] };
		}

		// --- CASE 2: RECALL ---
		case "recall_facts": {
			const { query } = request.params.arguments;

			// 1. Search Vector DB
			const queryEmbedding = await embedder(query, { pooling: 'mean', normalize: true });
			const results = await index.queryItems(Array.from(queryEmbedding.data), 5); // increased limit to see history

			if (results.length === 0) {
				return { content: [{ type: "text", text: "No relevant memories found." }] };
			}

			// 2. Format Output (Including the Timestamp)
			const formatted = results.map(r => 
				`- [${r.item.metadata.created_at}] ${r.item.metadata.fact} (Score: ${r.score.toFixed(2)})`
			).join("\n");

			return { content: [{ type: "text", text: `Found memories:\n${formatted}` }] };
		}

		default:
			throw new Error(`Unknown tool: ${request.params.name}`);
	}
});

async function main() {
	await init();
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Memory MCP Server running on stdio");
}

main();
