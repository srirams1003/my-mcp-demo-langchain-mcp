import os
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# Define the path to the knowledge base directory
KB_DIR = "knowledge_base"
FAISS_INDEX_PATH = "faiss_index"

def create_vector_store():
    documents = []
    for file_name in os.listdir(KB_DIR):
        if file_name.endswith(".txt"):
            file_path = os.path.join(KB_DIR, file_name)
            loader = TextLoader(file_path)
            documents.extend(loader.load())

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    texts = text_splitter.split_documents(documents)

    print(f"Split {len(documents)} documents into {len(texts)} chunks.")

    # Initialize HuggingFace Embeddings
    # Using a common model, e.g., 'sentence-transformers/all-MiniLM-L6-v2'
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    # Create a FAISS vector store
    vector_store = FAISS.from_documents(texts, embeddings)
    vector_store.save_local(FAISS_INDEX_PATH)
    print(f"FAISS index created and saved to {FAISS_INDEX_PATH}")
    return vector_store, embeddings

def load_vector_store():
    # Initialize HuggingFace Embeddings with the same model used for creation
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    vector_store = FAISS.load_local(FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True)
    print(f"FAISS index loaded from {FAISS_INDEX_PATH}")
    return vector_store, embeddings

def retrieve_chunks(query: str, k: int = 4):
    if not os.path.exists(FAISS_INDEX_PATH):
        vector_store, embeddings = create_vector_store()
    else:
        vector_store, embeddings = load_vector_store()

    docs = vector_store.similarity_search(query, k=k)
    return [doc.page_content for doc in docs]

if __name__ == "__main__":
    # Example usage:
    # This will create and save the vector store if it doesn't exist
    # or load it if it does, then perform a retrieval.
    query = "What are the key concepts of Object-Oriented Programming?"
    print(f"\nQuery: {query}")
    results = retrieve_chunks(query)
    for i, chunk in enumerate(results):
        print(f"--- Chunk {i+1} ---")
        print(chunk)

    query = "Explain variables in Python."
    print(f"\nQuery: {query}")
    results = retrieve_chunks(query)
    for i, chunk in enumerate(results):
        print(f"--- Chunk {i+1} ---")
        print(chunk)
