import driver from "../config/neo4j";
import neo4j from "neo4j-driver";

async function emergencyCleanup() {
  const session = driver.session();
  
  try {
    console.log('🚨 Starting emergency database cleanup...\n');
    
    // Get current database stats
    const nodeCountResult = await session.run('MATCH (n) RETURN count(n) as nodeCount');
    const relationshipCountResult = await session.run('MATCH ()-[r]->() RETURN count(r) as relationshipCount');
    
    const nodeCount = Number(nodeCountResult.records[0].get('nodeCount'));
    const relationshipCount = Number(relationshipCountResult.records[0].get('relationshipCount'));
    
    console.log('📊 Current database state:');
    console.log(`   Nodes: ${nodeCount.toLocaleString()}`);
    console.log(`   Relationships: ${relationshipCount.toLocaleString()}`);
    console.log(`   Usage: ${((relationshipCount / 400000) * 100).toFixed(1)}% of limit\n`);
    
    if (relationshipCount < 200000) {
      console.log('✅ Database is in good shape. No cleanup needed.');
      return;
    }
    
    // Remove SIMILAR_SEVERITY relationships (these are often excessive)
    console.log('🧹 Removing SIMILAR_SEVERITY relationships...');
    const similarSeverityResult = await session.run(
      'MATCH ()-[r:SIMILAR_SEVERITY]->() DELETE r RETURN count(r) as deleted'
    );
    const similarSeverityDeleted = Number(similarSeverityResult.records[0].get('deleted'));
    console.log(`   Removed ${similarSeverityDeleted.toLocaleString()} SIMILAR_SEVERITY relationships`);
    
    // Remove duplicate relationships
    console.log('🧹 Removing duplicate relationships...');
    const duplicateResult = await session.run(`
      MATCH (a)-[r1]->(b)
      WITH a, b, collect(r1) as rels
      WHERE size(rels) > 1
      UNWIND tail(rels) as r
      DELETE r
      RETURN count(r) as deleted
    `);
    const duplicateDeleted = Number(duplicateResult.records[0].get('deleted'));
    console.log(`   Removed ${duplicateDeleted.toLocaleString()} duplicate relationships`);
    
    // Remove orphaned nodes
    console.log('🧹 Removing orphaned nodes...');
    const orphanedResult = await session.run(`
      MATCH (n)
      WHERE NOT (n)--()
      DELETE n
      RETURN count(n) as deleted
    `);
    const orphanedDeleted = Number(orphanedResult.records[0].get('deleted'));
    console.log(`   Removed ${orphanedDeleted.toLocaleString()} orphaned nodes`);
    
    // Get final stats
    const finalNodeCountResult = await session.run('MATCH (n) RETURN count(n) as nodeCount');
    const finalRelationshipCountResult = await session.run('MATCH ()-[r]->() RETURN count(r) as relationshipCount');
    
    const finalNodeCount = Number(finalNodeCountResult.records[0].get('nodeCount'));
    const finalRelationshipCount = Number(finalRelationshipCountResult.records[0].get('relationshipCount'));
    
    console.log('\n📊 Final database state:');
    console.log(`   Nodes: ${finalNodeCount.toLocaleString()}`);
    console.log(`   Relationships: ${finalRelationshipCount.toLocaleString()}`);
    console.log(`   Usage: ${((finalRelationshipCount / 400000) * 100).toFixed(1)}% of limit`);
    
    const totalFreed = relationshipCount - finalRelationshipCount;
    console.log(`\n✅ Cleanup complete! Freed up ${totalFreed.toLocaleString()} relationships`);
    
    if (finalRelationshipCount > 300000) {
      console.log('\n⚠️  WARNING: Database still at high capacity');
      console.log('   Consider running this script again or upgrading Neo4j tier');
    } else {
      console.log('\n✅ Database is now in a healthy state for new data ingestion');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

// Run the cleanup
emergencyCleanup().catch(console.error); 