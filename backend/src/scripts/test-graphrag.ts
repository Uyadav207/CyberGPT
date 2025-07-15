import neo4jGraphRAGService from "../services/neo4jGraphRAGService";

async function testGraphRAG() {
  console.log("🧪 Testing Neo4j GraphRAG System\n");

  const testQueries = [
    "What is CVE-2023-1234?",
    "Tell me about vulnerabilities affecting Apache",
    "What are the latest high severity CVEs?",
    "How can I mitigate SQL injection vulnerabilities?",
  ];

  for (const query of testQueries) {
    console.log(`\n🔍 Testing: "${query}"`);
    console.log("=" .repeat(50));
    
    try {
      const result = await neo4jGraphRAGService.query(query);
      
      console.log("✅ Success!");
      console.log(`Answer: ${result.answer.substring(0, 200)}...`);
      console.log(`Sources: ${result.sources.length} CVEs found`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Reasoning: ${result.reasoning}`);
      
    } catch (error) {
      console.log("❌ Error:", error.message);
    }
  }

  console.log("\n🎉 GraphRAG testing completed!");
}

// Run the test
testGraphRAG().catch(console.error); 