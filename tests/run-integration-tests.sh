#!/bin/bash

# Integration Test Runner for Ellen Pedagogical Tools
# This script runs comprehensive integration tests

echo "========================================="
echo "Ellen Pedagogical Tools Integration Tests"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
API_BASE="http://localhost:3002"
TEST_RESULTS_FILE="test-results-$(date +%Y%m%d-%H%M%S).json"

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local method=$2
    local data=$3
    local description=$4
    
    echo -n "Testing: $description... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$API_BASE$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_BASE$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓${NC} (HTTP $http_code)"
        return 0
    else
        echo -e "${RED}✗${NC} (HTTP $http_code)"
        echo "  Response: $body"
        return 1
    fi
}

# Function to test chat with different providers
test_chat_provider() {
    local provider=$1
    local message=$2
    
    echo ""
    echo "Testing $provider provider:"
    echo "------------------------"
    
    # Test basic chat
    test_endpoint "/api/test-chat" "POST" \
        "{\"messages\":[{\"role\":\"user\",\"content\":\"$message\"}],\"provider\":\"$provider\",\"stream\":false}" \
        "Basic chat response"
    
    # Test with context
    test_endpoint "/api/test-chat" "POST" \
        "{\"messages\":[{\"role\":\"user\",\"content\":\"Explain active listening\"},{\"role\":\"assistant\",\"content\":\"Active listening involves...\"},{\"role\":\"user\",\"content\":\"How do I practice it?\"}],\"provider\":\"$provider\",\"stream\":false}" \
        "Contextual conversation"
}

# Function to test Ellen tools
test_ellen_tools() {
    echo ""
    echo "Testing Ellen Pedagogical Tools:"
    echo "--------------------------------"
    
    # Socratic questioning
    test_endpoint "/api/test-chat" "POST" \
        '{"messages":[{"role":"user","content":"Why is empathy important in leadership?"}],"provider":"openai","stream":false}' \
        "Socratic questioning"
    
    # Emotional support
    test_endpoint "/api/test-chat" "POST" \
        '{"messages":[{"role":"user","content":"I am frustrated with my communication skills"}],"provider":"openai","stream":false}' \
        "Emotional support response"
    
    # Practice scenario
    test_endpoint "/api/test-chat" "POST" \
        '{"messages":[{"role":"user","content":"Give me a practice scenario for conflict resolution"}],"provider":"openai","stream":false}' \
        "Practice scenario generation"
    
    # Metacognitive reflection
    test_endpoint "/api/test-chat" "POST" \
        '{"messages":[{"role":"user","content":"I noticed I avoid difficult conversations"}],"provider":"openai","stream":false}' \
        "Metacognitive reflection"
}

# Function to test Growth Compass integration
test_growth_compass() {
    echo ""
    echo "Testing Growth Compass Integration:"
    echo "-----------------------------------"
    
    # Conceptual breakthrough
    test_endpoint "/api/test-chat" "POST" \
        '{"messages":[{"role":"user","content":"I finally understand how to balance assertiveness with empathy!"}],"provider":"openai","stream":false}' \
        "Conceptual breakthrough recognition"
    
    # Skill application
    test_endpoint "/api/test-chat" "POST" \
        '{"messages":[{"role":"user","content":"I used the STAR method in my presentation today"}],"provider":"openai","stream":false}' \
        "Skill application tracking"
    
    # Habit formation
    test_endpoint "/api/test-chat" "POST" \
        '{"messages":[{"role":"user","content":"I have been practicing active listening every morning"}],"provider":"openai","stream":false}' \
        "Habit formation support"
}

# Main test execution
echo "Starting integration tests..."
echo ""

# Check if servers are running
echo "Checking server status:"
echo "----------------------"
if curl -s -f "$API_BASE" > /dev/null; then
    echo -e "${GREEN}✓${NC} Edge API server is running on port 3002"
else
    echo -e "${RED}✗${NC} Edge API server is not running"
    echo "Please start the server with: npm run dev"
    exit 1
fi

# Test each provider
total_tests=0
passed_tests=0

for provider in "openai" "anthropic" "google"; do
    test_chat_provider "$provider" "Hello, can you help me with communication skills?"
    if [ $? -eq 0 ]; then
        ((passed_tests++))
    fi
    ((total_tests++))
done

# Test Ellen-specific features
test_ellen_tools
test_growth_compass

# Summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Total tests run: $total_tests"
echo "Tests passed: $passed_tests"
echo "Tests failed: $((total_tests - passed_tests))"

if [ $passed_tests -eq $total_tests ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}Some tests failed. Please review the output above.${NC}"
    exit 1
fi