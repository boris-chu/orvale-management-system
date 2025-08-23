#!/bin/bash

# Simple Status Check for Orvale Management System
echo "🔍 Orvale Management System - Quick Status Check"
echo "================================================"

# Check Socket.io Server
echo "🌐 Socket.io Server (Port 4000):"
if curl -s --max-time 3 http://localhost:4000/health > /dev/null 2>&1; then
    echo "✅ Socket.io server is HEALTHY"
    curl -s http://localhost:4000/health | jq . 2>/dev/null || curl -s http://localhost:4000/health
else
    echo "❌ Socket.io server is DOWN"
    echo "   Start with: npm run socket-server"
fi
echo ""

# Check Main Server
echo "🖥️  Main Server (Port 80):"
if curl -s --max-time 3 -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200"; then
    echo "✅ Main server is HEALTHY"
    echo "   🌐 Public Portal: http://localhost/"
    echo "   🔧 Admin Panel: http://localhost/admin/"
    echo "   💬 Chat Page: http://localhost/chat/"
else
    echo "❌ Main server is DOWN"
    echo "   Start with: sudo npm run dev"
fi
echo ""

# Check processes
echo "📊 Running Processes:"
ps aux | grep -E "(next.*dev|socket-server)" | grep -v grep | while read line; do
    echo "   $line"
done
echo ""

# Quick commands
echo "🚀 Quick Commands:"
echo "   Kill & restart both:  sudo lsof -ti:80 | xargs sudo kill -9; sudo lsof -ti:4000 | xargs sudo kill -9; npm run dev:all"
echo "   Start both servers:   npm run dev:all"
echo "   Start main only:      sudo npm run dev"
echo "   Start socket only:    npm run socket-server"
echo ""