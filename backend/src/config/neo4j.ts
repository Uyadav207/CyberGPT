import neo4j from 'neo4j-driver';

const uri = process.env.NEO4J_URI || "";
const user = process.env.NEO4J_USERNAME || "";
const password = process.env.NEO4J_PASSWORD || "";

// Enhanced Neo4j driver configuration with connection pooling and timeout settings
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
  maxConnectionLifetime: 60 * 60 * 1000, // 1 hour
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: 60000, // 60 seconds
  connectionTimeout: 30000, // 30 seconds
  disableLosslessIntegers: true,
  useBigInt: true,
});

// Test connection on startup
driver.verifyConnectivity()
  .then(() => {
    console.log('✅ Neo4j connection verified successfully');
  })
  .catch((error) => {
    console.error('❌ Neo4j connection failed:', error.message);
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Neo4j connection failed in production. Graph features may be limited.');
    }
  });

export { driver };

if(driver) {
    console.log('Neo4j driver initialized successfully.');
    (async () => {
        const serverInfo = await driver.getServerInfo();
        console.log('Connection established');
        console.log(serverInfo);
    })();
}

else {
    console.error('Failed to initialize Neo4j driver.');
}

export default driver;