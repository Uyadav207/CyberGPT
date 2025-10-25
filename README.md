# 🛡️ DenkMinds - AI-Powered Cybersecurity Assessment Platform

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue.svg)

**A comprehensive cybersecurity platform combining AI-powered chat assistance with advanced vulnerability scanning, knowledge graph visualization, and interactive security analysis tools.**

[Features](#-key-features) • [Architecture](#️-architecture-overview) • [Installation](#-quick-start) • [Documentation](#-api-documentation) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture Overview](#️-architecture-overview)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Development](#️-development)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

DenkMinds is an enterprise-grade cybersecurity assessment platform that leverages artificial intelligence to provide comprehensive security analysis, vulnerability detection, and actionable insights. Built with modern web technologies and integrated with industry-leading security tools, DenkMinds helps security professionals, developers, and organizations identify and mitigate security risks efficiently.

### 🎯 **Mission**
To democratize cybersecurity by making advanced security assessment tools accessible, intelligent, and actionable through AI-powered automation.

---

## ✨ Key Features

### 🤖 **MIRA - AI Security Assistant**

<details open>
<summary><b>Intelligent Conversational Interface</b></summary>

- **Multi-Personality AI Modes**
  - 👨‍🏫 **Tutor Mode**: Educational responses with detailed explanations
  - 🔍 **Investigator Mode**: Deep-dive analysis with evidence-based reasoning
  - 📊 **Analyst Mode**: Technical security analysis with actionable recommendations

- **Advanced AI Capabilities**
  - Real-time reasoning with step-by-step thought process visualization
  - Context-aware responses leveraging knowledge graphs
  - Streaming responses for immediate feedback
  - Human-in-the-loop approval for critical actions
  - Multi-turn conversation memory and context retention

- **Intelligent Features**
  - CVE database integration with real-time lookups
  - Jargon explanation with security terminology tooltips
  - Source link management with automatic reference tracking
  - Todo list generation from security recommendations
  - File upload support (code, logs, reports)

</details>

### 🔍 **Vulnerability Scanning & Analysis**

<details>
<summary><b>Comprehensive Security Assessment Tools</b></summary>

#### **DAST (Dynamic Application Security Testing)**
- Automated web application vulnerability scanning
- OWASP ZAP integration for industry-standard testing
- Active and passive scan modes
- Real-time vulnerability detection
- Comprehensive scan reports with severity ratings

#### **SAST (Static Application Security Testing)**
- Source code security analysis
- SonarQube integration for code quality checks
- Support for multiple programming languages
- Security hotspot identification
- Code smell and bug detection

#### **Baseline Security Scanning**
- Automated security baseline assessments
- Configuration vulnerability detection
- Compliance checking against security standards
- Best practice recommendations

#### **CVE Database Integration**
- Real-time vulnerability database access
- NVD (National Vulnerability Database) integration
- CIRCL CVE Search API integration
- OSV (Open Source Vulnerabilities) database
- Automated CVE enrichment and correlation

</details>

### 📊 **Knowledge Graph Visualization**

<details>
<summary><b>Interactive Security Relationship Mapping</b></summary>

- **Dynamic Graph Generation**
  - Real-time knowledge graph creation from chat conversations
  - Automatic entity extraction (vulnerabilities, mitigations, CVEs)
  - Relationship mapping between security concepts
  - Interactive D3.js-powered visualizations

- **Graph Features**
  - Multiple node types (vulnerability, mitigation, source, CVE, problem, affected, risk)
  - Relationship types (mitigates, affects, references, causes, relates_to)
  - Zoom, pan, and drag interactions
  - Node and link detail panels
  - Severity-based color coding
  - Responsive design for mobile and desktop

- **Knowledge Graph Database**
  - Neo4j graph database integration
  - Semantic relationship storage
  - Complex cypher query support
  - Graph analytics and traversal

</details>

### 📑 **Report Generation & Management**

<details>
<summary><b>Professional Security Reports</b></summary>

- **Comprehensive Report Types**
  - Vulnerability assessment reports
  - Scan result summaries
  - Executive summaries with risk ratings
  - Technical deep-dive reports
  - Compliance audit reports

- **Export Formats**
  - PDF generation with professional templates
  - HTML reports with interactive elements
  - JSON/CSV data exports
  - Customizable report templates

- **Report Features**
  - Automated report generation from scan results
  - Interactive todo lists with completion tracking
  - Source link embedding
  - Code snippet highlighting
  - Chart and graph visualizations
  - Supabase integration for cloud storage

</details>

### 🎯 **Interactive Task Management**

<details>
<summary><b>Security Action Tracking</b></summary>

- Drag-and-drop todo list interface
- Task prioritization with severity levels
- Status tracking (Pending, In Progress, Completed)
- Real-time synchronization with Convex
- Integration with scan results
- Export to various formats
- Collaborative task assignment

</details>

### 🔐 **Security & Authentication**

<details>
<summary><b>Enterprise-Grade Security</b></summary>

- **Authentication**
  - JWT-based authentication
  - OTP email verification
  - Password hashing with bcrypt
  - Session management
  - Password reset functionality

- **Authorization**
  - Role-based access control (RBAC)
  - Protected API routes
  - Resource-level permissions
  - Secure token refresh

- **Data Security**
  - Encrypted data transmission (HTTPS)
  - Environment variable protection
  - SQL injection prevention
  - XSS protection
  - CSRF token implementation

</details>

### 💳 **Subscription & Payment**

<details>
<summary><b>Flexible Pricing Plans</b></summary>

- **Free Trial**
  - 3 URL scans
  - Passive scanning
  - Limited code analysis
  - Full chat functionality

- **Standard Plan (€9.99/month)**
  - Unlimited URL scans
  - Active and passive scanning
  - Unlimited code analysis
  - Agentic AI for CVE analysis
  - AI-powered latest CVE updates
  - Priority support

- **Payment Integration**
  - Stripe payment processing
  - Secure checkout flow
  - Subscription management
  - Invoice generation
  - Payment history tracking

</details>

---

## 🏗️ Architecture Overview

### **System Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    React + TypeScript Frontend                    │   │
│  │  • Vite Build System    • Tailwind CSS    • Framer Motion       │   │
│  │  • React Router         • Zustand State   • Radix UI Components │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↕
┌─────────────────────────────────────────────────────────────────────────┐
│                       API GATEWAY / BACKEND                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              Express.js REST API (Node.js/Bun)                   │   │
│  │  • JWT Authentication   • Rate Limiting    • Error Handling      │   │
│  │  • File Upload          • CORS             • Request Validation  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↕
┌─────────────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │
│  │   Chat       │  │  Scanning    │  │  Knowledge   │  │  Report  │   │
│  │  Service     │  │  Services    │  │    Graph     │  │ Service  │   │
│  │              │  │              │  │   Service    │  │          │   │
│  │ • OpenAI     │  │ • ZAP DAST   │  │ • Neo4j      │  │ • PDF    │   │
│  │ • RAG        │  │ • SonarQube  │  │ • Cypher     │  │ • Export │   │
│  │ • Streaming  │  │ • Baseline   │  │ • Analytics  │  │ • Store  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↕
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │
│  │  PostgreSQL  │  │    Neo4j     │  │   Pinecone   │  │ Supabase │   │
│  │  (Prisma)    │  │  Graph DB    │  │  Vector DB   │  │ Storage  │   │
│  │              │  │              │  │              │  │          │   │
│  │ • Users      │  │ • Entities   │  │ • Embeddings │  │ • Files  │   │
│  │ • Scans      │  │ • Relations  │  │ • Semantic   │  │ • Reports│   │
│  │ • Reports    │  │ • CVEs       │  │ • Search     │  │ • Assets │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↕
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │
│  │   OpenAI     │  │  OWASP ZAP   │  │  SonarQube   │  │  Stripe  │   │
│  │   GPT-4      │  │   Scanner    │  │   Analysis   │  │ Payments │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │
│  │     NVD      │  │    CIRCL     │  │     OSV      │  │  Convex  │   │
│  │  CVE Data    │  │  CVE Search  │  │  Vulns DB    │  │ Real-time│   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### **Data Flow Architecture**

#### **1. Chat Interaction Flow**
```
User Input → Frontend → API Gateway → Chat Service
                                           ↓
                                    OpenAI GPT-4
                                           ↓
                                    RAG Service
                                           ↓
                        Pinecone Vector Search ← Neo4j Knowledge Graph
                                           ↓
                                    Response Stream
                                           ↓
                            Frontend (Real-time Update)
                                           ↓
                                    Convex Storage
```

#### **2. Vulnerability Scanning Flow**
```
Scan Request → Backend API → Scan Service
                                  ↓
                    ┌─────────────┴──────────────┐
                    ↓                            ↓
              OWASP ZAP                    SonarQube
              (DAST Scan)                  (SAST Scan)
                    ↓                            ↓
              Vulnerability                  Code Issues
              Detection                      Detection
                    ↓                            ↓
                    └─────────────┬──────────────┘
                                  ↓
                          Results Aggregation
                                  ↓
                    CVE Database Enrichment
                                  ↓
                          PostgreSQL Storage
                                  ↓
                          Report Generation
                                  ↓
                          Frontend Display
```

#### **3. Knowledge Graph Generation Flow**
```
AI Response → Entity Extraction → Relationship Mapping
                                         ↓
                                  Neo4j Storage
                                         ↓
                          Graph Visualization (D3.js)
                                         ↓
                          Interactive Frontend Display
```

---

## 🚀 Technology Stack

### **Frontend**

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **TypeScript** | 5.6.2 | Type safety |
| **Vite** | 5.4.10 | Build tool & dev server |
| **Tailwind CSS** | 3.4.15 | Styling framework |
| **Framer Motion** | 11.18.2 | Animations |
| **D3.js** | 7.9.0 | Data visualization |
| **Radix UI** | Latest | Accessible components |
| **Zustand** | 5.0.1 | State management |
| **React Router** | 7.0.1 | Routing |
| **Axios** | 1.7.8 | HTTP client |
| **Convex** | 1.17.4 | Real-time database |

### **Backend**

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **Bun** | 1.1+ | JavaScript runtime & bundler |
| **Express.js** | 4.x | Web framework |
| **TypeScript** | 5.6.2 | Type safety |
| **Prisma** | Latest | ORM for PostgreSQL |
| **PostgreSQL** | 14+ | Primary database |
| **Neo4j** | 5.x | Graph database |
| **JWT** | Latest | Authentication |

### **AI & ML Services**

| Service | Purpose |
|---------|---------|
| **OpenAI GPT-4** | Conversational AI & reasoning |
| **Pinecone** | Vector database for semantic search |
| **Neo4j** | Knowledge graph database |
| **Langchain** | LLM orchestration |

### **Security Tools**

| Tool | Purpose |
|------|---------|
| **OWASP ZAP** | Dynamic application security testing |
| **SonarQube** | Static code analysis |
| **NVD API** | CVE vulnerability data |
| **CIRCL CVE** | CVE search API |
| **OSV** | Open source vulnerabilities |

### **Infrastructure**

| Technology | Purpose |
|-----------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **Vercel** | Frontend hosting |
| **Supabase** | File storage & additional DB |
| **Stripe** | Payment processing |
| **Nodemailer** | Email service |

---

## 🚀 Quick Start

### **Prerequisites**

Ensure you have the following installed:

- **Node.js** >= 18.0.0
- **Bun** >= 1.1.0 (for backend)
- **PostgreSQL** >= 14.0
- **Neo4j** >= 5.0
- **Docker** (optional, for containerized deployment)

### **Required API Keys**

- OpenAI API Key (GPT-4 access)
- Pinecone API Key
- Stripe API Key (for payments)
- Supabase credentials
- Convex deployment URL

### **Installation Steps**

#### **1. Clone the Repository**

```bash
git clone https://github.com/your-org/denkminds.git
cd denkminds
```

#### **2. Install Dependencies**

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
bun install
```

#### **3. Environment Configuration**

**Backend `.env`:**
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/denkminds_db"
SHADOW_DATABASE_URL="postgresql://user:password@localhost:5432/denkminds_shadow"

# Neo4j
NEO4J_URI="bolt://localhost:7687"
NEO4J_USER="neo4j"
NEO4J_PASSWORD="your-neo4j-password"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key"
OPENAI_MODEL="gpt-4"

# Pinecone
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_ENVIRONMENT="us-west1-gcp"
PINECONE_INDEX_NAME="denkminds-embeddings"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Stripe
STRIPE_SECRET_KEY="sk_test_your-stripe-key"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"

# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Email
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"

# Security Tools
ZAP_API_KEY="your-zap-api-key"
ZAP_BASE_URL="http://localhost:8080"
SONAR_HOST_URL="http://localhost:9000"
SONAR_TOKEN="your-sonar-token"

# Application
PORT=8000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

**Frontend `.env`:**
```env
# Backend API
VITE_API_URL="http://localhost:8000"

# Convex
VITE_CONVEX_URL="https://your-convex-deployment.convex.cloud"

# Stripe (Public Key)
VITE_STRIPE_PUBLIC_KEY="pk_test_your-stripe-public-key"

# Application
VITE_APP_NAME="DenkMinds"
VITE_APP_URL="http://localhost:3000"
```

#### **4. Database Setup**

**PostgreSQL:**
```bash
# Create database
createdb denkminds_db
createdb denkminds_shadow

# Run Prisma migrations
cd backend
bunx prisma migrate dev
bunx prisma generate
```

**Neo4j:**
```bash
# Using Docker
docker run \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -d \
  -e NEO4J_AUTH=neo4j/your-password \
  neo4j:latest

# Or install Neo4j Desktop from https://neo4j.com/download/
```

#### **5. Seed Data (Optional)**

```bash
cd backend
bun run src/scripts/ingestAll.ts
```

This will ingest CVE data from NVD and CISA into your Neo4j database.

#### **6. Start the Application**

**Development Mode:**

**Terminal 1 (Backend):**
```bash
cd backend
bun run dev
# Backend runs on http://localhost:8000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:3000
```

**Production Mode with Docker:**
```bash
# From project root
docker-compose up --build

# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

#### **7. Access the Application**

Open your browser and navigate to:
```
http://localhost:3000
```

Default test credentials (if seeded):
- Email: `admin@denkminds.com`
- Password: `Admin@123`

---

## ⚙️ Configuration

### **Backend Configuration**

#### **Prisma Schema**

Located at `backend/src/prisma/schema.prisma`

```prisma
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
```

#### **CORS Configuration**

In `backend/src/app.ts`:

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
```

### **Frontend Configuration**

#### **API Client**

Located at `frontend/src/api/axios.ts`

```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

#### **Route Protection**

Protected routes use authentication middleware:

```typescript
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

---

## 📚 API Documentation

### **Authentication Endpoints**

#### **Register User**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

#### **Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### **Get Profile**
```http
GET /api/auth/profile
Authorization: Bearer <jwt_token>
```

### **Chat Endpoints**

#### **Send Message**
```http
POST /api/chat/message
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "message": "What is SQL injection?",
  "chatId": "chat-uuid",
  "mode": "tutor"
}
```

#### **Stream Response**
```http
POST /api/chat/stream
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "message": "Explain XSS vulnerabilities",
  "chatId": "chat-uuid"
}
```

### **Scanning Endpoints**

#### **DAST Scan**
```http
POST /api/scan/dast
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "url": "https://example.com",
  "scanType": "active"
}
```

#### **SAST Scan**
```http
POST /api/scan/sast
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

