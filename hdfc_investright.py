from supabase import create_client
import os
import requests
from datetime import datetime

# -----------------------------
# Config
# -----------------------------
BASE = "https://developer.hdfcsec.com/oapi/v1"
API_KEY = os.getenv("HDFC_API_KEY")
API_SECRET = os.getenv("HDFC_API_SECRET")
USERNAME = os.getenv("HDFC_USERNAME")
PASSWORD = os.getenv("HDFC_PASSWORD")
HEADERS_JSON = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
}

# Initialize Supabase client
# ✅ FIX #1: Use SERVICE_ROLE_KEY instead of ANON key
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
print(f"🔌 Connecting to Supabase: {url}")
print(f"🔑 Using key type: {'SERVICE_ROLE' if os.getenv('SUPABASE_SERVICE_ROLE_KEY') else 'ANON'}")
supabase = create_client(url, key)

MEMBER_NAMES = {
    "equity": "pradeep kumar v",
    "mutualFunds": "sanchita pradeep"
}

def get_member_id_by_name(name, user_id):
    """Look up member ID by name"""
    try:
        result = supabase.table("family_members").select("id").eq("user_id", user_id).ilike("name", name).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]["id"]
        return None
    except Exception as e:
        print(f"Error looking up member {name}: {e}")
        return None

# -----------------------------
# Authentication Flow
# -----------------------------
def get_token_id():
    """Step 1: Get token_id"""
    print(f"➡️ Requesting token_id: {BASE}/login params={{'api_key': '{API_KEY}'}}")
    resp = requests.post(f"{BASE}/login", params={"api_key": API_KEY}, headers=HEADERS_JSON)
    print(f"  Status: {resp.status_code} Body: {resp.text}")
    data = resp.json()
    token_id = data.get("tokenId")
    print(f"  Parsed token_id: {token_id}")
    return token_id

def login_validate(token_id):
    """Step 2: Validate username/password"""
    print("🔐 Calling login_validate")
    url_val = f"{BASE}/login/validate"
    print(f"  URL: {url_val}")
    params = {"api_key": API_KEY, "token_id": token_id}
    print(f"  Params: {params}")
    payload = {"username": USERNAME, "password": PASSWORD}
    print(f"  Payload: {{'username': '{USERNAME}', 'password': '************'}}")
    
    resp = requests.post(url_val, params=params, json=payload, headers=HEADERS_JSON)
    print(f"  Response: {resp.status_code} {resp.text}")
    return resp.json()

def validate_otp(token_id, otp):
    """Step 3: Validate OTP"""
    print("📲 Validating OTP (twofa)")
    url_otp = f"{BASE}/twofa/validate"
    print(f"  URL: {url_otp}")
    params = {"api_key": API_KEY, "token_id": token_id}
    print(f"  Params: {params}")
    payload = {"answer": otp}
    print(f"  Payload: {payload}")
    
    resp = requests.post(url_otp, params=params, json=payload, headers=HEADERS_JSON)
    print(f"  Response: {resp.status_code} {resp.text}")
    resp.raise_for_status()
    return resp.json()

def get_access_token(request_token):
    """Step 4: Get access token from request token"""
    print("🔑 Fetching access token")
    url_access = f"{BASE}/access-token"
    print(f"  URL: {url_access}")
    params = {"api_key": API_KEY, "request_token": request_token}
    print(f"  Params: {params}")
    payload = {"apiSecret": API_SECRET}
    print(f"  Payload: {payload}")
    
    resp = requests.post(url_access, params=params, json=payload, headers=HEADERS_JSON)
    print(f"  Response: {resp.status_code} {resp.text}")
    data = resp.json()
    token = data.get("accessToken")
    print(f"  Parsed access_token: {token}")
    return token

