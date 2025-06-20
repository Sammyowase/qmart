#!/bin/bash

echo "🐳 Testing Docker Build Process for Qmart Backend"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Step 1: Clean previous build
echo -e "\n${YELLOW}Step 1: Cleaning previous build...${NC}"
rm -rf dist/
print_status $? "Cleaned dist directory"

# Step 2: Test TypeScript compilation
echo -e "\n${YELLOW}Step 2: Testing TypeScript compilation...${NC}"
npx tsc --listFiles > tsc-output.log 2>&1
TSC_EXIT_CODE=$?
print_status $TSC_EXIT_CODE "TypeScript compilation"

if [ $TSC_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}TypeScript compilation failed. Output:${NC}"
    cat tsc-output.log
    rm -f tsc-output.log
    exit 1
fi

# Step 3: Verify critical files exist
echo -e "\n${YELLOW}Step 3: Verifying critical files...${NC}"
CRITICAL_FILES=(
    "dist/server.js"
    "dist/config/database.js"
    "dist/config/email.js"
)

ALL_FILES_EXIST=true
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "$file exists"
    else
        print_status 1 "$file missing"
        ALL_FILES_EXIST=false
    fi
done

# Step 4: Check file sizes
echo -e "\n${YELLOW}Step 4: Checking file sizes...${NC}"
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        if [ "$SIZE" -gt 0 ]; then
            print_status 0 "$file ($SIZE bytes)"
        else
            print_status 1 "$file is empty"
            ALL_FILES_EXIST=false
        fi
    fi
done

# Step 5: Test module imports
echo -e "\n${YELLOW}Step 5: Testing module imports...${NC}"
node -e "
try {
    require('./dist/config/database.js');
    console.log('✅ Database config import successful');
} catch (error) {
    console.error('❌ Database config import failed:', error.message);
    process.exit(1);
}
"
IMPORT_EXIT_CODE=$?
print_status $IMPORT_EXIT_CODE "Module import test"

# Step 6: Run Docker verification script
echo -e "\n${YELLOW}Step 6: Running Docker verification script...${NC}"
node scripts/verify-docker-build.js
VERIFY_EXIT_CODE=$?
print_status $VERIFY_EXIT_CODE "Docker verification script"

# Cleanup
rm -f tsc-output.log

# Final result
echo -e "\n${YELLOW}========================================${NC}"
if [ $ALL_FILES_EXIST = true ] && [ $IMPORT_EXIT_CODE -eq 0 ] && [ $VERIFY_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}🎉 Docker build test PASSED!${NC}"
    echo -e "${GREEN}🚀 Ready for Docker deployment${NC}"
    exit 0
else
    echo -e "${RED}❌ Docker build test FAILED!${NC}"
    echo -e "${RED}🔧 Please fix the issues above before deploying${NC}"
    exit 1
fi
