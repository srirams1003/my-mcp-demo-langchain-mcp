import neo4j from "neo4j-driver";

async function runGraph() {
  // 1. Connect to Database
  const driver = neo4j.driver(
    "bolt://localhost:7687",
    neo4j.auth.basic("neo4j", "password123")
  );
  const session = driver.session();

  try {
    console.log("--- 1. Creating Graph Data (Nodes & Relationships) ---");
    
    // CYPHER EXPLANATION:
    // MERGE matches existing or creates new (idempotent).
    // (:Person {name: "..."}) creates a Node with label 'Person'.
    // -[:KNOWS]-> creates a directed relationship.
    const createQuery = `
      MERGE (p1:Person {name: "Sriram"})
      MERGE (p2:Person {name: "Gemini"})
      MERGE (t:Topic {name: "Graph RAG"})
      
      MERGE (p1)-[:TALKS_TO]->(p2)
      MERGE (p1)-[:STUDIES]->(t)
      MERGE (p2)-[:EXPLAINS]->(t)
    `;
    
    await session.run(createQuery);
    console.log("Graph created!");

    console.log("\n--- 2. Querying (Finding Patterns) ---");
    
    // CYPHER EXPLANATION:
    // MATCH describes the pattern we want to find.
    // RETURN specifies what data to bring back.
    // Logic: Find any Person (p) who studies a Topic that Gemini also explains.
    const readQuery = `
      MATCH (p:Person)-[:STUDIES]->(topic:Topic)<-[:EXPLAINS]-(bot:Person {name: "Gemini"})
      RETURN p.name as student, topic.name as subject
    `;
    
    const result = await session.run(readQuery);
    
    result.records.forEach(record => {
      console.log(`${record.get("student")} is learning ${record.get("subject")} from Gemini.`);
    });

  } catch (error) {
    console.error("Graph Error:", error);
  } finally {
    await session.close();
    await driver.close();
  }
}

runGraph();

