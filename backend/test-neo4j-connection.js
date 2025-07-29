const { driver, verifyConnection, getConnectionHealth } = require('./src/config/neo4j');

async function testNeo4jConnection() {
  console.log('🔍 Testing Neo4j connection...');
  
  try {
    // Test basic connectivity
    console.log('1. Testing basic connectivity...');
    const isConnected = await verifyConnection();
    console.log('✅ Connectivity test:', isConnected ? 'PASSED' : 'FAILED');
    
    if (!isConnected) {
      console.log('❌ Connection failed. Check your Neo4j credentials and network.');
      return;
    }
    
    // Test session creation
    console.log('2. Testing session creation...');
    const session = driver.session();
    try {
      const result = await session.run('RETURN 1 as test');
      console.log('✅ Session test:', result.records[0].get('test') === 1 ? 'PASSED' : 'FAILED');
    } finally {
      await session.close();
    }
    
    // Test a simple query
    console.log('3. Testing simple query...');
    const session2 = driver.session();
    try {
      const result = await session2.run('MATCH (n) RETURN count(n) as count');
      const count = result.records[0].get('count');
      console.log('✅ Query test: PASSED (found', count, 'nodes)');
    } finally {
      await session2.close();
    }
    
    // Get connection health
    console.log('4. Connection health:');
    const health = getConnectionHealth();
    console.log(JSON.stringify(health, null, 2));
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await driver.close();
  }
}

// Run the test
testNeo4jConnection(); 