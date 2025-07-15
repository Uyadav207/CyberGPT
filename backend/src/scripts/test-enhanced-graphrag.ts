import { Neo4jGraphRAGService } from '../services/neo4jGraphRAGService';

async function testEnhancedGraphRAG() {
  const graphRAGService = new Neo4jGraphRAGService();
  
  const testQuestions = [
    // Questions that should find specific data
    "What is CVE-2020-36848?",
    "Tell me about vulnerabilities affecting WordPress",
    
    // Questions that should provide topic-specific guidance
    "How can I prevent SQL injection attacks?",
    "What is XSS and how do I protect against it?",
    "How do I implement strong authentication?",
    "What encryption methods should I use?",
    "How do I configure a firewall properly?",
    "How can I protect against malware?",
    "What are the best practices for preventing phishing?",
    
    // Questions that should provide general guidance
    "What is cybersecurity?",
    "How do I secure my network?",
    "What are the latest security threats?",
    "How do I create a security policy?",
    "What is penetration testing?",
    
    // Edge cases
    "What is quantum cryptography?",
    "How do I secure my smart home devices?",
    "What are the security implications of AI?",
  ];

  console.log('🧪 Testing Enhanced GraphRAG System\n');

  for (const question of testQuestions) {
    console.log(`🔍 Testing: "${question}"`);
    console.log('='.repeat(50));
    
    try {
      const result = await graphRAGService.query(question);
      
      console.log('✅ Success!');
      console.log(`Answer: ${result.answer.substring(0, 200)}...`);
      console.log(`Sources: ${result.sources.length} CVEs found`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Reasoning: ${result.reasoning}`);
      console.log('');
      
    } catch (error) {
      console.log('❌ Error:', error.message);
      console.log('');
    }
  }

  console.log('🎉 Enhanced GraphRAG testing completed!');
}

testEnhancedGraphRAG().catch(console.error); 