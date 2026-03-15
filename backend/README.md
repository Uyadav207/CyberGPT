# 🔧 CyberGPT Backend

Express.js backend API for the CyberGPT cybersecurity assessment platform.

## 🚀 Technology Stack

- **Bun 1.1+** - JavaScript Runtime & Package Manager
- **Node.js 18+** - Alternative Runtime
- **Express.js 4.x** - Web Framework
- **TypeScript 5.6.2** - Type Safety
- **Prisma** - ORM for PostgreSQL
- **PostgreSQL 14+** - Primary Database
- **Neo4j 5.x** - Graph Database
- **OpenAI GPT-5** - AI Integration
- **Pinecone** - Vector Database
- **JWT** - Authentication

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/                   # Configuration files
│   │   ├── neo4j.ts             # Neo4j connection
│   │   ├── supabase.ts          # Supabase client
│   │   ├── stripe.ts            # Stripe integration
│   │   ├── nodemailer.ts        # Email configuration
│   │   └── convex.ts            # Convex client
│   │
│   ├── controllers/              # Route controllers
│   │   ├── authController.ts    # Authentication
│   │   ├── chatController.ts    # Chat handling
│   │   ├── scanController.ts    # Vulnerability scanning
│   │   ├── dastScanController.ts
│   │   ├── graphController.ts   # Knowledge graphs
│   │   ├── graphRAGController.ts
│   │   ├── ragController.ts     # RAG operations
│   │   ├── summaryController.ts # Report summaries
│   │   ├── userController.ts    # User management
│   │   ├── paymentController.ts # Stripe payments
│   │   └── zapController.ts     # ZAP scanner
│   │
│   ├── middlewares/              # Express middlewares
│   │   ├── authMiddleware.ts    # JWT verification
│   │   └── errorHandler.ts      # Error handling
│   │
│   ├── models/                   # Database models
│   │   └── User.ts
│   │
│   ├── routes/                   # API routes
│   │   ├── authRoutes.ts
│   │   ├── chatRoute.ts
│   │   ├── graphRoutes.ts
│   │   ├── graphRagRoutes.ts
│   │   ├── rag.ts
│   │   ├── reportRoutes.ts
│   │   ├── userRoutes.ts
│   │   ├── paymentRoutes.ts
│   │   ├── dastRoutes.ts
│   │   └── zapRoutes.ts
│   │
│   ├── services/                 # Business logic
│   │   ├── authService.ts       # Auth operations
│   │   ├── chatService.ts       # Chat processing
│   │   ├── openai.ts            # OpenAI integration
│   │   ├── pineconeStore.ts     # Vector storage
│   │   ├── graphGenerationService.ts
│   │   ├── chatGraphIntegrationService.ts
│   │   ├── scanStoreService.ts
│   │   ├── sastScanStoreService.ts
│   │   ├── baselineScanService.ts
│   │   ├── dastScanService.ts
│   │   ├── zapService.ts        # OWASP ZAP
│   │   ├── sonarService.ts      # SonarQube
│   │   ├── summaryService.ts
│   │   ├── userService.ts
│   │   ├── stripeService.ts
│   │   ├── jwtService.ts
│   │   └── CVESyncService.ts
│   │
│   ├── utils/                    # Utility functions
│   │   ├── neo4j-ingest.ts
│   │   ├── neo4j-cve-fetch-ingest.ts
│   │   ├── otpUtils.ts
│   │   ├── passwordUtils.ts
│   │   ├── vulnNameNormalizer.ts
│   │   ├── baselineScanUtils.ts
│   │   └── supabaseUtils/
│   │       ├── avatars.ts
│   │       └── reports.ts
│   │
│   ├── scripts/                  # Utility scripts
│   │   ├── ingest-nvd.ts        # NVD data ingestion
│   │   ├── ingest-cisa.ts       # CISA data ingestion
│   │   └── ingestAll.ts         # Combined ingestion
│   │
│   ├── types/                    # TypeScript types
│   │   ├── cve.ts
│   │   ├── scan.ts
│   │   ├── sastScan.ts
│   │   ├── baselineScan.ts
│   │   ├── message.ts
│   │   ├── zapAlerts.ts
│   │   ├── latestCves.ts
│   │   └── graphVisualization.ts
│   │
│   ├── prisma/                   # Prisma ORM
│   │   ├── schema.prisma        # Database schema
│   │   └── migrations/          # Migration files
│   │
│   ├── data/                     # Static data
│   │   ├── nvd.json
│   │   └── compliance_mapping.json
│   │
│   ├── test/                     # Test files
│   │   └── app.test.ts
│   │
│   ├── app.ts                    # Express app setup
│   └── index.ts                  # Entry point
│
├── convex/                       # Convex backend
│   ├── _generated/              # Generated types
│   ├── chats.ts                 # Chat functions
│   ├── graphVisualizations.ts   # Graph storage
│   ├── reports.ts               # Report storage
│   ├── summaries.ts             # Summary storage
│   ├── todoLists.ts             # Todo storage
│   ├── todoApi.ts               # Todo API
│   ├── scans.ts                 # Scan storage
│   ├── sastScans.ts             # SAST scans
│   ├── vulnerabilities.ts       # Vulnerability data
│   ├── vulnerabilityInfo.ts     # CVE details
│   └── schema.ts                # Convex schema
│
├── package.json                  # Dependencies
├── tsconfig.json                # TypeScript config
├── biome.json                   # Biome linter config
└── NEO4J_TROUBLESHOOTING.md     # Neo4j guide
```

## 🛠️ Development

### Prerequisites

- **Bun** >= 1.1.0 or **Node.js** >= 18.0.0
- **PostgreSQL** >= 14.0
- **Neo4j** >= 5.0
- **Redis** (optional, for caching)

### Installation

```bash
# Install dependencies with Bun
bun install

