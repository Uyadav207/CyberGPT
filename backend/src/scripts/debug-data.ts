import driver from '../config/neo4j';

async function debugData() {
  const session = driver.session();
  
  try {
    console.log('🔍 Debugging database content...\n');

    // Check what vulnerabilities exist
    console.log('📊 Sample Vulnerabilities:');
    const vulns = await session.run('MATCH (v:Vulnerability) RETURN v.cve_id, v.description LIMIT 5');
    vulns.records.forEach(record => {
      console.log(`  ${record.get('v.cve_id')}: ${record.get('v.description')?.substring(0, 100)}...`);
    });

    console.log('\n📊 Sample Components:');
    const components = await session.run('MATCH (c:Component) RETURN c.name, c.cpe LIMIT 5');
    components.records.forEach(record => {
      console.log(`  ${record.get('c.name') || 'N/A'}: ${record.get('c.cpe') || 'N/A'}`);
    });

    console.log('\n📊 Sample Vendors:');
    const vendors = await session.run('MATCH (v:Vendor) RETURN v.name LIMIT 5');
    vendors.records.forEach(record => {
      console.log(`  ${record.get('v.name')}`);
    });

    console.log('\n📊 Sample Severities:');
    const severities = await session.run('MATCH (s:Severity) RETURN s.level');
    severities.records.forEach(record => {
      console.log(`  ${record.get('s.level')}`);
    });

    // Test a simple search query
    console.log('\n🔍 Testing search for "Apache":');
    const apacheSearch = await session.run(`
      MATCH (v:Vulnerability)
      WHERE toLower(v.description) CONTAINS 'apache'
      RETURN v.cve_id, v.description
      LIMIT 3
    `);
    console.log(`Found ${apacheSearch.records.length} Apache-related vulnerabilities`);

    // Test a broader search
    console.log('\n🔍 Testing broader search:');
    const broadSearch = await session.run(`
      MATCH (v:Vulnerability)
      RETURN v.cve_id, v.description
      LIMIT 3
    `);
    console.log(`Found ${broadSearch.records.length} vulnerabilities total`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

debugData().catch(console.error); 