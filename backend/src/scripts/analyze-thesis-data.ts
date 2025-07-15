import driver from '../config/neo4j';

async function analyzeThesisData() {
  const session = driver.session();
  
  try {
    console.log('🎓 Thesis Data Analysis\n');

    // 1. Analyze Cybersecurity Concepts
    console.log('📊 Cybersecurity Concepts Analysis:');
    const concepts = await session.run(`
      MATCH (c:CybersecurityConcept)
      RETURN c.category as category, count(c) as count
      ORDER BY count DESC
    `);
    
    console.log('   Concept Categories:');
    concepts.records.forEach(record => {
      console.log(`   • ${record.get('category')}: ${record.get('count')} concepts`);
    });

    // 2. Analyze Query Patterns
    console.log('\n📊 Query Analysis:');
    const queries = await session.run(`
      MATCH (q:Query)
      RETURN count(q) as total_queries,
             collect(DISTINCT q.concepts) as all_concepts
    `);
    
    const totalQueries = queries.records[0].get('total_queries');
    const allConcepts = queries.records[0].get('all_concepts').flat();
    const uniqueConcepts = [...new Set(allConcepts)];
    
    console.log(`   Total Queries: ${totalQueries}`);
    console.log(`   Unique Concepts Triggered: ${uniqueConcepts.length}`);
    console.log(`   Average Concepts per Query: ${(allConcepts.length / totalQueries).toFixed(2)}`);

    // 3. Analyze Knowledge Growth
    console.log('\n📈 Knowledge Growth Analysis:');
    const growth = await session.run(`
      MATCH (c:CybersecurityConcept)
      RETURN c.created_at as created,
             c.last_accessed as accessed,
             c.access_count as access_count
      ORDER BY c.created_at
    `);
    
    console.log('   Concept Creation Timeline:');
    growth.records.forEach((record, index) => {
      if (index < 5) { // Show first 5
        const created = record.get('created');
        const accessed = record.get('accessed');
        const count = record.get('access_count');
        console.log(`   • Created: ${created}, Accessed: ${accessed}, Count: ${count}`);
      }
    });

    // 4. Analyze Graph Relationships
    console.log('\n🕸️  Graph Relationship Analysis:');
    const relationships = await session.run(`
      MATCH ()-[r]->()
      RETURN type(r) as relationship_type, count(r) as count
      ORDER BY count DESC
    `);
    
    console.log('   Relationship Types:');
    relationships.records.forEach(record => {
      console.log(`   • ${record.get('relationship_type')}: ${record.get('count')}`);
    });

    // 5. Analyze Node Distribution
    console.log('\n📊 Node Distribution:');
    const nodes = await session.run(`
      MATCH (n)
      RETURN labels(n)[0] as node_type, count(n) as count
      ORDER BY count DESC
    `);
    
    console.log('   Node Types:');
    nodes.records.forEach(record => {
      console.log(`   • ${record.get('node_type')}: ${record.get('count')}`);
    });

    // 6. Analyze Learning Patterns
    console.log('\n🧠 Learning Pattern Analysis:');
    const patterns = await session.run(`
      MATCH (c:CybersecurityConcept)-[:RELATED_TO]->(v:Vulnerability)
      RETURN c.name as concept, count(v) as related_vulns
      ORDER BY related_vulns DESC
      LIMIT 10
    `);
    
    console.log('   Top Concepts by Related Vulnerabilities:');
    patterns.records.forEach(record => {
      console.log(`   • ${record.get('concept')}: ${record.get('related_vulns')} vulnerabilities`);
    });

    // 7. Thesis Metrics Summary
    console.log('\n📊 Thesis Metrics Summary:');
    const summary = await session.run(`
      MATCH (n)
      RETURN count(n) as total_nodes
    `);
    
    const totalNodes = summary.records[0].get('total_nodes');
    
    console.log(`   Total Knowledge Graph Nodes: ${totalNodes}`);
    console.log(`   Total Queries Processed: ${totalQueries}`);
    console.log(`   Unique Cybersecurity Concepts: ${uniqueConcepts.length}`);
    console.log(`   Knowledge Growth Rate: ${(uniqueConcepts.length / totalQueries * 100).toFixed(1)}%`);
    
    // 8. Recommendations for Thesis
    console.log('\n💡 Thesis Recommendations:');
    console.log('   • Track concept evolution over time');
    console.log('   • Analyze query complexity patterns');
    console.log('   • Measure knowledge retention and reuse');
    console.log('   • Study relationship formation patterns');
    console.log('   • Evaluate answer quality improvements');
    console.log('   • Monitor system learning efficiency');

  } catch (error) {
    console.error('❌ Error analyzing thesis data:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

analyzeThesisData().catch(console.error); 