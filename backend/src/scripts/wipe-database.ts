import driver from '../config/neo4j';

async function wipeDatabase() {
  const session = driver.session();
  try {
    console.log('⚠️  Wiping ALL data from Neo4j in batches...');
    let totalDeleted = 0;
    while (true) {
      const result = await session.run('MATCH (n) WITH n LIMIT 1000 DETACH DELETE n RETURN count(n) as deleted');
      const deleted = result.records[0].get('deleted').toNumber ? result.records[0].get('deleted').toNumber() : result.records[0].get('deleted');
      totalDeleted += deleted;
      console.log(`   Deleted ${deleted} nodes in this batch (Total: ${totalDeleted})`);
      if (deleted === 0) break;
    }
    console.log('✅ All data deleted.');
  } catch (error) {
    console.error('❌ Error wiping database:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

wipeDatabase().catch(console.error); 