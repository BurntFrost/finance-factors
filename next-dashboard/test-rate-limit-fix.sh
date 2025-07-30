#!/bin/bash

echo "🧪 Testing Rate Limit Handling Fixes..."
echo ""

BASE_URL="http://localhost:3000"

# Test endpoints
endpoints=(
    "house-prices"
    "unemployment-rate" 
    "salary-income"
    "cost-of-living"
)

echo "📊 Test 1: Fetching data from multiple endpoints..."
echo ""

live_count=0
fallback_count=0
error_count=0

for endpoint in "${endpoints[@]}"; do
    echo "   Fetching: $endpoint"

    response=$(curl -s -X POST "$BASE_URL/api/proxy/data" \
        -H "Content-Type: application/json" \
        -d "{\"dataType\":\"$endpoint\"}" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # Check if response contains success field
        if echo "$response" | grep -q '"success":true'; then
            source=$(echo "$response" | grep -o '"source":"[^"]*"' | cut -d'"' -f4)
            echo "   ✅ $endpoint: SUCCESS - Source: $source"
            
            if echo "$source" | grep -q -i "historical\|fallback"; then
                ((fallback_count++))
            else
                ((live_count++))
            fi
        else
            error_msg=$(echo "$response" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
            echo "   ❌ $endpoint: FAILED - Error: $error_msg"
            ((error_count++))
        fi
    else
        echo "   ❌ $endpoint: NETWORK ERROR"
        ((error_count++))
    fi
    
    # Small delay between requests
    sleep 0.5
done

echo ""
echo "📈 Results Analysis:"
echo "   Total endpoints tested: ${#endpoints[@]}"
echo "   Live data responses: $live_count"
echo "   Fallback data responses: $fallback_count"
echo "   Error responses: $error_count"

echo ""
echo "🚀 Test 2: Rapid requests to test rate limit handling..."
echo ""

# Make 3 rapid requests to the same endpoint
for i in {1..3}; do
    echo "   Request $i:"
    response=$(curl -s -X POST "$BASE_URL/api/proxy/data" \
        -H "Content-Type: application/json" \
        -d "{\"dataType\":\"house-prices\"}" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q '"success":true'; then
            source=$(echo "$response" | grep -o '"source":"[^"]*"' | cut -d'"' -f4)
            echo "     ✅ SUCCESS - Source: $source"
        else
            error_msg=$(echo "$response" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
            echo "     ❌ FAILED - Error: $error_msg"
        fi
    else
        echo "     ❌ NETWORK ERROR"
    fi
done

echo ""
echo "🎯 Test Summary:"
if [ $live_count -gt 0 ]; then
    echo "   ✅ SUCCESS: System is using live data from working APIs"
    echo "   🔧 Rate limit handling appears to be working - live data is being served"
else
    echo "   ⚠️  WARNING: All responses are using historical/fallback data"
    echo "   🔍 This could indicate rate limiting on all providers or API issues"
fi

echo ""
echo "💡 To see detailed logging, check the browser console at http://localhost:3000"
echo "   Look for messages like:"
echo "   - '✅ Parallel fetch succeeded for [dataType] using [provider]'"
echo "   - '🚫 Provider [provider] rate-limited'"
echo "   - '❌ All [N] providers failed for [dataType]'"
echo ""
echo "✨ Rate limit handling test completed!"
