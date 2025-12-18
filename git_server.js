import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import util from "util";

// Convert exec to a promise-based function so we can await it
const execPromise = util.promisify(exec);

// Create the server
const server = new Server(
    {
        name: "git-commander",
        version: "0.1.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * Helper function to run git commands safely
 */
async function runGitCommand(command) {
    try {
        // We limit the buffer size to avoid crashing on huge diffs
        const { stdout, stderr } = await execPromise(command, { maxBuffer: 1024 * 1024 * 10 });
        if (stderr && !stderr.includes("To restore them")) { // Ignore standard git hints
            console.error(`Git Warning: ${stderr}`);
        }
        return stdout.trim();
    } catch (error) {
        return `Error running git command: ${error.message}`;
    }
}

// 1. Define the Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "git_status",
                description: "Get the status of the current git repository (changed files).",
                inputSchema: {
                    type: "object",
                    properties: {}, // No arguments needed
                },
            },
            {
                name: "git_diff",
                description: "Get the actual code changes (diffs) for valid staged or unstaged files. Use this to understand WHAT changed.",
                inputSchema: {
                    type: "object",
                    properties: {
                        cached: {
                            type: "boolean",
                            description: "If true, shows changes that are staged for commit.",
                        },
                    },
                },
            },
            {
                name: "git_log",
                description: "Get the commit history.",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: {
                            type: "number",
                            description: "How many commits to show (default 5).",
                        },
                    },
                },
            },
        ],
    };
});

// 2. Handle Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
        case "git_status": {
            const output = await runGitCommand("git status");
            return {
                content: [{ type: "text", text: output }],
            };
        }

        case "git_diff": {
            const cached = request.params.arguments?.cached ? "--cached" : "";
            const output = await runGitCommand(`git diff ${cached}`);
            return {
                content: [{ type: "text", text: output || "No changes detected." }],
            };
        }

        case "git_log": {
            const limit = request.params.arguments?.limit || 5;
            // --oneline for concise output, -n for limit
            const output = await runGitCommand(`git log --oneline -n ${limit}`);
            return {
                content: [{ type: "text", text: output }],
            };
        }

        default:
            throw new Error(`Unknown tool: ${request.params.name}`);
    }
});

// 3. Start the Server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Git Commander MCP Server running on stdio");
}

main();
