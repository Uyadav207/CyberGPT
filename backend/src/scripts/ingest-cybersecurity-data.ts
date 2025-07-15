import driver from '../config/neo4j';
import neo4j from 'neo4j-driver';

async function ingestCybersecurityData() {
  const session = driver.session();
  
  try {
    console.log('🔒 Ingesting comprehensive cybersecurity data...\n');

    // 1. Create Vulnerability nodes with detailed information
    console.log('📊 Creating Vulnerability nodes...');
    const vulnerabilities = [
      {
        cve_id: 'CVE-2024-0001',
        title: 'SQL Injection Vulnerability',
        description: 'SQL injection allows attackers to execute malicious SQL statements',
        severity: 'HIGH',
        cvss_score: 8.5,
        attack_vector: 'NETWORK',
        complexity: 'LOW',
        privileges_required: 'NONE',
        user_interaction: 'NONE',
        scope: 'CHANGED',
        confidentiality_impact: 'HIGH',
        integrity_impact: 'HIGH',
        availability_impact: 'HIGH'
      },
      {
        cve_id: 'CVE-2024-0002',
        title: 'Cross-Site Scripting (XSS)',
        description: 'XSS allows attackers to inject malicious scripts into web pages',
        severity: 'MEDIUM',
        cvss_score: 6.1,
        attack_vector: 'NETWORK',
        complexity: 'LOW',
        privileges_required: 'NONE',
        user_interaction: 'REQUIRED',
        scope: 'CHANGED',
        confidentiality_impact: 'LOW',
        integrity_impact: 'LOW',
        availability_impact: 'NONE'
      },
      {
        cve_id: 'CVE-2024-0003',
        title: 'Buffer Overflow',
        description: 'Buffer overflow occurs when data exceeds buffer boundaries',
        severity: 'CRITICAL',
        cvss_score: 9.8,
        attack_vector: 'NETWORK',
        complexity: 'LOW',
        privileges_required: 'NONE',
        user_interaction: 'NONE',
        scope: 'CHANGED',
        confidentiality_impact: 'HIGH',
        integrity_impact: 'HIGH',
        availability_impact: 'HIGH'
      },
      {
        cve_id: 'CVE-2024-0004',
        title: 'Privilege Escalation',
        description: 'Attackers gain elevated privileges beyond intended access',
        severity: 'HIGH',
        cvss_score: 7.8,
        attack_vector: 'LOCAL',
        complexity: 'LOW',
        privileges_required: 'LOW',
        user_interaction: 'NONE',
        scope: 'UNCHANGED',
        confidentiality_impact: 'HIGH',
        integrity_impact: 'HIGH',
        availability_impact: 'HIGH'
      },
      {
        cve_id: 'CVE-2024-0005',
        title: 'Denial of Service (DoS)',
        description: 'Attackers prevent legitimate users from accessing services',
        severity: 'MEDIUM',
        cvss_score: 5.3,
        attack_vector: 'NETWORK',
        complexity: 'LOW',
        privileges_required: 'NONE',
        user_interaction: 'NONE',
        scope: 'CHANGED',
        confidentiality_impact: 'NONE',
        integrity_impact: 'NONE',
        availability_impact: 'LOW'
      }
    ];

    for (const vuln of vulnerabilities) {
      await session.run(`
        CREATE (v:Vulnerability {
          cve_id: $cve_id,
          title: $title,
          description: $description,
          severity: $severity,
          cvss_score: $cvss_score,
          attack_vector: $attack_vector,
          complexity: $complexity,
          privileges_required: $privileges_required,
          user_interaction: $user_interaction,
          scope: $scope,
          confidentiality_impact: $confidentiality_impact,
          integrity_impact: $integrity_impact,
          availability_impact: $availability_impact,
          created_at: datetime(),
          updated_at: datetime()
        })
      `, vuln);
    }

    // 2. Create Attack Pattern nodes
    console.log('🎯 Creating Attack Pattern nodes...');
    const attackPatterns = [
      {
        name: 'SQL Injection',
        description: 'Injection of malicious SQL code into database queries',
        mitre_id: 'T1190',
        category: 'INITIAL_ACCESS',
        techniques: ['SQL Injection', 'NoSQL Injection', 'ORM Injection']
      },
      {
        name: 'Cross-Site Scripting',
        description: 'Injection of malicious scripts into web applications',
        mitre_id: 'T1059.005',
        category: 'EXECUTION',
        techniques: ['Reflected XSS', 'Stored XSS', 'DOM-based XSS']
      },
      {
        name: 'Buffer Overflow',
        description: 'Exploitation of memory buffer boundaries',
        mitre_id: 'T1206',
        category: 'EXECUTION',
        techniques: ['Stack Overflow', 'Heap Overflow', 'Integer Overflow']
      },
      {
        name: 'Privilege Escalation',
        description: 'Gaining elevated system privileges',
        mitre_id: 'T1068',
        category: 'PRIVILEGE_ESCALATION',
        techniques: ['Horizontal Escalation', 'Vertical Escalation']
      },
      {
        name: 'Denial of Service',
        description: 'Disrupting service availability',
        mitre_id: 'T1499',
        category: 'IMPACT',
        techniques: ['Flood Attack', 'Resource Exhaustion', 'Logic Bomb']
      }
    ];

    for (const pattern of attackPatterns) {
      await session.run(`
        CREATE (ap:AttackPattern {
          name: $name,
          description: $description,
          mitre_id: $mitre_id,
          category: $category,
          techniques: $techniques,
          created_at: datetime()
        })
      `, pattern);
    }

    // 3. Create Security Concept nodes
    console.log('🔐 Creating Security Concept nodes...');
    const securityConcepts = [
      {
        name: 'Authentication',
        description: 'Verification of user identity',
        category: 'ACCESS_CONTROL',
        examples: ['Password', 'Multi-factor Authentication', 'Biometrics']
      },
      {
        name: 'Authorization',
        description: 'Determining user permissions and access rights',
        category: 'ACCESS_CONTROL',
        examples: ['Role-based Access Control', 'Attribute-based Access Control']
      },
      {
        name: 'Encryption',
        description: 'Converting data into unreadable format',
        category: 'DATA_PROTECTION',
        examples: ['AES', 'RSA', 'Symmetric Encryption', 'Asymmetric Encryption']
      },
      {
        name: 'Firewall',
        description: 'Network security device monitoring traffic',
        category: 'NETWORK_SECURITY',
        examples: ['Packet Filtering', 'Stateful Inspection', 'Next-Gen Firewall']
      },
      {
        name: 'Intrusion Detection',
        description: 'Monitoring for suspicious activities',
        category: 'MONITORING',
        examples: ['IDS', 'IPS', 'SIEM', 'Behavioral Analysis']
      }
    ];

    for (const concept of securityConcepts) {
      await session.run(`
        CREATE (sc:SecurityConcept {
          name: $name,
          description: $description,
          category: $category,
          examples: $examples,
          created_at: datetime()
        })
      `, concept);
    }

    // 4. Create relationships between nodes
    console.log('🔗 Creating relationships...');
    
    // Vulnerability -> Attack Pattern relationships
    await session.run(`
      MATCH (v:Vulnerability {cve_id: 'CVE-2024-0001'})
      MATCH (ap:AttackPattern {name: 'SQL Injection'})
      CREATE (v)-[:EXPLOITED_BY]->(ap)
    `);

    await session.run(`
      MATCH (v:Vulnerability {cve_id: 'CVE-2024-0002'})
      MATCH (ap:AttackPattern {name: 'Cross-Site Scripting'})
      CREATE (v)-[:EXPLOITED_BY]->(ap)
    `);

    await session.run(`
      MATCH (v:Vulnerability {cve_id: 'CVE-2024-0003'})
      MATCH (ap:AttackPattern {name: 'Buffer Overflow'})
      CREATE (v)-[:EXPLOITED_BY]->(ap)
    `);

    await session.run(`
      MATCH (v:Vulnerability {cve_id: 'CVE-2024-0004'})
      MATCH (ap:AttackPattern {name: 'Privilege Escalation'})
      CREATE (v)-[:EXPLOITED_BY]->(ap)
    `);

    await session.run(`
      MATCH (v:Vulnerability {cve_id: 'CVE-2024-0005'})
      MATCH (ap:AttackPattern {name: 'Denial of Service'})
      CREATE (v)-[:EXPLOITED_BY]->(ap)
    `);

    // Attack Pattern -> Security Concept relationships (mitigation)
    await session.run(`
      MATCH (ap:AttackPattern {name: 'SQL Injection'})
      MATCH (sc:SecurityConcept {name: 'Input Validation'})
      CREATE (sc)-[:MITIGATES]->(ap)
    `);

    await session.run(`
      MATCH (ap:AttackPattern {name: 'Cross-Site Scripting'})
      MATCH (sc:SecurityConcept {name: 'Output Encoding'})
      CREATE (sc)-[:MITIGATES]->(ap)
    `);

    // Similar severity relationships between vulnerabilities
    await session.run(`
      MATCH (v1:Vulnerability {severity: 'HIGH'})
      MATCH (v2:Vulnerability {severity: 'HIGH'})
      WHERE v1.cve_id <> v2.cve_id
      CREATE (v1)-[:SIMILAR_SEVERITY {score: 0.8}]->(v2)
    `);

    await session.run(`
      MATCH (v1:Vulnerability {severity: 'MEDIUM'})
      MATCH (v2:Vulnerability {severity: 'MEDIUM'})
      WHERE v1.cve_id <> v2.cve_id
      CREATE (v1)-[:SIMILAR_SEVERITY {score: 0.7}]->(v2)
    `);

    // Get final counts
    const nodeCount = await session.run('MATCH (n) RETURN count(n) as count');
    const relationshipCount = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
    
    console.log('\n✅ Cybersecurity data ingestion complete!');
    console.log(`📊 Final database state:`);
    console.log(`   Nodes: ${nodeCount.records[0].get('count').toNumber().toLocaleString()}`);
    console.log(`   Relationships: ${relationshipCount.records[0].get('count').toNumber().toLocaleString()}`);
    console.log('\n🔒 Your cybersecurity knowledge graph is now ready!');
    console.log('   All cybersecurity questions should now have comprehensive answers.');

  } catch (error) {
    console.error('❌ Error during ingestion:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

ingestCybersecurityData().catch(console.error); 