def get_holdings(access_token):
    """Fetch holdings using access token"""
    print("📊 Fetching holdings")
    url_holdings = f"{BASE}/portfolio/holdings"
    print(f"  URL: {url_holdings}")
    headers = {
        "Authorization": f"Bearer {access_token}",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    }
    print(f"  Headers: {headers}")
    params = {"api_key": API_KEY}
    print(f"  Params: {params}")
    
    resp = requests.get(url_holdings, headers=headers, params=params)
    print(f"  ✅ Response received: Status={resp.status_code}")
    print(f"  Response body (first 500 chars): {resp.text[:500]}")
    resp.raise_for_status()
    return resp.json()

# -----------------------------
# Processing Holdings
# -----------------------------
def process_holdings_success(holdings, user_id, broker_platform="HDFC Securities"):
    """Process HDFC holdings and insert into equity_holdings and mutual_fund_holdings tables."""
    inserted_count = 0
    errors = []
    
    print(f"🔄 Processing {len(holdings)} HDFC holdings...")
    
    # Get member IDs
    equity_member_id = get_member_id_by_name(MEMBER_NAMES["equity"], user_id)
    mf_member_id = get_member_id_by_name(MEMBER_NAMES["mutualFunds"], user_id)
    
    print(f"📋 Member IDs: Equity={equity_member_id}, MF={mf_member_id}")
    
    if not equity_member_id and not mf_member_id:
        print("❌ No members found. Please add 'pradeep kumar v' and 'sanchita pradeep' first.")
        return {"inserted": 0, "errors": ["No members found"]}
    
    # Delete old records for today's import
    today = datetime.utcnow().date().isoformat()
    
    if equity_member_id:
        print(f"🗑️ Deleting old equity holdings for {MEMBER_NAMES['equity']} on {today}")
        try:
            del_result = supabase.table("equity_holdings")\
                .delete()\
                .eq("user_id", user_id)\
                .eq("broker_platform", broker_platform)\
                .eq("member_id", equity_member_id)\
                .eq("import_date", today)\
                .execute()
            print(f"   Deleted {len(del_result.data) if del_result.data else 0} equity records")
        except Exception as e:
            print(f"   Delete error (non-fatal): {e}")
    
    if mf_member_id:
        print(f"🗑️ Deleting old MF holdings for {MEMBER_NAMES['mutualFunds']} on {today}")
        try:
            del_result = supabase.table("mutual_fund_holdings")\
                .delete()\
                .eq("user_id", user_id)\
                .eq("broker_platform", broker_platform)\
                .eq("member_id", mf_member_id)\
                .eq("import_date", today)\
                .execute()
            print(f"   Deleted {len(del_result.data) if del_result.data else 0} MF records")
        except Exception as e:
            print(f"   Delete error (non-fatal): {e}")
    
    # Process each holding
    for h in holdings:
        try:
            company_name = h.get("company_name") or h.get("scheme_name", "Unknown")
            quantity = float(h.get("quantity") or h.get("units") or 0)
            avg_price = float(h.get("average_price") or h.get("avg_price") or 0)
            close_price = float(h.get("close_price") or h.get("ltp") or h.get("nav") or 0)
            
            invested_amount = quantity * avg_price if quantity and avg_price else 0
            current_value = quantity * close_price if quantity and close_price else invested_amount
            
            is_mf = h.get("sip_indicator") == "Y" or "fund" in company_name.lower()
            
            print(f"📊 {company_name}: qty={quantity}, avg={avg_price}, close={close_price}")
            print(f"   💰 Invested={invested_amount}, Current={current_value}")
            
            if is_mf and mf_member_id:
                # Insert into mutual_fund_holdings
                new_row = {
                    "user_id": user_id,
                    "member_id": mf_member_id,
                    "broker_platform": broker_platform,
                    "scheme_name": company_name,
                    "scheme_code": h.get("security_id") or "",
                    "folio_number": "",
                    "fund_house": "",
                    "units": quantity,
                    "average_nav": avg_price,
                    "current_nav": close_price,
                    "invested_amount": round(invested_amount, 2),
                    "current_value": round(current_value, 2),
                    "import_date": today
                }
                
                resp = supabase.table("mutual_fund_holdings").insert(new_row).execute()
                
                # ✅ FIX #2: Better error checking
                if resp.data:
                    inserted_count += 1
                    print(f"✅ Inserted MF {company_name}: ₹{invested_amount:.2f} → ₹{current_value:.2f}")
                else:
                    error_msg = str(getattr(resp, 'error', 'Unknown error'))
                    print(f"❌ Insert failed for MF {company_name}: {error_msg}")
                    errors.append(f"{company_name}: {error_msg}")
                    continue
                    
            elif not is_mf and equity_member_id:
                # Insert into equity_holdings
                new_row = {
                    "user_id": user_id,
                    "member_id": equity_member_id,
                    "broker_platform": broker_platform,
                    "symbol": h.get("security_id") or company_name[:10].upper(),
                    "company_name": company_name,
                    "quantity": quantity,
                    "average_price": avg_price,
                    "current_price": close_price,
                    "invested_amount": round(invested_amount, 2),
                    "current_value": round(current_value, 2),
                    "import_date": today
                }
                
                resp = supabase.table("equity_holdings").insert(new_row).execute()
                
                # ✅ FIX #3: Better error checking
                if resp.data:
                    inserted_count += 1
                    print(f"✅ Inserted equity {company_name}: ₹{invested_amount:.2f} → ₹{current_value:.2f}")
                else:
                    error_msg = str(getattr(resp, 'error', 'Unknown error'))
                    print(f"❌ Insert failed for equity {company_name}: {error_msg}")
                    errors.append(f"{company_name}: {error_msg}")
                    continue
            else:
                print(f"⚠️ Skipping {company_name} - no matching member")
                
        except Exception as e:
            msg = f"{company_name} error: {e}"
            errors.append(msg)
            print(f"❌ {msg}")
            import traceback
            traceback.print_exc()
    
    print(f"📈 Summary: {inserted_count}/{len(holdings)} holdings processed")
    return {"inserted": inserted_count, "errors": errors}

