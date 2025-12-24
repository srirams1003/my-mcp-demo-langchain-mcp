import os
import faiss
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
import json
import joblib # To save/load the TfidfVectorizer

# Configuration
KB_DIR = "knowledge_base"
FAISS_INDEX_PATH = "faiss_index/knowledge_base.faiss"
FAISS_METADATA_PATH = "faiss_index/knowledge_base_metadata.json"
TFIDF_VECTORIZER_PATH = "faiss_index/tfidf_vectorizer.joblib"

def simple_text_splitter(text, chunk_size=500, chunk_overlap=50):
    """
    A simpler text splitter.
    """
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i : i + chunk_size]
        chunks.append(" ".join(chunk_words))
        i += chunk_size - chunk_overlap
        if i >= len(words) - chunk_overlap and len(chunk_words) > 0 and (i - (chunk_size - chunk_overlap)) < len(words):
            break
    return [chunk for chunk in chunks if chunk.strip()]

def create_faiss_index():
    print("Step 1: Loading documents...")
    all_text = ""
    for filename in os.listdir(KB_DIR):
        if filename.endswith(".txt"):
            file_path = os.path.join(KB_DIR, filename)
            with open(file_path, 'r') as f:
                all_text += f.read() + "\n\n" # Add some separation between documents
    print("Step 1 Complete: Documents loaded.")

    print("Step 2: Splitting documents into chunks...")
    chunks = simple_text_splitter(all_text)
    print(f"Step 2 Complete: Split into {len(chunks)} chunks.")

    print("Step 3: Initializing and fitting TF-IDF Vectorizer...")
    vectorizer = TfidfVectorizer()
    # Fit the vectorizer on the chunks and transform them into embeddings
    embeddings = vectorizer.fit_transform(chunks).toarray()
    print(f"Step 3 Complete: Embeddings generated. Shape: {embeddings.shape}")

    print("Step 4: Creating FAISS index...")
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(np.array(embeddings).astype('float32'))
    print(f"Step 4 Complete: FAISS index created. Number of embeddings in index: {index.ntotal}")

    # Ensure the directory for FAISS index exists
    os.makedirs(os.path.dirname(FAISS_INDEX_PATH), exist_ok=True)

    print(f"Step 5: Saving FAISS index to {FAISS_INDEX_PATH}...")
    faiss.write_index(index, FAISS_INDEX_PATH)
    print("Step 5 Complete: FAISS index saved successfully.")

    print(f"Step 6: Saving metadata to {FAISS_METADATA_PATH}...")
    with open(FAISS_METADATA_PATH, 'w') as f:
        json.dump(chunks, f)
    print("Step 6 Complete: Metadata saved successfully.")

    print(f"Step 7: Saving TF-IDF Vectorizer to {TFIDF_VECTORIZER_PATH}...")
    joblib.dump(vectorizer, TFIDF_VECTORIZER_PATH)
    print("Step 7 Complete: TF-IDF Vectorizer saved successfully.")

    print("\nFAISS index creation process completed using TF-IDF.")


if __name__ == "__main__":
    create_faiss_index()
