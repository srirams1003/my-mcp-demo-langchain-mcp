# Python RAG MCP Server

This directory contains a Python-based MCP server for a Retrieval-Augmented Generation (RAG) pipeline.

## Setup

1.  **Create a virtual environment:**
    ```sh
    python -m venv mcp-rag-env
    ```

2.  **Activate the virtual environment:**
    *   **macOS/Linux:**
        ```sh
        source mcp-rag-env/bin/activate
        ```
    *   **Windows:**
        ```sh
        mcp-rag-env\\Scripts\\activate
        ```

3.  **Install Dependencies:**
    ```sh
    pip install -r requirements.txt
    ```

4.  **Download NLTK data:**
    Run the following Python code to download the `punkt` tokenizer for sentence splitting:
    ```python
    import nltk
    nltk.download('punkt')
    ```

5.  **Create the FAISS index:**
    ```sh
    python create_faiss_index.py
    ```
    This will create a FAISS index from the documents in the `knowledge_base` directory.

## Available Scripts

### `create_faiss_index.py`

This script creates a FAISS index from the text files in the `knowledge_base` directory. It uses a TF-IDF vectorizer to create embeddings and stores the index in the `faiss_index` directory.

**To run:**
```sh
python create_faiss_index.py
```

### `rag_pipeline_usage_example.py`

This script demonstrates how to use the RAG pipeline to retrieve chunks of text from the knowledge base. It can either create a new FAISS index or load an existing one.

**To run:**
```sh
python rag_pipeline_usage_example.py
```

### `rag_server.py`

This script starts an MCP server that provides a `search_knowledge_base` tool. The server uses the FAISS index to search for relevant chunks of text in the knowledge base.

**To run:**
Make sure you have activated the virtual environment.
```sh
python rag_server.py
```
