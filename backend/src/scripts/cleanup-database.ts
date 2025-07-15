import driver from "../config/neo4j";

interface CleanupOptions {
  dryRun?: boolean;
  olderThanDays?: number;
  maxRelationships?: number;
  deleteReferences?: boolean;
  deleteOldCVEs?: boolean;
}

async function cleanupDatabase(options: CleanupOptions = {}) {
  const {
    dryRun = true,
    olderThanDays = 730, // 2 years
    maxRelationships = 350000, // Target to stay under 400k
    deleteReferences = false,
    deleteOldCVEs = false
  } = options;

  const session = driver.session();
  
  try {
    console.log("🧹 Starting database cleanup...\n");
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be made)'}\n`);
    
    // Get current counts
    const currentCounts = await session.run(`
      MATCH (n) RETURN count(n) as totalNodes
      UNION
      MATCH ()-[r]->() RETURN count(r) as totalRelationships
    `);
    
    const currentNodes = currentCounts.records[0].get('totalNodes');
    const currentRelationships = currentCounts.records[1].get('totalRelationships');
    
    console.log(`📊 Current database state:`);
    console.log(`  Nodes: ${currentNodes.toLocaleString()}`);
    console.log(`  Relationships: ${currentRelationships.toLocaleString()}`);
    console.log(`  Usage: ${((currentRelationships / 400000) * 100).toFixed(1)}% of limit\n`);
    
    let totalDeletedRelationships = 0;
    let totalDeletedNodes = 0;
    
    // 1. Clean up old CVEs (older than specified days)
    if (deleteOldCVEs) {
      console.log("🗑️  Cleaning up old CVEs...");
      
      const oldCVEsQuery = `
        MATCH (v:Vulnerability)
        WHERE v.first_seen < datetime() - duration({days: $olderThanDays})
        RETURN v.cve_id as cve_id, v.first_seen as first_seen
        ORDER BY v.first_seen ASC
        LIMIT 1000
      `;
      
      const oldCVEs = await session.run(oldCVEsQuery, { olderThanDays });
      
      if (oldCVEs.records.length > 0) {
        console.log(`  Found ${oldCVEs.records.length} old CVEs to clean up`);
        
        for (const record of oldCVEs.records) {
          const cveId = record.get('cve_id');
          const firstSeen = record.get('first_seen');
          
          if (!dryRun) {
            // Delete the CVE and all its relationships
            const deleteResult = await session.run(`
              MATCH (v:Vulnerability {cve_id: $cveId})
              OPTIONAL MATCH (v)-[r]-()
              DELETE r, v
              RETURN count(r) as deletedRelationships
            `, { cveId });
            
            const deletedRels = deleteResult.records[0].get('deletedRelationships');
            totalDeletedRelationships += deletedRels;
            totalDeletedNodes += 1;
            
            console.log(`    Deleted ${cveId} (${deletedRels} relationships)`);
          } else {
            console.log(`    Would delete ${cveId} (first seen: ${firstSeen})`);
          }
        }
      } else {
        console.log("  No old CVEs found to clean up");
      }
    }
    
    // 2. Clean up orphaned Reference nodes
    if (deleteReferences) {
      console.log("\n🗑️  Cleaning up orphaned Reference nodes...");
      
      const orphanedRefsQuery = `
        MATCH (r:Reference)
        WHERE NOT (r)<-[:HAS_REFERENCE]-()
        RETURN r.url as url
        LIMIT 1000
      `;
      
      const orphanedRefs = await session.run(orphanedRefsQuery);
      
      if (orphanedRefs.records.length > 0) {
        console.log(`  Found ${orphanedRefs.records.length} orphaned Reference nodes`);
        
        if (!dryRun) {
          const deleteResult = await session.run(`
            MATCH (r:Reference)
            WHERE NOT (r)<-[:HAS_REFERENCE]-()
            DELETE r
            RETURN count(r) as deletedNodes
          `);
          
          const deletedNodes = deleteResult.records[0].get('deletedNodes');
          totalDeletedNodes += deletedNodes;
          console.log(`    Deleted ${deletedNodes} orphaned Reference nodes`);
        } else {
          orphanedRefs.records.forEach(record => {
            console.log(`    Would delete orphaned reference: ${record.get('url')}`);
          });
        }
      } else {
        console.log("  No orphaned Reference nodes found");
      }
    }
    
    // 3. Clean up orphaned Component nodes
    console.log("\n🗑️  Cleaning up orphaned Component nodes...");
    
    const orphanedComponentsQuery = `
      MATCH (c:Component)
      WHERE NOT (c)<-[:AFFECTS_COMPONENT]-()
      RETURN c.cpe as cpe
      LIMIT 1000
    `;
    
    const orphanedComponents = await session.run(orphanedComponentsQuery);
    
    if (orphanedComponents.records.length > 0) {
      console.log(`  Found ${orphanedComponents.records.length} orphaned Component nodes`);
      
      if (!dryRun) {
        const deleteResult = await session.run(`
          MATCH (c:Component)
          WHERE NOT (c)<-[:AFFECTS_COMPONENT]-()
          OPTIONAL MATCH (c)-[r]-()
          DELETE r, c
          RETURN count(c) as deletedNodes, count(r) as deletedRelationships
        `);
        
        const deletedNodes = deleteResult.records[0].get('deletedNodes');
        const deletedRels = deleteResult.records[0].get('deletedRelationships');
        totalDeletedNodes += deletedNodes;
        totalDeletedRelationships += deletedRels;
        console.log(`    Deleted ${deletedNodes} orphaned Component nodes (${deletedRels} relationships)`);
      } else {
        orphanedComponents.records.forEach(record => {
          console.log(`    Would delete orphaned component: ${record.get('cpe')}`);
        });
      }
    } else {
      console.log("  No orphaned Component nodes found");
    }
    
    // 4. Clean up orphaned Vendor nodes
    console.log("\n🗑️  Cleaning up orphaned Vendor nodes...");
    
    const orphanedVendorsQuery = `
      MATCH (v:Vendor)
      WHERE NOT (v)<-[:FROM_VENDOR]-()
      RETURN v.name as name
      LIMIT 1000
    `;
    
    const orphanedVendors = await session.run(orphanedVendorsQuery);
    
    if (orphanedVendors.records.length > 0) {
      console.log(`  Found ${orphanedVendors.records.length} orphaned Vendor nodes`);
      
      if (!dryRun) {
        const deleteResult = await session.run(`
          MATCH (v:Vendor)
          WHERE NOT (v)<-[:FROM_VENDOR]-()
          DELETE v
          RETURN count(v) as deletedNodes
        `);
        
        const deletedNodes = deleteResult.records[0].get('deletedNodes');
        totalDeletedNodes += deletedNodes;
        console.log(`    Deleted ${deletedNodes} orphaned Vendor nodes`);
      } else {
        orphanedVendors.records.forEach(record => {
          console.log(`    Would delete orphaned vendor: ${record.get('name')}`);
        });
      }
    } else {
      console.log("  No orphaned Vendor nodes found");
    }
    
    // Summary
    console.log("\n📊 Cleanup Summary:");
    console.log(`  Nodes to be deleted: ${totalDeletedNodes.toLocaleString()}`);
    console.log(`  Relationships to be deleted: ${totalDeletedRelationships.toLocaleString()}`);
    
    if (!dryRun) {
      const newRelationships = currentRelationships - totalDeletedRelationships;
      const newUsage = ((newRelationships / 400000) * 100).toFixed(1);
      console.log(`\n✅ After cleanup:`);
      console.log(`  New relationship count: ${newRelationships.toLocaleString()}`);
      console.log(`  New usage: ${newUsage}% of limit`);
      
      if (newRelationships < maxRelationships) {
        console.log(`\n🎉 Success! Database is now under the target limit of ${maxRelationships.toLocaleString()}`);
      } else {
        console.log(`\n⚠️  Warning: Still above target limit. Consider additional cleanup or upgrade.`);
      }
    } else {
      console.log("\n💡 To perform actual cleanup, run with dryRun: false");
    }
    
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await session.close();
    await driver.close();
  }
}

// Example usage:
// cleanupDatabase({ dryRun: true, deleteOldCVEs: true, deleteReferences: true });
// cleanupDatabase({ dryRun: false, deleteOldCVEs: true, deleteReferences: true });

// For immediate cleanup to get under limit:
cleanupDatabase({ 
  dryRun: true, // Set to false to actually perform cleanup
  deleteOldCVEs: true,
  deleteReferences: true,
  olderThanDays: 365 // 1 year
}); 