# RAG Practice Repository

This repository contains a collection of Python scripts for practicing and demonstrating concepts related to Retrieval-Augmented Generation (RAG) using the LangChain library.

## Features

*   **Text Splitting**: Examples of splitting text into smaller chunks using `CharacterTextSplitter` and `RecursiveCharacterTextSplitter`.
*   **Text Retrieval**: A demonstration of `BM25Retriever` for in-memory text retrieval.
*   **Document Fetching**: A script to fetch and process scientific papers from Arxiv using `ArxivRetriever`.

## Setup and Usage

### 0. Create a virtual environment so as to not mess up your globally installed pip packages

```sh
source .venv/bin/activate
```

### 1. Install Dependencies

First, install the required Python packages from `requirements.txt`:

```bash
pip install -r requirements.txt
```

### 2. Download NLTK Data

The `bm25_retriever_integration_langchain.py` script requires the `punkt` tokenizer from NLTK. Download it by running the following command:

```bash
python -c "import nltk; nltk.download('punkt_tab')"
```

### 3. Run the Scripts

You can run each script individually to see the different RAG components in action:

*   **Arxiv Retriever:**
    ```bash
    python arxiv_retriever_integration_langchain.py
    ```

*   **BM25 Retriever:**
    ```bash
    python bm25_retriever_integration_langchain.py
    ```

*   **Recursive Character Text Splitter:**
    ```bash
    python recursive_character_text_splitter.py
    ```

*   **Character Text Splitter:**
    ```bash
    python text_splitter.py
    ```

### Example Data

The scripts `recursive_character_text_splitter.py` and `text_splitter.py` expect `wikipedia_page.txt` and `state_of_the_union.txt` respectively. Make sure these files are present in the root directory of the project.

