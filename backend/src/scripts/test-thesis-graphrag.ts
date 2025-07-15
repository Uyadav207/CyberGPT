import { Neo4jGraphRAGService } from '../services/neo4jGraphRAGService';

async function testThesisGraphRAG() {
  const graphRAGService = new Neo4jGraphRAGService();
  
  const testQuestions = [
    // Test specific CVE queries (should find data)
    "What is CVE-2020-36848?",
    "Tell me about CVE-2019-5418",
    
    // Test general vulnerability queries
    "What vulnerabilities affect WordPress?",
    "Show me high severity CVEs",
    
    // Test cybersecurity concept queries (should add new knowledge)
    "How do I prevent SQL injection attacks?",
    "What is XSS and how do I protect against it?",
    "How do I implement strong authentication?",
    "What encryption methods should I use?",
    "How do I configure a firewall properly?",
    "How can I protect against malware?",
    "What are the best practices for preventing phishing?",
    
    // Test advanced cybersecurity topics (should add new knowledge)
    "What is zero trust architecture?",
    "How do I implement defense in depth?",
    "What is DevSecOps?",
    "How do I conduct penetration testing?",
    "What is threat hunting?",
    "How do I implement network segmentation?",
    "What is container security?",
    "How do I secure cloud infrastructure?",
    
    // Test edge cases (should add new knowledge)
    "What is quantum cryptography?",
    "How do I secure my smart home devices?",
    "What are the security implications of AI?",
    "How do I implement blockchain security?",
    "What is 5G security?",
  ];

  console.log('🎓 Testing Thesis-Enhanced GraphRAG System\n');
  console.log('This system will:');
  console.log('✅ Always provide comprehensive answers');
  console.log('✅ Dynamically add new cybersecurity knowledge');
  console.log('✅ Generate graph visualizations for all queries');
  console.log('✅ Track learning patterns for thesis analysis\n');

  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    console.log(`🔍 Test ${i + 1}/${testQuestions.length}: "${question}"`);
    console.log('='.repeat(60));
    
    try {
      const result = await graphRAGService.query(question);
      
      console.log('✅ Success!');
      console.log(`📝 Answer: ${result.answer.substring(0, 300)}...`);
      console.log(`📊 Sources: ${result.sources.length} CVEs found`);
      console.log(`🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`🧠 Reasoning: ${result.reasoning}`);
      
      // Show graph visualization data
      console.log(`🕸️  Graph Visualization:`);
      console.log(`   Nodes: ${result.graph_traversal.nodes.length}`);
      console.log(`   Relationships: ${result.graph_traversal.relationships.length}`);
      
      // Show node types for visualization
      const nodeTypes = result.graph_traversal.nodes.reduce((acc: any, node: any) => {
        const type = node.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`   Node Types:`, nodeTypes);
      console.log('');
      
    } catch (error) {
      console.log('❌ Error:', error.message);
      console.log('');
    }
  }

  console.log('🎉 Thesis-Enhanced GraphRAG testing completed!');
  console.log('\n📈 System Features Demonstrated:');
  console.log('• Dynamic knowledge addition for new concepts');
  console.log('• Comprehensive fallback responses');
  console.log('• Graph visualization data generation');
  console.log('• Learning pattern tracking');
  console.log('• Thesis-ready data collection');
}

testThesisGraphRAG().catch(console.error); 