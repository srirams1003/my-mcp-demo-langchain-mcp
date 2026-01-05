import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { VertexAIEmbeddings } from "@langchain/google-vertexai";
import { Document } from "@langchain/core/documents";
import { EnsembleRetriever } from "langchain/retrievers/ensemble";

async function runDemo() {
  // 1. The Dataset
  // Notice: One doc has a specific ID "XJ-900". Another talks about "dogs" but uses the word "canine".
  const docs = [
    new Document({ pageContent: "The device ID is XJ-900. It requires a restart." }),
    new Document({ pageContent: "A canine is a loyal animal that loves to play fetch." }),
    new Document({ pageContent: "Apples and Oranges are popular fruits." }),
  ];

  // 2. Initialize BM25 (Keyword Search)
  // It indexes the raw text frequency.
  const bm25Retriever = BM25Retriever.fromDocuments(docs, { k: 2 });

  // 3. Initialize Vector Search (Semantic Search)
  // It converts text to mathematical concept vectors.
  const vectorStore = await MemoryVectorStore.fromDocuments(
    docs,
    new VertexAIEmbeddings({
			model: "text-embedding-004"
		})
  );
  const vectorRetriever = vectorStore.asRetriever(2);

  // 4. Initialize Ensemble (Hybrid)
  // Weights: 0.5 for BM25, 0.5 for Vector
  const ensembleRetriever = new EnsembleRetriever({
    retrievers: [bm25Retriever, vectorRetriever],
    weights: [0.5, 0.5],
  });

  console.log("--- TEST 1: Keyword Specificity (Target: 'XJ-900') ---");
  // BM25 should win here because "XJ-900" is a rare, exact token.
  const res1 = await ensembleRetriever.invoke("What is the error with XJ-900?");
  console.log("Result:", res1[0].pageContent);

  console.log("\n--- TEST 2: Semantic Meaning (Target: 'Dog') ---");
  // Vector should win here. The query asks for "dog", but the doc says "canine". 
  // BM25 would fail (no keyword match), but Vectors know dog ≈ canine.
  const res2 = await ensembleRetriever.invoke("Tell me about dogs");
  console.log("Result:", res2[0].pageContent);
}

runDemo().catch(console.error);
