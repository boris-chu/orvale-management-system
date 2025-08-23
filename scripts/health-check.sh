#!/bin/bash

# Orvale Management System - Health Check Script
# Checks status of both Next.js server (port 80) and Socket.io server (port 4000)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Icons
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"

echo -e "${BLUE}=== Orvale Management System Health Check ===${NC}"
echo ""

# Function to check if a port is listening
check_port() {
    local port=$1
    local name=$2
    
    # Try multiple methods to check if port is accessible
    if lsof -i :$port | grep -q LISTEN 2>/dev/null || \
       netstat -an 2>/dev/null | grep -q ":$port " || \
       nc -z localhost $port 2>/dev/null; then
        echo -e "${GREEN}${CHECK} Port $port ($name) is accessible${NC}"
        return 0
    else
        echo -e "${RED}${CROSS} Port $port ($name) is not accessible${NC}"
        return 1
    fi
}

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local name=$2
    local timeout=${3:-5}
    
    if curl -s --max-time $timeout -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|201"; then
        echo -e "${GREEN}${CHECK} $name endpoint is responding${NC}"
        return 0
    else
        echo -e "${RED}${CROSS} $name endpoint is not responding${NC}"
        return 1
    fi
}

# Function to get and display service details
get_service_details() {
    local url=$1
    local name=$2
    
    echo -e "${INFO} $name Details:"
    local response=$(curl -s --max-time 5 "$url" 2>/dev/null)
    if [ $? -eq 0 ] && [ ! -z "$response" ]; then
        if command -v jq >/dev/null 2>&1; then
            echo "$response" | jq . 2>/dev/null || echo "$response"
        else
            echo "$response"
        fi
    else
        echo -e "${YELLOW}  No response data available${NC}"
    fi
    echo ""
}

# Function to check process status
check_process() {
    local process_name=$1
    local display_name=$2
    
    local pids=$(pgrep -f "$process_name" 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo -e "${GREEN}${CHECK} $display_name process is running (PID: $pids)${NC}"
        return 0
    else
        echo -e "${RED}${CROSS} $display_name process is not running${NC}"
        return 1
    fi
}

# Main health checks
echo -e "${BLUE}🔍 Checking Port Status...${NC}"
main_port_ok=$(check_port 80 "Next.js Server" && echo "true" || echo "false")
socket_port_ok=$(check_port 4000 "Socket.io Server" && echo "true" || echo "false")
echo ""

echo -e "${BLUE}🌐 Checking HTTP Endpoints...${NC}"
main_http_ok=$(check_endpoint "http://localhost/" "Main Server" && echo "true" || echo "false")
socket_http_ok=$(check_endpoint "http://localhost:4000/health" "Socket.io Health" && echo "true" || echo "false")
echo ""

echo -e "${BLUE}📊 Checking Process Status...${NC}"
main_process_ok=$(check_process "next-server\|next dev" "Next.js Server" && echo "true" || echo "false")
socket_process_ok=$(check_process "socket-server.js" "Socket.io Server" && echo "true" || echo "false")
echo ""

# Get detailed information if services are running
if [ "$socket_http_ok" = "true" ]; then
    get_service_details "http://localhost:4000/health" "Socket.io Server"
fi

if [ "$main_http_ok" = "true" ]; then
    echo -e "${INFO} Main Server Details:"
    echo -e "  ${GREEN}${CHECK} Server is accessible at http://localhost/${NC}"
    echo -e "  ${GREEN}${CHECK} Public portal available at http://localhost/public-portal/${NC}"
    echo -e "  ${GREEN}${CHECK} Admin panel available at http://localhost/admin/${NC}"
    echo ""
fi

# System resource check
echo -e "${BLUE}💻 System Resources...${NC}"
echo -e "${INFO} Memory Usage:"
ps aux | grep -E "(next|socket-server)" | grep -v grep | head -5 | while read line; do
    echo "  $line"
done
echo ""

echo -e "${INFO} Current Directory: $(pwd)"
echo -e "${INFO} Node.js Version: $(node --version 2>/dev/null || echo 'Not installed')"
echo -e "${INFO} NPM Version: $(npm --version 2>/dev/null || echo 'Not installed')"
echo ""

# Overall status summary
echo -e "${BLUE}📋 Overall Status Summary:${NC}"
main_overall="false"
socket_overall="false"

if [ "$main_port_ok" = "true" ] && [ "$main_http_ok" = "true" ]; then
    echo -e "${GREEN}${CHECK} Main Server (Next.js): HEALTHY${NC}"
    main_overall="true"
else
    echo -e "${RED}${CROSS} Main Server (Next.js): UNHEALTHY${NC}"
fi

if [ "$socket_port_ok" = "true" ] && [ "$socket_http_ok" = "true" ]; then
    echo -e "${GREEN}${CHECK} Socket.io Server: HEALTHY${NC}"
    socket_overall="true"
else
    echo -e "${RED}${CROSS} Socket.io Server: UNHEALTHY${NC}"
fi

echo ""

# Provide startup commands if needed
if [ "$main_overall" = "false" ] || [ "$socket_overall" = "false" ]; then
    echo -e "${YELLOW}${WARNING} Startup Commands:${NC}"
    
    if [ "$main_overall" = "false" ]; then
        echo -e "  Main Server:    ${BLUE}sudo npm run dev${NC}"
    fi
    
    if [ "$socket_overall" = "false" ]; then
        echo -e "  Socket.io:      ${BLUE}npm run socket-server${NC}"
    fi
    
    echo -e "  Both Servers:   ${BLUE}npm run dev:all${NC}"
    echo -e "  Safe Mode:      ${BLUE}npm run dev:all-safe${NC} (port 3000)"
    echo ""
fi

# Exit with appropriate code
if [ "$main_overall" = "true" ] && [ "$socket_overall" = "true" ]; then
    echo -e "${GREEN}🎉 All systems are healthy!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some systems need attention.${NC}"
    exit 1
fi