file: <code_file>
language: "javascript"
```

#### **Get Scan Results**
```http
GET /api/scan/results/:scanId
Authorization: Bearer <jwt_token>
```

### **Knowledge Graph Endpoints**

#### **Generate Graph**
```http
POST /api/graph/generate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "messageId": "msg-uuid",
  "chatId": "chat-uuid",
  "question": "What are the vulnerabilities in OWASP Top 10?"
}
```

#### **Get Graph Visualization**
```http
GET /api/graph/visualization/:messageId
Authorization: Bearer <jwt_token>
```

### **Report Endpoints**

#### **Generate Report**
```http
POST /api/reports/generate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "scanId": "scan-uuid",
  "format": "pdf"
}
```

#### **List Reports**
```http
GET /api/reports
Authorization: Bearer <jwt_token>
```

### **CVE Endpoints**

#### **Search CVEs**
```http
GET /api/cve/search?query=apache&severity=critical
Authorization: Bearer <jwt_token>
```

#### **Get CVE Details**
```http
GET /api/cve/:cveId
Authorization: Bearer <jwt_token>
```

---

## 🛠️ Development

### **Project Structure**

```
denkminds/
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── api/              # API client configurations
│   │   ├── components/       # Reusable React components
│   │   │   ├── chat/        # Chat-related components
│   │   │   ├── dashboard/   # Dashboard components
│   │   │   ├── graph-visualization/  # Graph components
│   │   │   ├── reports/     # Report components
│   │   │   └── ui/          # Base UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility libraries
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand state management
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── public/              # Static assets
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                   # Express backend application
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Route controllers
│   │   ├── middlewares/     # Express middlewares
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic services
│   │   ├── utils/           # Utility functions
│   │   ├── prisma/          # Prisma schema & migrations
│   │   ├── scripts/         # Utility scripts
│   │   └── index.ts         # Application entry point
│   ├── package.json
│   └── tsconfig.json
│
├── convex/                    # Convex backend functions
│   ├── chats.ts
│   ├── graphVisualizations.ts
│   ├── reports.ts
│   ├── todoLists.ts
│   └── schema.ts
│
├── docker-compose.yml        # Docker Compose configuration
├── backend.Dockerfile        # Backend Dockerfile
├── frontend.Dockerfile       # Frontend Dockerfile
└── README.md                 # Project documentation
```

### **Available Scripts**

#### **Frontend**

```bash
npm run dev          # Start development server (port 3000)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run Biome linter
npm run lint:fix     # Fix linting issues
npm run format       # Check code formatting
npm run format:fix   # Fix formatting issues
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report
npm run type-check   # TypeScript type checking
```

#### **Backend**

```bash
bun run dev          # Start development server (port 8000)
bun run build        # Build for production
bun run start        # Start production server
bun run check        # Run Biome checks
bun run check:fix    # Fix Biome issues
bunx prisma studio   # Open Prisma Studio
bunx prisma migrate dev  # Run database migrations
```

### **Code Style & Linting**

This project uses **Biome** for linting and formatting:

```bash
# Check code quality
npm run check

