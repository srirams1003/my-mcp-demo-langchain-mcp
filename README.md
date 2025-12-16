### Setup:

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

Next, on one terminal, run:
```sh
node weather_server.js
```
On another terminal, run:
```sh
node multi_server_mcp_client.js
```
