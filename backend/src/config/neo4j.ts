import neo4j from 'neo4j-driver';

const uri = process.env.NEO4J_URI || "";
const user = process.env.NEO4J_USERNAME || "";
const password = process.env.NEO4J_PASSWORD || "";

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

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