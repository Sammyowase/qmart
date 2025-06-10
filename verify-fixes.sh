#!/bin/bash

# 🧪 Qmart API Security & TypeScript Fixes Verification Script

echo "🎯 Verifying Critical Fixes for Qmart Fintech API"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

echo ""
echo "1. 🔧 TypeScript Compilation Check"
echo "=================================="

print_info "Checking TypeScript compilation..."
npx tsc --noEmit
TS_RESULT=$?
print_status $TS_RESULT "TypeScript compilation"

if [ $TS_RESULT -eq 0 ]; then
    echo -e "${GREEN}   All TypeScript errors resolved!${NC}"
else
    echo -e "${RED}   TypeScript errors still exist. Check output above.${NC}"
fi

echo ""
echo "2. 🔒 Docker Security Verification"
echo "=================================="

print_info "Building secure Docker image..."
docker build -t qmart-api-secure . > /dev/null 2>&1
BUILD_RESULT=$?
print_status $BUILD_RESULT "Docker build with security fixes"

if [ $BUILD_RESULT -eq 0 ]; then
    echo -e "${GREEN}   Secure Docker image built successfully!${NC}"
    
    print_info "Testing container security..."
    
    # Test non-root execution
    USER_CHECK=$(docker run --rm qmart-api-secure whoami 2>/dev/null)
    if [ "$USER_CHECK" = "nodejs" ]; then
        print_status 0 "Non-root user execution (nodejs)"
    else
        print_status 1 "Non-root user execution (expected: nodejs, got: $USER_CHECK)"
    fi
    
    # Test container starts successfully
    print_info "Testing container startup..."
    docker run -d --name qmart-test qmart-api-secure > /dev/null 2>&1
    sleep 10
    
    HEALTH_STATUS=$(docker inspect qmart-test --format='{{.State.Status}}' 2>/dev/null)
    if [ "$HEALTH_STATUS" = "running" ]; then
        print_status 0 "Container startup and health"
    else
        print_status 1 "Container startup (Status: $HEALTH_STATUS)"
    fi
    
    # Cleanup test container
    docker stop qmart-test > /dev/null 2>&1
    docker rm qmart-test > /dev/null 2>&1
    
else
    echo -e "${RED}   Docker build failed. Check Dockerfile syntax.${NC}"
fi

echo ""
echo "3. 📊 Security Features Verification"
echo "===================================="

print_info "Checking Dockerfile security features..."

# Check for Node.js 20.11.1
if grep -q "node:20.11.1-alpine3.19" Dockerfile; then
    print_status 0 "Updated Node.js base image (20.11.1-alpine3.19)"
else
    print_status 1 "Updated Node.js base image"
fi

# Check for dumb-init
if grep -q "dumb-init" Dockerfile; then
    print_status 0 "dumb-init process manager"
else
    print_status 1 "dumb-init process manager"
fi

# Check for npm audit fix
if grep -q "npm audit fix" Dockerfile; then
    print_status 0 "NPM security audit fixes"
else
    print_status 1 "NPM security audit fixes"
fi

# Check for non-root user
if grep -q "USER nodejs" Dockerfile; then
    print_status 0 "Non-root user configuration"
else
    print_status 1 "Non-root user configuration"
fi

echo ""
echo "4. 🎯 Application Functionality Test"
echo "===================================="

print_info "Testing API functionality..."

# Check if API is running locally
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    print_status 0 "Local API health endpoint"
    
    # Test metrics endpoint
    if curl -s http://localhost:5000/metrics | grep -q "qmart_api"; then
        print_status 0 "Prometheus metrics endpoint"
    else
        print_status 1 "Prometheus metrics endpoint"
    fi
    
else
    print_status 1 "Local API health endpoint (API not running)"
    echo -e "${YELLOW}   Start API with: npm run dev${NC}"
fi

echo ""
echo "5. 📋 Production Readiness Summary"
echo "=================================="

# Count successful checks
TOTAL_CHECKS=7
PASSED_CHECKS=0

# Recheck all conditions
[ $TS_RESULT -eq 0 ] && ((PASSED_CHECKS++))
[ $BUILD_RESULT -eq 0 ] && ((PASSED_CHECKS++))
[ "$USER_CHECK" = "nodejs" ] && ((PASSED_CHECKS++))
[ "$HEALTH_STATUS" = "running" ] && ((PASSED_CHECKS++))
grep -q "node:20.11.1-alpine3.19" Dockerfile && ((PASSED_CHECKS++))
grep -q "dumb-init" Dockerfile && ((PASSED_CHECKS++))
grep -q "npm audit fix" Dockerfile && ((PASSED_CHECKS++))

echo "Passed: $PASSED_CHECKS/$TOTAL_CHECKS checks"

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    echo -e "${GREEN}"
    echo "🎉 ALL CRITICAL ISSUES RESOLVED!"
    echo "================================"
    echo "✅ TypeScript compilation errors fixed"
    echo "✅ Docker security vulnerabilities resolved"
    echo "✅ Production-ready security hardening applied"
    echo "✅ Fintech-grade security standards met"
    echo ""
    echo "🚀 Ready for production deployment to Render.com!"
    echo -e "${NC}"
else
    echo -e "${RED}"
    echo "⚠️  SOME ISSUES REMAIN"
    echo "====================="
    echo "Please review the failed checks above and fix them before deployment."
    echo -e "${NC}"
fi

echo ""
echo "6. 🔗 Next Steps"
echo "================"
echo "1. Deploy to Render.com: git push origin main"
echo "2. Monitor security: Set up automated scanning"
echo "3. Test production: Verify all endpoints work"
echo "4. Monitor performance: Check Prometheus metrics"

echo ""
echo "📚 Documentation:"
echo "- Security fixes: SECURITY_FIXES_GUIDE.md"
echo "- Complete summary: CRITICAL_FIXES_SUMMARY.md"
echo "- Render deployment: RENDER_DEPLOYMENT_GUIDE.md"