# Or with npm
npm install
```

### Environment Setup

Create `.env` file:

```env
# Server
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/cybergpt_db"
SHADOW_DATABASE_URL="postgresql://user:password@localhost:5432/cybergpt_shadow"

# Neo4j
NEO4J_URI="bolt://localhost:7687"
NEO4J_USER="neo4j"
NEO4J_PASSWORD="your-password"
NEO4J_DATABASE="neo4j"

# OpenAI
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-5"
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000

# Pinecone
PINECONE_API_KEY="..."
PINECONE_ENVIRONMENT="us-west1-gcp"
PINECONE_INDEX_NAME="cybergpt-embeddings"

# JWT
JWT_SECRET="your-super-secret-key"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_STANDARD="price_..."

# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Email (Nodemailer)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_FROM="CyberGPT <noreply@cybergpt.com>"

# Security Tools
ZAP_API_KEY="..."
ZAP_BASE_URL="http://localhost:8080"
SONAR_HOST_URL="http://localhost:9000"
SONAR_TOKEN="..."

# CVE APIs
NVD_API_KEY="..."
CIRCL_API_URL="https://cve.circl.lu/api"
OSV_API_URL="https://api.osv.dev"

# Redis (Optional)
REDIS_URL="redis://localhost:6379"

# Convex
CONVEX_DEPLOYMENT_URL="https://your-deployment.convex.cloud"
CONVEX_DEPLOY_KEY="..."
```

### Database Setup

```bash
# Generate Prisma client
bunx prisma generate

# Run migrations
bunx prisma migrate dev

# Seed database (optional)
bunx prisma db seed

# Open Prisma Studio
bunx prisma studio
```

### Running the Server

```bash
# Development mode (with hot reload)
bun run dev

# Production mode
bun run build
bun run start

# With Node.js
npm run dev
npm run start
```

Server will run at `http://localhost:8000`

### Available Scripts

```bash
bun run dev          # Start dev server
bun run build        # Build for production
bun run start        # Start prod server
bun run check        # Run Biome checks
bun run check:fix    # Fix Biome issues
bun run test         # Run tests
bunx prisma studio   # Database GUI
```

## 🔌 API Endpoints

### Authentication

```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login user
POST   /api/auth/logout            # Logout user
POST   /api/auth/refresh           # Refresh JWT token
POST   /api/auth/verify-otp        # Verify OTP
POST   /api/auth/forgot-password   # Request password reset
POST   /api/auth/reset-password    # Reset password
GET    /api/auth/profile           # Get user profile
PUT    /api/auth/profile           # Update profile
```

### Chat

```
POST   /api/chat/message           # Send chat message
POST   /api/chat/stream            # Stream AI response
GET    /api/chat/history/:chatId   # Get chat history
GET    /api/chat/all               # Get all user chats
DELETE /api/chat/:chatId           # Delete chat
POST   /api/chat/feedback          # Submit feedback
```

### Vulnerability Scanning

```
POST   /api/scan/url               # Start URL scan
POST   /api/scan/code              # Start code scan
GET    /api/scan/status/:scanId    # Get scan status
GET    /api/scan/results/:scanId   # Get scan results
GET    /api/scan/history           # Get scan history
DELETE /api/scan/:scanId           # Delete scan

# DAST Scanning
POST   /api/dast/scan              # Start DAST scan
GET    /api/dast/results/:scanId   # Get DAST results

# ZAP Scanner
POST   /api/zap/scan               # Start ZAP scan
GET    /api/zap/status/:scanId     # Get ZAP status
```

### Knowledge Graphs

```
POST   /api/graph/generate         # Generate knowledge graph
GET    /api/graph/:messageId       # Get graph by message
GET    /api/graph/visualize/:id    # Get visualization data
POST   /api/graph/query            # Query graph database
DELETE /api/graph/:graphId         # Delete graph

# Graph RAG
POST   /api/graph-rag/query        # Query with RAG
GET    /api/graph-rag/context      # Get context
```

