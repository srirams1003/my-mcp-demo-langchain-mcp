### Setup:
First create a virtual environment to install packages via pip.
```sh
python -m venv .venv
```

### Command to run:

```sh
source .venv/bin/activate && pip install mcp && npx @modelcontextprotocol/inspector python system_agent.py
```


### CLI Mode:
If we are building a CI/CD pipeline, instead of using the UI, we can use the CLI mode as it lets us test tools via scripts automatically.

Examples of what can be done:

 ```sh
npx @modelcontextprotocol/inspector --cli python system_agent.py --method tools/list
```
 ```sh
npx @modelcontextprotocol/inspector --cli python system_agent.py --method tools/call --tool-name check_disk_usage
```
 ```sh
npx @modelcontextprotocol/inspector --cli python system_agent.py --method resources/list
```
 ```sh
npx @modelcontextprotocol/inspector --cli python system_agent.py --method resources/read get_system_logs --uri system://logs
```
