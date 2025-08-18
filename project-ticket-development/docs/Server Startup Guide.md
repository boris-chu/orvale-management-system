# Server Startup Guide - Orvale Management System

## Overview
The Orvale Management System is now a **unified single-server architecture** powered entirely by Next.js:

✅ **Single Next.js Server** - All functionality consolidated into one server
- Public portal (home page with login)
- API routes (authentication, tickets, system info)
- Admin interface (ticket queue management)
- Database operations (SQLite with built-in API)

## Quick Start - Single Server

### Production (Port 80) - Recommended
```bash
cd "/Users/borischu/project management/project-ticket-development/project-system"
sudo npm run dev
```

### Development (Port 3000) - No sudo required
```bash
cd "/Users/borischu/project management/project-ticket-development/project-system"
npm run dev:dev
```

### Build for Production
```bash
cd "/Users/borischu/project management/project-ticket-development/project-system"
npm run build
sudo npm start
```

## Server Details

### Single Next.js Server (Port 80/3000)
**Purpose**: Complete unified IT management system

**Features**:
- **Public Portal**: Professional landing page with login modal
- **Authentication**: JWT-based with SQLite database
- **API Routes**: Built-in Next.js API endpoints
- **Admin Interface**: Modern ticket queue management
- **Database**: SQLite with automatic initialization
- **UI Components**: shadcn:ui with Tailwind CSS

**Test Login Credentials**:
- admin / admin123
- boris.chu / boris123  
- john.doe / john123

**Endpoints**:
- **Home**: http://localhost/ (Public portal)
- **Admin Queue**: http://localhost/tickets (After login)
- **Health Check**: http://localhost/api/health
- **Login API**: http://localhost/api/auth/login

## Troubleshooting

### Port Already in Use
```bash
# Check what's using a port
lsof -ti:PORT_NUMBER

# Kill processes using a port
lsof -ti:PORT_NUMBER | xargs kill -9
```

### Common Issues
1. **Port 80 requires sudo**: Use `sudo npm run dev` for port 80, or `npm run dev:dev` for port 3000
2. **Module not found errors**: Run `npm install` to ensure all dependencies are installed
3. **Database initialization**: Database auto-creates on first API call
4. **Login fails**: Check browser console and ensure server is running

## Development Workflow

### For Development
```bash
# Development mode (port 3000)
npm run dev:dev

# Production mode (port 80)
sudo npm run dev
```

### For Production Deployment
```bash
# Build and start
npm run build
sudo npm start
```

## Environment Access

After server is running:

- **Public Portal**: http://localhost/ (Landing page with login)
- **Admin Queue**: http://localhost/tickets (IT staff interface)
- **API Health**: http://localhost/api/health (Server status)

## Architecture Benefits

✅ **Simplified Deployment**: Single server, single port
✅ **No CORS Issues**: All endpoints on same origin  
✅ **Unified Authentication**: Seamless login flow
✅ **Modern UI**: shadcn:ui components throughout
✅ **Production Ready**: Built-in Next.js optimizations
✅ **Easy Maintenance**: One codebase, one deployment