# -----------------------------
# Main Flow for Flask
# -----------------------------
def do_full_flow(username, password, otp, user_id):
    """
    Full flow: get token_id, login_validate, validate_otp, get access_token, fetch holdings.
    Returns (success, result_or_error_dict).
    """
    try:
        token_id = get_token_id()
        login_result = login_validate(token_id)
        print(f"Login validate response: {login_result}")
        
        otp_result = validate_otp(token_id, otp)
        request_token = otp_result.get("requestToken")
        
        if not request_token:
            return (False, {"error": "No requestToken in OTP response"})
        
        # Try direct request_token as Bearer first
        print("\n📡 STEP 1: Trying request_token directly...")
        try:
            holdings_data = get_holdings(request_token)
            if holdings_data.get("status") == "success" and holdings_data.get("data"):
                print("✅ SUCCESS with request_token")
                process_result = process_holdings_success(holdings_data["data"], user_id)
                return (True, process_result)
        except Exception as e:
            print(f"❌ Direct request_token failed: {e}")
        
        # Fall back to access_token flow
        print("\n🔐 STEP 2: Fetching access_token...")
        access_token = get_access_token(request_token)
        print(f"✅ Access token received: {access_token[:50]}...")
        
        print("📡 Fetching holdings with access_token...")
        holdings_data = get_holdings(access_token)
        
        if holdings_data.get("status") == "success" and holdings_data.get("data"):
            print("✅ SUCCESS with access_token")
            print("\n📦 Processing holdings data...")
            print(f"✅ Received {len(holdings_data['data'])} holdings from HDFC API")
            print(f"\n📊 Sample holding:\n   {holdings_data['data'][0] if holdings_data['data'] else 'No data'}")
            
            print("\n💾 Saving to Supabase...")
            process_result = process_holdings_success(holdings_data["data"], user_id)
            
            return (True, process_result)
        else:
            return (False, {"error": "Invalid holdings data", "raw": holdings_data})
            
    except Exception as e:
        import traceback
        return (False, {"error": str(e), "traceback": traceback.format_exc()})
