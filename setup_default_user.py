"""
Script to create a default user in Supabase for testing purposes.
This is a workaround until proper authentication is implemented.
"""
from supabase import create_client
import os
import sys

# Initialize Supabase client
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("❌ SUPABASE_URL and SUPABASE_KEY must be set")
    sys.exit(1)

supabase = create_client(url, key)

# Create a test user (this requires service role key)
# For now, we'll just query existing users and use the first one
try:
    # Try to get family members to find existing user_id
    response = supabase.table("family_members").select("user_id").limit(1).execute()

    if response.data and len(response.data) > 0:
        user_id = response.data[0]["user_id"]
        print(f"✅ Found existing user_id: {user_id}")
        print(f"\nAdd this to your .env file:")
        print(f"DEFAULT_USER_ID={user_id}")
    else:
        print("❌ No family members found in database")
        print("Please create a family member first or provide a valid user_id")

except Exception as e:
    print(f"❌ Error querying database: {e}")
    print("\nNote: You need to provide a DEFAULT_USER_ID in your environment")
    print("This should be the UUID of a valid user in the auth.users table")