### Reports

```
POST   /api/reports/generate       # Generate report
GET    /api/reports                # List all reports
GET    /api/reports/:reportId      # Get specific report
POST   /api/reports/export         # Export to PDF
DELETE /api/reports/:reportId      # Delete report
```

### CVE Database

```
GET    /api/cve/search             # Search CVEs
GET    /api/cve/:cveId             # Get CVE details
GET    /api/cve/latest             # Get latest CVEs
POST   /api/cve/sync               # Sync CVE database
```

### User Management

```
GET    /api/users/profile          # Get user profile
PUT    /api/users/profile          # Update profile
GET    /api/users/stats            # Get user statistics
PUT    /api/users/subscription     # Update subscription
```

### Payments

```
POST   /api/payment/create-intent  # Create payment intent
POST   /api/payment/webhook        # Stripe webhook
GET    /api/payment/history        # Payment history
POST   /api/payment/cancel         # Cancel subscription
```

## 🔐 Security

### Authentication Middleware

```typescript
// src/middlewares/authMiddleware.ts
export const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
});

app.use('/api/', limiter);
```

### Input Validation

```typescript
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});
```

## 💾 Database

### Prisma Schema

```prisma
// src/prisma/schema.prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  password      String
  name          String?
  role          String   @default("user")
  subscription  String   @default("free")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Scan {
  id          String   @id @default(uuid())
  userId      String
  url         String
  type        String
  status      String
  results     Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Neo4j Queries

```typescript
// Example: Search for CVEs related to a vulnerability
const query = `
  MATCH (v:Vulnerability)-[:HAS_CVE]->(c:CVE)
  WHERE v.name CONTAINS $searchTerm
  RETURN v, c
  LIMIT 10
`;

const result = await session.run(query, { searchTerm });
```

## 🤖 AI Services

### OpenAI Integration

```typescript
// src/services/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const getChatCompletion = async (messages) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-5',
    messages,
    temperature: 0.7,
    stream: true,
  });

  return response;
};
```

### Vector Search (Pinecone)

```typescript
// src/services/pineconeStore.ts
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export const semanticSearch = async (query, topK = 5) => {
  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
  const embedding = await getEmbedding(query);
  
  const results = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });

  return results.matches;
};
```

## 🧪 Testing

### Unit Tests

```typescript
// src/test/auth.test.ts
import { describe, test, expect } from 'bun:test';
import { hashPassword, comparePassword } from '../utils/passwordUtils';

describe('Password Utils', () => {
  test('should hash password', async () => {
    const password = 'Test123!';
    const hashed = await hashPassword(password);
    expect(hashed).not.toBe(password);
  });

  test('should compare passwords', async () => {
    const password = 'Test123!';
    const hashed = await hashPassword(password);
    const isValid = await comparePassword(password, hashed);
    expect(isValid).toBe(true);
  });
});
```

### Integration Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/test/auth.test.ts

# Run with coverage
bun test --coverage
```

## 🚢 Deployment

### Docker

```bash
# Build image
docker build -f backend.Dockerfile -t cybergpt-backend .

# Run container
docker run -p 8000:8000 --env-file .env cybergpt-backend
```

### Production Checklist

- [ ] Set NODE_ENV=production
- [ ] Use production database
- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Configure CORS properly
- [ ] Enable security headers
- [ ] Set up logging (Winston/Pino)
- [ ] Configure monitoring (Sentry)
- [ ] Set up backup strategy
- [ ] Document API changes

## 📊 Monitoring

### Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### Health Check

```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});
```

## 🐛 Troubleshooting

### Common Issues

**Neo4j Connection Failed**
```bash
# Check if Neo4j is running
docker ps | grep neo4j

# Restart Neo4j
docker restart neo4j

# Check logs
docker logs neo4j
```

**Prisma Migration Issues**
```bash
# Reset database (development only!)
bunx prisma migrate reset

# Create new migration
bunx prisma migrate dev --name migration_name
```

**OpenAI Rate Limits**
- Implement request queuing
- Add exponential backoff
- Use caching for common queries

## 📚 Resources

- [Express.js Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Neo4j Documentation](https://neo4j.com/docs/)
- [OpenAI API Reference](https://platform.openai.com/docs/)
- [Bun Documentation](https://bun.sh/docs)

## 🤝 Contributing

See main [CONTRIBUTING.md](../CONTRIBUTING.md)

### Backend-Specific Guidelines

- Use TypeScript for all new code
- Follow RESTful API conventions
- Add proper error handling
- Write comprehensive tests
- Document API changes
- Use dependency injection
- Follow SOLID principles

## 📄 License

MIT License - see [LICENSE](../LICENSE)

---

**Built with ❤️ using Express.js & TypeScript**
