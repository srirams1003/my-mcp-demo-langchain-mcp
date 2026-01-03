from mcp.server.fastmcp import FastMCP
from typing import List, Dict, Any

# 1. Initialize the Server at the module level
mcp = FastMCP("Todo List")

# In-memory storage for todos
todos: List[Dict[str, Any]] = []

@mcp.tool()
def write_todos(new_todos: List[Dict[str, Any]]) -> str:
    """
    Updates the todo list with a new list of todos.

    Args:
        new_todos (List[Dict[str, Any]]): A list of todo items. Each item should be a dictionary with "description" and "status" keys.
    
    Returns:
        str: A confirmation message.
    """
    global todos
    todos = new_todos
    return "Successfully updated the todo list."

@mcp.tool()
def get_todos() -> List[Dict[str, Any]]:
    """
    Returns the current list of todos.

    Returns:
        List[Dict[str, Any]]: The current list of todo items.
    """
    return todos

if __name__ == "__main__":
    mcp.run()