# Auto-fix issues
npm run check:fix
```

**Configuration:** `biome.json` in frontend and backend directories

### **Testing**

#### **Frontend Tests**

Using Vitest and React Testing Library:

```bash
# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Generate coverage
npm run test:coverage
```

#### **Backend Tests**

```bash
# Run tests
bun run test
```

### **Database Migrations**

```bash
# Create a new migration
bunx prisma migrate dev --name migration_name

# Apply migrations
bunx prisma migrate deploy

# Reset database (development only)
bunx prisma migrate reset
```

### **Debugging**

#### **Frontend**

Use React DevTools and Redux DevTools:

```bash
# Enable verbose logging
VITE_LOG_LEVEL=debug npm run dev
```

#### **Backend**

```bash
# Enable debug mode
DEBUG=* bun run dev
```

---

## 🚢 Deployment

### **Docker Deployment**

#### **Build and Run**

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

#### **Environment Variables**

Create `.env` files for production:

```bash
cp backend/.env.example backend/.env.production
cp frontend/.env.example frontend/.env.production
```

### **Manual Deployment**

#### **Frontend (Vercel)**

```bash
cd frontend
npm run build

# Deploy to Vercel
vercel --prod
```

#### **Backend (Traditional Server)**

```bash
cd backend
bun run build

