from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from rag_pipeline import retrieve_chunks
import uvicorn
import os

app = FastAPI()

class QueryRequest(BaseModel):
    query: str
    k: int = 4

@app.post("/retrieve")
async def retrieve(request: QueryRequest):
    try:
        results = retrieve_chunks(request.query, request.k)
        return {"query": request.query, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Ensure the FAISS index is created/loaded before starting the server
    # This will trigger create_vector_store or load_vector_store within retrieve_chunks
    # when the first request comes in, but we can also pre-load it here if preferred.
    # For simplicity, we'll let retrieve_chunks handle the initial loading.
    
    # Check if a specific port is provided in the environment, otherwise use 8000
    port = int(os.environ.get("RAG_SERVER_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
