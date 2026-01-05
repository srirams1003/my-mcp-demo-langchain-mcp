# Python RAG Practice

This directory contains a collection of Python scripts for practicing and demonstrating concepts related to Retrieval-Augmented Generation (RAG) using the LangChain library.

## Setup

1.  **Create a virtual environment: **
    ```sh
    python -m venv .venv
    ```

2.  **Activate the virtual environment: **
    *   **macOS/Linux:**
        ```sh
        source .venv/bin/activate
        ```
    *   **Windows:**
        ```sh
        .venv\Scripts\activate
        ```

3.  **Install Dependencies: **
    ```sh
    pip install -r requirements.txt
    ```

4.  **Download NLTK Data: **
    The `bm25_retriever_integration_langchain.py` script requires the `punkt` tokenizer from NLTK. Download it by running the following Python code:
    ```python
    import nltk
    nltk.download("punkt")
    ```

## Available Scripts

### `arxiv_retriever_integration_langchain.py`

This script demonstrates how to use the `ArxivRetriever` to fetch and process scientific papers from Arxiv.

**To run: **
```sh
python arxiv_retriever_integration_langchain.py
```

### `bm25_retriever_integration_langchain.py`

This script demonstrates the use of `BM25Retriever` for in-memory text retrieval.

**To run: **
```sh
python bm25_retriever_integration_langchain.py
```

### `recursive_character_text_splitter.py`

This script demonstrates how to use the `RecursiveCharacterTextSplitter` to split a document into smaller chunks. It reads the content from `wikipedia_page.txt`.

**To run: **
```sh
python recursive_character_text_splitter.py
```

### `text_splitter.py`

This script demonstrates how to use the `CharacterTextSplitter` to split a document into smaller chunks. It reads the content from `state_of_the_union.txt`.

**To run: **
```sh
python text_splitter.py
```