# Set environment to production
export NODE_ENV=production

# Start with PM2
pm2 start dist/index.js --name denkminds-backend
```

### **Database Deployment**

#### **PostgreSQL**

Use managed PostgreSQL services:
- AWS RDS
- Google Cloud SQL
- Supabase
- Railway

#### **Neo4j**

Use Neo4j AuraDB (managed cloud service) or self-host:

```bash
docker run \
  --name neo4j-prod \
  -p 7474:7474 -p 7687:7687 \
  -v $HOME/neo4j/data:/data \
  -e NEO4J_AUTH=neo4j/production-password \
  neo4j:latest
```

### **Environment-Specific Configurations**

**Development:**
- Hot reload enabled
- Debug logging
- Local databases
- Mock external services

**Production:**
- Minified builds
- Error tracking (Sentry)
- Production databases
- CDN for static assets
- Rate limiting
- Security headers

---

## 🧪 Testing

### **Test Coverage**

```bash
# Frontend coverage
cd frontend
npm run test:coverage

# Backend coverage
cd backend
bun run test:coverage
```

### **E2E Testing**

```bash
# Install Playwright
npm install -D @playwright/test

# Run E2E tests
npx playwright test
```

### **Load Testing**

```bash
# Install k6
brew install k6

# Run load test
k6 run tests/load/chat-api.js
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### **Development Workflow**

