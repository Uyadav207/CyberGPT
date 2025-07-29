import neo4j from 'neo4j-driver';

const uri = process.env.NEO4J_URI || "";
const user = process.env.NEO4J_USERNAME || "";
const password = process.env.NEO4J_PASSWORD || "";

// Create driver instance but don't connect immediately
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
  maxConnectionLifetime: 60 * 60 * 1000, // 1 hour
  maxConnectionPoolSize: 2, // Reduced for serverless
  connectionAcquisitionTimeout: 10000, // 10 seconds (reduced)
  connectionTimeout: 10000, // 10 seconds (reduced)
  disableLosslessIntegers: true,
  useBigInt: true,
});

// Connection state tracking
let connectionStatus: 'unknown' | 'connected' | 'failed' = 'unknown';
let lastConnectionCheck = 0;
const CONNECTION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Lazy connection verification
export const verifyConnection = async (): Promise<boolean> => {
  const now = Date.now();
  
  // Skip verification if recently checked
  if (connectionStatus === 'connected' && (now - lastConnectionCheck) < CONNECTION_CHECK_INTERVAL) {
    return true;
  }

  try {
    await driver.verifyConnectivity();
    connectionStatus = 'connected';
    lastConnectionCheck = now;
    console.log('✅ Neo4j connection verified');
    return true;
  } catch (error) {
    connectionStatus = 'failed';
    lastConnectionCheck = now;
    console.error('❌ Neo4j connection failed');
    return false;
  }
};

// Safe driver getter with connection check
export const getDriver = async () => {
  const isConnected = await verifyConnection();
  if (!isConnected) {
    throw new Error('Neo4j connection unavailable');
  }
  return driver;
};

// Graceful shutdown helper
export const closeConnection = async () => {
  try {
    await driver.close();
    console.log('✅ Neo4j connection closed');
  } catch (error) {
    console.error('❌ Error closing Neo4j connection:', error);
  }
};

// Export driver for direct use (use getDriver() for safety)
export { driver };
