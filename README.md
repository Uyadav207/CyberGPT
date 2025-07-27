# 🛡️ AEVIX - AI-Powered Cybersecurity Assistant

A comprehensive cybersecurity platform that combines AI-powered chat assistance with advanced vulnerability scanning, knowledge graph integration, and interactive security analysis tools.

## ✨ **Key Features**

### 🤖 **AI-Powered Security Assistant**
- **Intelligent Chat Interface**: Advanced AI assistant with reasoning capabilities
- **Multi-Personality Modes**: Tutor, Investigator, and Analyst personas for different use cases
- **Real-time Reasoning**: Transparent AI decision-making with step-by-step explanations
- **Context-Aware Responses**: Leverages knowledge graphs for comprehensive security insights

### 🔍 **Vulnerability Scanning & Analysis**
- **URL Security Scanner**: Comprehensive web application vulnerability assessment
- **SAST Code Analysis**: Static Application Security Testing for code review
- **CVE Database Integration**: Real-time vulnerability database lookups
- **Compliance Mapping**: Automated compliance checking against security standards

### 📊 **Advanced Visualization & Reporting**
- **Interactive Knowledge Graphs**: Visual representation of security concepts and relationships
- **Dynamic Graph Generation**: Real-time graph creation from chat conversations
- **Comprehensive Reports**: Detailed security analysis reports with actionable insights
- **PDF Export**: Professional report generation with customizable templates

### 🎯 **Interactive Features**
- **Human-in-the-Loop Approval**: Critical security actions require user confirmation
- **Todo List Integration**: Convert security recommendations into actionable tasks
- **Source Link Management**: Track and organize reference materials
- **Multi-modal Input**: Support for text, file uploads, and URL scanning

## 🏗️ **Architecture**

### **Frontend (React + TypeScript)**
- **Modern UI/UX**: Clean, responsive design with dark/light theme support
- **Real-time Updates**: Live chat interface with streaming responses
- **Interactive Components**: Drag-and-drop, file uploads, and dynamic forms
- **Accessibility**: WCAG compliant with keyboard navigation support

### **Backend (Node.js + Express)**
- **RESTful APIs**: Comprehensive API endpoints for all features
- **Database Integration**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based secure authentication system
- **File Processing**: Multi-format file upload and processing

### **AI & ML Integration**
- **OpenAI Integration**: GPT-4 powered conversational AI
- **Knowledge Graph**: Neo4j graph database for semantic relationships
- **Vector Search**: Pinecone integration for semantic similarity
- **RAG Pipeline**: Retrieval-Augmented Generation for context-aware responses

### **Security Tools Integration**
- **OWASP ZAP**: Automated security testing integration
- **SonarQube**: Code quality and security analysis
- **CVE Databases**: NVD, CIRCL, and OSV integration
- **Compliance Frameworks**: Automated compliance checking

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- PostgreSQL 14+
- Neo4j Database
- OpenAI API Key
- Pinecone API Key

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/Uyadav207/knowledgeGPT.git
   cd knowledgeGPT
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install
   
   # Backend
   cd ../backend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment templates
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Configure your environment variables
   # See .env.example files for required variables
   ```

4. **Database Setup**
   ```bash
   # PostgreSQL
   createdb aevix_db
   
   # Neo4j
   # Install and start Neo4j Desktop or Docker
   ```

5. **Start the application**
   ```bash
   # Backend (from backend directory)
   npm run dev
   
   # Frontend (from frontend directory)
   npm run dev
   ```

## 🎨 **Recent UI/UX Improvements**

### **Enhanced Chat Interface**
- **Lilac Reasoning Section**: Beautiful purple-themed reasoning display with thinking emoji
- **Improved Message Alignment**: Perfect user message bubble alignment with proper padding
- **Interactive Sources**: Enhanced source link management with hover effects
- **Responsive Design**: Optimized for all screen sizes and devices

### **Security & Branding Updates**
- **Removed Default Assets**: Cleaned up unused profile images and branding
- **Enhanced Accessibility**: Improved keyboard navigation and screen reader support
- **Profile Management**: Better user profile settings with proper scrolling
- **Modern Icons**: Updated iconography with consistent hover states

### **Performance Optimizations**
- **Streaming Responses**: Real-time chat updates without page refreshes
- **Lazy Loading**: Optimized component loading for better performance
- **Caching**: Intelligent caching for frequently accessed data
- **Error Handling**: Comprehensive error boundaries and user feedback

## 🔧 **Configuration**

### **Environment Variables**

#### **Backend (.env)**
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/aevex_db"

# Neo4j
NEO4J_URI="bolt://localhost:7687"
NEO4J_USER="neo4j"
NEO4J_PASSWORD="password"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Pinecone
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_ENVIRONMENT="us-west1-gcp"

# JWT
JWT_SECRET="your-jwt-secret"

# Other Services
STRIPE_SECRET_KEY="your-stripe-key"
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-key"
```

#### **Frontend (.env)**
```env
VITE_API_URL="http://localhost:3001"
VITE_CONVEX_URL="your-convex-url"
```

## 📚 **API Documentation**

### **Authentication Endpoints**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### **Chat Endpoints**
- `POST /api/chat/send` - Send message to AI
- `GET /api/chat/history` - Get chat history
- `DELETE /api/chat/:id` - Delete chat

### **Scanning Endpoints**
- `POST /api/scan/url` - Scan URL for vulnerabilities
- `POST /api/scan/code` - Analyze code for security issues
- `GET /api/scan/reports` - Get scan reports

### **Graph Endpoints**
- `POST /api/graph/generate` - Generate knowledge graph
- `GET /api/graph/visualize` - Get graph visualization
- `POST /api/graph/query` - Query knowledge graph

## 🛠️ **Development**

### **Available Scripts**

#### **Backend**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Lint code
```

#### **Frontend**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Lint code
```

### **Docker Support**
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Code Style**
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write comprehensive tests for new features
- Update documentation for API changes

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **OpenAI** for GPT-4 integration
- **Neo4j** for graph database technology
- **OWASP** for security testing tools
- **React Team** for the amazing frontend framework

## 📞 **Support**

For support, email support@aevex.com or create an issue in the GitHub repository.

---

**Built with ❤️ by the AEVIX Team**
