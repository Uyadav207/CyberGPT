# Database Management Guide

## Neo4j Database Capacity Issues

Your Neo4j Aura database has reached its 400,000 relationships limit, causing ingestion failures and backend errors. This guide provides solutions to manage and resolve this issue.

## Quick Diagnosis

Run the database status check to see current usage:

```bash
cd backend
bun run db:status
```

This will show:
- Current node and relationship counts
- Usage percentage of the 400,000 limit
- Recommendations based on usage level

## Immediate Solutions

### Option 1: Upgrade Neo4j Tier (Recommended)

1. Go to your Neo4j Aura console
2. Navigate to your database instance
3. Click "Upgrade" to move to Professional or Enterprise tier
4. These tiers offer much higher limits (millions of relationships)

### Option 2: Clean Up Existing Data

Run a dry-run cleanup to see what can be removed:

```bash
cd backend
bun run db:cleanup
```

This will show you what data can be safely removed without affecting functionality.

To perform the actual cleanup:

```bash
cd backend
bun run db:cleanup:live
```

**⚠️ Warning**: This will permanently delete data. Review the dry-run output first.

## What Gets Cleaned Up

The cleanup script removes:

1. **Old CVEs** (older than 1-2 years)
2. **Orphaned Reference nodes** (not linked to any CVE)
3. **Orphaned Component nodes** (not linked to any CVE)
4. **Orphaned Vendor nodes** (not linked to any component)

## Long-term Management

### 1. Implement Data Retention Policies

Add to your application logic:

```typescript
// Example: Only keep CVEs from the last 2 years
const retentionDays = 730;
const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

// When ingesting new CVEs, check if old ones should be removed
```

### 2. Monitor Usage Regularly

Set up a cron job to check database status:

```bash
# Add to your crontab
0 2 * * * cd /path/to/backend && bun run db:status >> /var/log/db-status.log
```

### 3. Implement Smart Ingestion

Modify your CVE ingestion to:
- Skip CVEs older than a certain date
- Prioritize high-severity CVEs
- Implement rate limiting

## Error Handling

The application now includes better error handling for database limit issues:

- **Status 507**: Database limit exceeded
- **Status 503**: Database connection issues
- User-friendly error messages in the chat interface

## Emergency Recovery

If the database becomes completely unusable:

1. **Export critical data** (if possible):
   ```cypher
   MATCH (v:Vulnerability) 
   WHERE v.cvssScore > 7.0 
   RETURN v
   ```

2. **Create a new database** with a higher tier

3. **Re-ingest essential data** only

## Monitoring Commands

```bash
# Check current status
bun run db:status

# See what would be cleaned up
bun run db:cleanup

# Perform cleanup (be careful!)
bun run db:cleanup:live

# Check specific node types
bun run -e "
import driver from './src/config/neo4j';
const session = driver.session();
session.run('MATCH (v:Vulnerability) RETURN count(v)').then(r => {
  console.log('Vulnerabilities:', r.records[0].get('count(v)'));
  session.close();
  driver.close();
});
"
```

## Support

If you continue to experience issues:

1. Check Neo4j Aura documentation for tier limits
2. Consider implementing a hybrid approach (Neo4j + other storage)
3. Contact Neo4j support for guidance on scaling strategies

## Prevention

To prevent future capacity issues:

1. **Set up alerts** when usage reaches 80%
2. **Implement automatic cleanup** of old data
3. **Monitor ingestion rates** and implement throttling
4. **Consider data archiving** strategies for historical data 