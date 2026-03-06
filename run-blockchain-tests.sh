#!/bin/bash

# Comprehensive Blockchain Test Runner
# Runs all blockchain-related tests across the full stack

set -e  # Exit on any error

echo "🚀 Starting Comprehensive Blockchain Test Suite"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
BACKEND_PORT=${TEST_BACKEND_PORT:-3001}
SOLANA_RPC_URL=${SOLANA_RPC_URL:-"http://localhost:8899"}
DATABASE_URL=${DATABASE_URL:-""}

echo -e "${BLUE}Configuration:${NC}"
echo "- Backend Port: $BACKEND_PORT"
echo "- Solana RPC: $SOLANA_RPC_URL"
echo "- Database: ${DATABASE_URL:-"Mock Mode"}"
echo ""

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $name is not running${NC}"
        return 1
    fi
}

# Function to run test suite
run_test_suite() {
    local name=$1
    local command=$2
    local directory=$3
    
    echo -e "\n${YELLOW}📋 Running $name${NC}"
    echo "----------------------------------------"
    
    if [ -n "$directory" ]; then
        cd "$directory"
    fi
    
    if eval "$command"; then
        echo -e "${GREEN}✅ $name PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $name FAILED${NC}"
        return 1
    fi
}

# Track test results
PASSED_TESTS=0
FAILED_TESTS=0
TOTAL_TESTS=0

# Test 1: Solana Smart Contract Tests (Anchor)
echo -e "\n${BLUE}🔗 LAYER 1: Solana Smart Contract Tests${NC}"
if run_test_suite "Anchor Integration Tests" "anchor test" "contracts"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Test 2: Backend API Tests (Rust)
echo -e "\n${BLUE}🖥️  LAYER 2: Backend API Tests${NC}"

# Check if backend is running, start if needed
if ! check_service "http://localhost:$BACKEND_PORT/api/health" "Backend"; then
    echo "Starting backend server..."
    cd backend
    cargo run &
    BACKEND_PID=$!
    sleep 5
    cd ..
    
    if ! check_service "http://localhost:$BACKEND_PORT/api/health" "Backend"; then
        echo -e "${RED}Failed to start backend server${NC}"
        exit 1
    fi
else
    BACKEND_PID=""
fi

if run_test_suite "Backend Integration Tests" "cargo test --test api_tests" "backend"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Test 3: Frontend Tests (Next.js/React)
echo -e "\n${BLUE}🌐 LAYER 3: Frontend Tests${NC}"
if run_test_suite "Frontend Unit Tests" "npm test -- --watchAll=false" "frontend"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Test 4: Cross-Layer Integration Tests
echo -e "\n${BLUE}🔄 INTEGRATION: Cross-Layer Tests${NC}"
if run_test_suite "Full Stack Integration" "npm test blockchain-flow.test.js" "integration-tests"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Test 5: Blockchain Edge Cases (Additional Anchor Tests)
echo -e "\n${BLUE}⚠️  EDGE CASES: Blockchain Validation${NC}"
if run_test_suite "Edge Case Validation" "anchor test --grep 'edge|precision|vault|claim'" "contracts"; then
    ((PASSED_TESTS++))
else
    ((FAILED_TESTS++))
fi
((TOTAL_TESTS++))

# Cleanup
if [ -n "$BACKEND_PID" ]; then
    echo "Stopping backend server..."
    kill $BACKEND_PID 2>/dev/null || true
fi

# Final Results
echo -e "\n${BLUE}📊 TEST RESULTS SUMMARY${NC}"
echo "=============================================="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL BLOCKCHAIN TESTS PASSED!${NC}"
    echo -e "${GREEN}The blockchain flow is fully validated across all layers.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi