#!/bin/bash
# Simple script to query Supabase for a user_id

SUPABASE_URL="${VITE_SUPABASE_URL}"
SUPABASE_KEY="${VITE_SUPABASE_ANON_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ SUPABASE_URL and SUPABASE_KEY environment variables must be set"
    echo ""
    echo "Current values:"
    echo "SUPABASE_URL: ${SUPABASE_URL:-not set}"
    echo "SUPABASE_KEY: ${SUPABASE_KEY:-not set}"
    exit 1
fi

echo "🔍 Querying Supabase for user_id..."
echo "URL: $SUPABASE_URL"
echo ""

# Query family_members table
response=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/get_user_id_helper" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" 2>&1)

# Try direct query instead
response=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/family_members?select=user_id&limit=1" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" 2>&1)

echo "Response: $response"
echo ""

# Try to extract user_id from JSON response
user_id=$(echo "$response" | grep -o '"user_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$user_id" ]; then
    echo "✅ Found user_id: $user_id"
    echo ""
    echo "Add this to your Render environment variables:"
    echo "DEFAULT_USER_ID=$user_id"
else
    echo "❌ Could not find user_id in response"
    echo ""
    echo "Response was: $response"
    echo ""
    echo "Please manually query your Supabase database:"
    echo "SELECT user_id FROM family_members LIMIT 1;"
fi
