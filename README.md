# Monorepo Docker Setup

This document explains how to run the application using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your machine

## Project Structure

```
monorepo/
├── frontend/          # React + Vite frontend
│   ├── .env           # Frontend environment variables
│   └── ...
├── backend/           # Bun.js backend
│   ├── .env           # Backend environment variables
│   ├── package.json   # Backend dependencies
│   ├── bun.lockb      # Bun lock file
│   └── ...
├── frontend.Dockerfile
├── backend.Dockerfile
├── docker-compose.yml
└── README.md          # This file
```

## Running the Application

1. Make sure both `.env` files exist and are properly configured:
   - `backend/.env` - Environment variables for the Bun.js backend
   - `frontend/.env` - Environment variables for the React frontend

2. Build and start the containers:
   ```bash
   docker-compose up
   ```

   This will:
   - Build both frontend and backend Docker images
   - Start both services
   - Connect them to the same network
   - Forward the necessary ports

3. Access the application:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8000`

4. To stop the application:
   ```bash
   docker-compose down
   ```

## Development

If you need to rebuild the containers after making changes:
```bash
docker-compose up --build
```

## Troubleshooting

- If you encounter connection issues between frontend and backend, ensure that in the frontend's `.env` file, the API URL is pointing to the backend service (e.g., `VITE_API_URL=http://backend:8000`)
- If port conflicts occur, you can modify the port mappings in `docker-compose.yml`


# Development Environment Setup and Commands

## Prerequisites Installation

### Installing Node.js and npm via nvm (Node Version Manager)

NVM allows you to manage multiple Node.js versions on a single environment.

#### For macOS and Linux:
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

# Reload shell configuration
source ~/.bashrc  # for bash
# OR
source ~/.zshrc   # for zsh

# Verify nvm installation
nvm --version

# Install the latest LTS version of Node.js
nvm install --lts

# Set the LTS version as default
nvm use --lts

# Verify Node.js and npm installation
node --version
npm --version
```

#### For Windows:
```bash
# Download and install NVM for Windows from:
# https://github.com/coreybutler/nvm-windows/releases

# Open a new command prompt and verify installation
nvm --version

# Install the latest LTS version of Node.js
nvm install lts

# Use the installed version
nvm use lts

# Verify Node.js and npm installation
node --version
npm --version
```

### Installing Bun CLI

Bun is required to run the backend of this project.

#### For macOS and Linux:
```bash
# Install Bun using curl
curl -fsSL https://bun.sh/install | bash

# Verify Bun installation
bun --version
```

#### For Windows (via WSL):
```bash
# Bun officially supports macOS and Linux only, but can be installed on Windows via WSL
# Install WSL if not already installed
wsl --install

# Launch Ubuntu on WSL and run
curl -fsSL https://bun.sh/install | bash

# Verify Bun installation
bun --version
```

## Running the Project

### Backend Commands
```bash
# Navigate to backend directory
cd backend

# Install dependencies with Bun
bun install

# Start the backend server in production mode
bun run start:prod
```

### Frontend Commands
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies with npm
npm install

# Start the Vite React development server
npm run dev
```

## Docker Setup
```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop/

# Verify Docker installation
docker --version
docker compose --version

# Build the Docker containers from project root
docker compose build

# Start all containers
docker compose up

# Alternatively, run in detached mode
docker compose up -d
```