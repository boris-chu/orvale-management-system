# Server Startup Guide - Orvale Management System

## Overview
The Orvale Management System consists of three separate servers that need to be running for full functionality:

1. **Express Backend API** (Port 3001) - Authentication, database, tickets
2. **Next.js Frontend** (Port 3000) - React-based admin/management interface  
3. **Public Portal** (Port 8081) - HTML ticket submission form

## Quick Start - All Servers

### Method 1: Concurrent Start (Recommended)
```bash
# Terminal 1: Start Express backend + Next.js frontend
cd "/Users/borischu/project management/project-ticket-development/project-system"
npm run dev:full

# Terminal 2: Start public portal
cd "/Users/borischu/project management/project-ticket-development/public-portal"
python3 -m http.server 8081
```

### Method 2: Individual Servers
```bash
# Terminal 1: Express Backend API (Port 3001)
cd "/Users/borischu/project management/project-ticket-development/project-system"
npm run server

# Terminal 2: Next.js Frontend (Port 3000)
cd "/Users/borischu/project management/project-ticket-development/project-system"
npm run dev

# Terminal 3: Public Portal (Port 8081)
cd "/Users/borischu/project management/project-ticket-development/public-portal"
python3 -m http.server 8081
```

## Server Details

### 1. Express Backend API (Port 3001)
**Purpose**: REST API, authentication, database operations, ticket management

**Start Command**:
```bash
cd "/Users/borischu/project management/project-ticket-development/project-system"
npm run server
```

**Features**:
- SQLite database with users and tickets
- JWT authentication
- CORS configured for ports 3000, 3001, 8081
- REST endpoints for tickets, auth, system info

**Test Login Credentials**:
- admin / admin123
- boris.chu / boris123  
- john.doe / john123

**Health Check**: http://localhost:3001/api/health

### 2. Next.js Frontend (Port 3000)
**Purpose**: React-based admin interface, management dashboard

**Start Command**:
```bash
cd "/Users/borischu/project management/project-ticket-development/project-system"
npm run dev
```

**Features**:
- Admin dashboard
- Ticket queue management
- User management interface
- Analytics and reporting
- React components with shadcn:ui

**Access**: http://localhost:3000

### 3. Public Portal (Port 8081)
**Purpose**: Public-facing ticket submission form

**Start Command**:
```bash
cd "/Users/borischu/project management/project-ticket-development/public-portal"
python3 -m http.server 8081
```

**Features**:
- HTML ticket submission form
- Organizational data integration
- Direct API communication with Express backend
- Public access (no authentication required)

**Access**: http://localhost:8081

## Troubleshooting

### Port Already in Use
```bash
# Check what's using a port
lsof -ti:PORT_NUMBER

# Kill processes using a port
lsof -ti:PORT_NUMBER | xargs kill -9
```

### CORS Errors
- Ensure all three servers are running
- Backend CORS is configured for ports 3000, 3001, 8081
- Check browser console for specific CORS errors

### Database Issues
- Database is automatically initialized on first Express server start
- SQLite file located in project-system directory
- Restart Express server to reinitialize if needed

### Common Issues
1. **Express server fails to start**: Check if port 3001 is free
2. **Next.js warnings about lockfiles**: Safe to ignore, won't affect functionality
3. **Python server fails**: Ensure Python 3 is installed, try different port
4. **Login fails**: Ensure Express backend is running and responding

## Development Workflow

### For Frontend Development (React/Next.js)
```bash
# Start backend + Next.js
npm run dev:full
```

### For Public Portal Development
```bash
# Backend only
npm run server

# Public portal
python3 -m http.server 8081
```

### For Full System Testing
```bash
# All three servers (use Quick Start Method 1)
npm run dev:full  # Terminal 1
python3 -m http.server 8081  # Terminal 2
```

## Environment Access

After all servers are running:

- **Public Portal**: http://localhost:8081 (Ticket submission)
- **Next.js App**: http://localhost:3000 (Admin interface)
- **API Health**: http://localhost:3001/api/health (Backend status)

## Notes

- Express backend must be running for authentication and database operations
- Public portal can work independently but needs backend for ticket submission
- Next.js frontend requires backend for data and authentication
- All servers support hot reload during development
- HTTPS can be enabled for Next.js with `--experimental-https` flag