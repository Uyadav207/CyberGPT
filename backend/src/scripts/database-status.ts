import driver from "../config/neo4j";

async function checkDatabaseStatus() {
  const session = driver.session();
  
  try {
    console.log("🔍 Checking Neo4j database status...\n");
    
    // Get node counts by label
    const nodeCounts = await session.run(`
      CALL db.labels() YIELD label
      CALL apoc.cypher.run('MATCH (n:' + label + ') RETURN count(n) as count', {})
      YIELD value
      RETURN label, value.count as count
      ORDER BY count DESC
    `);
    
    console.log("📊 Node counts by label:");
    nodeCounts.records.forEach(record => {
      console.log(`  ${record.get('label')}: ${record.get('count').toLocaleString()}`);
    });
    
    // Get relationship counts by type
    const relationshipCounts = await session.run(`
      CALL db.relationshipTypes() YIELD relationshipType
      CALL apoc.cypher.run('MATCH ()-[r:' + relationshipType + ']->() RETURN count(r) as count', {})
      YIELD value
      RETURN relationshipType, value.count as count
      ORDER BY count DESC
    `);
    
    console.log("\n🔗 Relationship counts by type:");
    relationshipCounts.records.forEach(record => {
      console.log(`  ${record.get('relationshipType')}: ${record.get('count').toLocaleString()}`);
    });
    
    // Get total counts
    const nodeCount = await session.run(`MATCH (n) RETURN count(n) as totalNodes`);
    const relationshipCount = await session.run(`MATCH ()-[r]->() RETURN count(r) as totalRelationships`);
    
    const totalNodes = Number(nodeCount.records[0].get('totalNodes'));
    const totalRelationships = Number(relationshipCount.records[0].get('totalRelationships'));
    
    console.log(`\n📈 Total counts:`);
    console.log(`  Nodes: ${totalNodes.toLocaleString()}`);
    console.log(`  Relationships: ${totalRelationships.toLocaleString()}`);
    
    // Check if we're near the limit
    const limit = 400000;
    const usagePercentage = (totalRelationships / limit) * 100;
    
    console.log(`\n⚠️  Database usage:`);
    console.log(`  ${usagePercentage.toFixed(1)}% of ${limit.toLocaleString()} relationship limit`);
    
    if (usagePercentage >= 90) {
      console.log(`\n🚨 CRITICAL: Database is at ${usagePercentage.toFixed(1)}% capacity!`);
      console.log("   Immediate action required:");
      console.log("   1. Upgrade your Neo4j tier");
      console.log("   2. Clean up old data");
      console.log("   3. Archive non-essential relationships");
    } else if (usagePercentage >= 75) {
      console.log(`\n⚠️  WARNING: Database is at ${usagePercentage.toFixed(1)}% capacity`);
      console.log("   Consider upgrading soon to avoid issues");
    } else {
      console.log(`\n✅ Database usage is healthy (${usagePercentage.toFixed(1)}%)`);
    }
    
    // Get some sample data for cleanup recommendations
    const sampleData = await session.run(`
      MATCH (v:Vulnerability)
      RETURN v.cve_id as cve_id, v.first_seen as first_seen, v.last_updated as last_updated
      ORDER BY v.first_seen ASC
      LIMIT 5
    `);
    
    console.log(`\n📅 Oldest CVEs (potential cleanup candidates):`);
    sampleData.records.forEach(record => {
      const cveId = record.get('cve_id');
      const firstSeen = record.get('first_seen');
      const lastUpdated = record.get('last_updated');
      console.log(`  ${cveId}: First seen ${firstSeen}, Last updated ${lastUpdated}`);
    });
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (usagePercentage >= 90) {
      console.log("   🚨 IMMEDIATE ACTIONS:");
      console.log("   1. Upgrade Neo4j Aura tier to Professional or Enterprise");
      console.log("   2. Delete old CVE data (older than 2 years)");
      console.log("   3. Archive Reference nodes with low relevance");
      console.log("   4. Consider data partitioning strategies");
    } else if (usagePercentage >= 75) {
      console.log("   ⚠️  PLANNED ACTIONS:");
      console.log("   1. Plan for Neo4j tier upgrade");
      console.log("   2. Implement data retention policies");
      console.log("   3. Monitor growth rate");
    } else {
      console.log("   ✅ MAINTENANCE:");
      console.log("   1. Monitor usage trends");
      console.log("   2. Implement data retention policies");
      console.log("   3. Regular cleanup of old data");
    }
    
  } catch (error) {
    console.error("❌ Error checking database status:", error);
  } finally {
    await session.close();
    await driver.close();
  }
}

// Run the check
checkDatabaseStatus().catch(console.error); 