## Setup:

Get a free Gemini API key from https://aistudio.google.com/api-keys

Then run:
```sh
cp .env.example .env
```
and paste the key you got into the `.env` file


Next, run:
```sh
npm install
```

#### Now that the setup is done, you can test if everything works by running the `multi_server_mcp_client.js` file by following these steps:

On one terminal, run:
```sh
node weather_server.js
```
On another terminal, run:
```sh
node multi_server_mcp_client.js
```

<br>
<hr>
<br>

## Checking out the two servers with MCP Inspector via the UI:
### Math server:
```sh
npx @modelcontextprotocol/inspector node math_server.js
```

You can now click on "Connect" and test out the math MCP server!

### Weather server:
First run on one terminal:
```sh
node weather_server.js
```
On another terminal:
```sh
npx @modelcontextprotocol/inspector
```
#### Once the UI opens:

1. Select the "Transport Type" as "SSE"
2. Set the "URL" to be "http://localhost:8000/mcp"
3. Set the "Connection Type" to be "Via Proxy"
4. Finally, you can now click on "Connect" and test out the weather MCP server!

