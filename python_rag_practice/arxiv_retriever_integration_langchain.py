# NOTE: Now that you have the raw text, you can't feed it all into an LLM at once (it's too long and unstructured). The next step in a RAG pipeline is chunking. 
# TODO: Add a RecursiveCharacterTextSplitter to this script to break these documents into usable chunks.

import fitz
# FIXED: Hack to make langchain's buggy "fitz.fitz" reference work
fitz.fitz = fitz

from langchain_community.retrievers import ArxivRetriever

retriever = ArxivRetriever(
    load_max_docs=2,
    get_full_documents=True,
)

# Get by ID - this works because it's a specific paper ID
try:
    docs1 = retriever.invoke("1605.08386")
    print("Document 1 Metadata:", docs1[0].metadata)
    print("Document 1 Content (first 400 chars):", docs1[0].page_content[:400])
    print("-" * 80)
except Exception as e:
    print(f"Error fetching specific paper: {e}")

# Search by query - Let's use a more specific query to avoid "Proceedings" junk
try:
    # Using the specific title or ID prevents fetching irrelevant papers that lack PDFs
    query = "ImageBind: One Embedding Space To Bind Them All"
    print(f"Attempting to fetch with strict query: '{query}'")
    
    docs2 = retriever.invoke(query)
    
    for i, doc in enumerate(docs2):
        print(f"\nDocument {i+1} Metadata:", doc.metadata)
        print(f"Document {i+1} Content (first 400 chars):", doc.page_content[:400])
        
except Exception as e:
    print(f"Error searching papers: {e}")
