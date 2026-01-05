import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from "zod";

// Configuration
const PORT = 3000;
const OAUTH_TOKEN = "secret-token-123";

const app = express();
app.use(cors()); 
app.use(express.json());

// --- 1. Define Server & Tools ---
const mcpServer = new McpServer({
  name: "Secure HTTP MCP Server",
  version: "1.0.0"
});

mcpServer.tool(
  "concatenate_two_strings",
  // Define inputs using Zod so the Inspector can build a form
  { 
    a: z.string().describe("The first string"), 
    b: z.string().describe("The second string") 
  },
  async ({ a, b }) => {
    return { content: [{ type: "text", text: String(a) + String(b) }] };
  }
);


// --- 2. Custom Transport for "Streamable HTTP" ---
// This adapter forces the Single-POST-Endpoint behavior
class ExpressTransport {
  constructor(res) {
    this.res = res;
    // The server will assign this callback when we connect
    this.onmessage = null; 
    this.onclose = null;
    this.onerror = null;
  }

  // Called by McpServer when it's ready to start the session
  async start() {
    // We handle the headers here (replaces your manual setHeader calls)
    this.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Required for some proxies
    });
    
    // Send the required endpoint event
    this.res.write(`event: endpoint\ndata: /mcp\n\n`);
  }

  // Called by McpServer when it wants to send a message to the client
  async send(message) {
    this.res.write(`event: message\ndata: ${JSON.stringify(message)}\n\n`);
  }

  async close() {
    this.res.end();
    if (this.onclose) this.onclose();
  }

  // Helper: Call this to feed the POST body into the MCP server
  handlePostMessage(message) {
    if (this.onmessage) {
      this.onmessage(message);
    }
  }
}

// --- 3. Route Handler ---
app.post('/mcp', async (req, res) => {
  // A. Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader.split(' ')[1] !== OAUTH_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  console.log("New connection authenticated");

  // B. Initialize Transport
  const transport = new ExpressTransport(res);
  
  // C. Connect the Transport to the MCP Server
  await mcpServer.connect(transport);

  // D. Process the Incoming Message (from the POST body)
  // In Streamable HTTP, the first message arrives in the request body
  const message = req.body;
  transport.handlePostMessage(message);

  // E. Handle Disconnects
  req.on('close', () => {
    console.log("Client disconnected");
    transport.close();
  });
});

app.listen(PORT, () => {
  console.log(`Streamable HTTP MCP server running on http://localhost:${PORT}/mcp`);
});