1. **Fork the repository**
```bash
gh repo fork your-org/denkminds --clone
```

2. **Create a feature branch**
```bash
git checkout -b feature/amazing-feature
```

3. **Make your changes**
```bash
# Follow code style guidelines
# Add tests for new features
# Update documentation
```

4. **Run quality checks**
```bash
npm run check:fix
npm run test
npm run type-check
```

5. **Commit your changes**
```bash
git commit -m "feat: add amazing feature"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

6. **Push and create PR**
```bash
git push origin feature/amazing-feature
# Create Pull Request on GitHub
```

### **Code Review Process**

- All PRs require at least one review
- CI/CD checks must pass
- Code coverage should not decrease
- Documentation must be updated

### **Reporting Issues**

Use GitHub Issues with appropriate labels:
- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `security` - Security vulnerabilities

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 DenkMinds Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

### **Technologies**
- [OpenAI](https://openai.com/) - GPT-4 AI capabilities
- [Neo4j](https://neo4j.com/) - Graph database technology
- [React](https://react.dev/) - Frontend framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing tool
- [SonarQube](https://www.sonarsource.com/) - Code quality platform

### **Inspirations**
- OWASP Foundation for security standards
- Cybersecurity community for best practices
- Open-source contributors worldwide

---

## 📞 Support & Contact

### **Support Channels**

- 📧 **Email**: support@denkminds.com
- 💬 **Discord**: [Join our community](https://discord.gg/denkminds)
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-org/denkminds/issues)
- 📚 **Documentation**: [docs.denkminds.com](https://docs.denkminds.com)

### **Team**

- **Lead Developer**: Utkarsh Yadav
- **AI/ML Engineer**: [Your Name]
- **Security Analyst**: [Your Name]
- **DevOps Engineer**: [Your Name]

---

## 🗺️ Roadmap

### **Q1 2025**
- [ ] Mobile app (React Native)
- [ ] Advanced threat intelligence
- [ ] Multi-language support
- [ ] API rate limiting dashboard

### **Q2 2025**
- [ ] Browser extension
- [ ] CI/CD integration plugins
- [ ] Advanced analytics dashboard
- [ ] Collaborative features

### **Q3 2025**
- [ ] Enterprise SSO support
- [ ] Custom security rules engine
- [ ] Compliance frameworks expansion
- [ ] White-label solution

### **Q4 2025**
- [ ] AI model fine-tuning
- [ ] Advanced reporting templates
- [ ] Integration marketplace
- [ ] On-premise deployment option

---

## 📈 Project Status

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Test Coverage](https://img.shields.io/badge/coverage-85%25-green)
![Security](https://img.shields.io/badge/security-A+-brightgreen)
![Uptime](https://img.shields.io/badge/uptime-99.9%25-brightgreen)

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

### **Latest Release (v1.0.0)**

#### Added
✨ Responsive graph visualization for mobile devices  
✨ Enhanced knowledge graph with D3.js  
✨ Multi-personality AI modes  
✨ Comprehensive vulnerability scanning  
✨ Interactive todo list management  
✨ PDF report generation  

#### Fixed
🐛 Graph modal responsiveness issues  
🐛 Chat alignment problems  
🐛 Authentication edge cases  
🐛 File upload handling  

#### Changed
♻️ Improved API error handling  
♻️ Optimized database queries  
♻️ Enhanced UI/UX across platform  
♻️ Updated dependencies  

---

<div align="center">

**Built with ❤️ by the DenkMinds Team**

[Website](https://denkminds.com) • [Documentation](https://docs.denkminds.com) • [GitHub](https://github.com/your-org/denkminds)

© 2024 DenkMinds. All rights reserved.

</div>
