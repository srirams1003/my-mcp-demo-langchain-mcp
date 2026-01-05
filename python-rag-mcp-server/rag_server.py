import os
import faiss
import numpy as np
import json
import joblib
from mcp.server.fastmcp import FastMCP
from sklearn.feature_extraction.text import TfidfVectorizer

# Configuration (must match create_faiss_index.py)
FAISS_INDEX_PATH = "faiss_index/knowledge_base.faiss"
FAISS_METADATA_PATH = "faiss_index/knowledge_base_metadata.json"
TFIDF_VECTORIZER_PATH = "faiss_index/tfidf_vectorizer.joblib"

# 1. Initialize the Server at the module level
mcp = FastMCP("RAG Knowledge Base")

# Resource holders
global_faiss_index = None
global_metadata = None
global_vectorizer = None

def load_rag_resources():
    global global_faiss_index, global_metadata, global_vectorizer

    if global_faiss_index and global_metadata and global_vectorizer:
        # print("RAG resources already loaded.")
        return

    # print("Loading FAISS index...")
    if os.path.exists(FAISS_INDEX_PATH):
        global_faiss_index = faiss.read_index(FAISS_INDEX_PATH)
        # print("FAISS index loaded.")
    else:
        # print(f"Error: FAISS index not found at {FAISS_INDEX_PATH}. Please run create_faiss_index.py first.")
        return

    # print("Loading metadata...")
    if os.path.exists(FAISS_METADATA_PATH):
        with open(FAISS_METADATA_PATH, 'r') as f:
            global_metadata = json.load(f)
        # print("Metadata loaded.")
    else:
        # print(f"Error: Metadata not found at {FAISS_METADATA_PATH}.")
        return

    # print("Loading TF-IDF Vectorizer...")
    if os.path.exists(TFIDF_VECTORIZER_PATH):
        global_vectorizer = joblib.load(TFIDF_VECTORIZER_PATH)
        # print("TF-IDF Vectorizer loaded.")
    else:
        # print(f"Error: TF-IDF Vectorizer not found at {TFIDF_VECTORIZER_PATH}.")
        return
    # print("All RAG resources loaded successfully.")

# 2. Define a TOOL (Function the Agent can call)
@mcp.tool()
def search_knowledge_base(query: str, k: int = 3) -> str:
    """
    Searches the knowledge base for top-k relevant chunks based on the query.
    Args:
        query (str): The user's query.
        k (int): The number of top-k relevant chunks to retrieve. Defaults to 3.
    Returns:
        str: A formatted string containing the retrieved knowledge chunks.
    """
    load_rag_resources() # Ensure resources are loaded when the tool is called

    if not global_faiss_index or not global_metadata or not global_vectorizer:
        return "Knowledge base not fully loaded. Check server startup logs."

    # print(f"Searching knowledge base for query: '{query}' with k={k}")

    # Ensure k is an integer
    k = int(k)

    # Transform the query using the loaded TF-IDF vectorizer
    # Ensure the vectorizer is fitted with some vocabulary, otherwise transform will fail
    # This might happen if create_faiss_index.py failed or if the KB is empty
    try:
        query_vector = global_vectorizer.transform([query]).toarray().astype('float32')
    except Exception as e:
        # print(f"Error transforming query: {e}. Ensure TF-IDF vectorizer is properly fitted.")
        return "Error processing query for search."

    # Perform similarity search
    distances, indices = global_faiss_index.search(query_vector, k)

    results = []
    for i, idx in enumerate(indices[0]):
        if idx < len(global_metadata):
            results.append(f"Rank {i+1}: (Score: {distances[0][i]:.2f})\n{global_metadata[idx]}\n---")
        else:
            results.append(f"Rank {i+1}: (Invalid index {idx} in metadata. Metadata size: {len(global_metadata)})")

    if not results:
        return "No relevant information found in the knowledge base."
    return "\n".join(results)

if __name__ == "__main__":
    import sys
    mcp.run()
