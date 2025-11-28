from supabase import create_client
import os
import requests
from datetime import datetime

# ✅ CORRECTED: Match the environment variables you already set in Render

import os
import requests
from datetime import datetime
from supabase import create_client

# ============================================================
# Config - CORRECTED TO MATCH YOUR RENDER ENV VARIABLES
# ============================================================
BASE = "https://developer.hdfcsec.com/oapi/v1"

# ✅ API Keys - these are already set in Render
API_KEY = os.getenv("HDFC_API_KEY")
API_SECRET = os.getenv("HDFC_API_SECRET")
USERNAME = os.getenv("HDFC_USERNAME")
PASSWORD = os.getenv("HDFC_PASSWORD")

# ✅ FIXED: Use the environment variable names you ACTUALLY set in Render
HDFC_AUTH_URL = os.getenv("HDFC_AUTH_URL", f"{BASE}/login")
HDFC_TOKEN_EXCHANGE_URL = os.getenv("HDFC_TOKEN_EXCHANGE_URL", f"{BASE}/access-token")
HDFC_HOLDINGS_URL = os.getenv("HDFC_HOLDINGS_URL", f"{BASE}/portfolio/holdings")

# Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

MEMBERS = {
    "equity": "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49",
    "mutualFunds": "d3a4fc84-a94b-494d-915f-60901f16d973"
}

HEADERS_JSON = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}

# ============================================================
# Validation - Check all required variables are set
# ============================================================
print("=" * 70)
print("🔍 CHECKING ENVIRONMENT VARIABLES")
print("=" * 70)

errors = []

if not API_KEY:
    errors.append("❌ HDFC_API_KEY not set")
else:
    print(f"✅ HDFC_API_KEY: {API_KEY[:8]}...")

if not API_SECRET:
    errors.append("❌ HDFC_API_SECRET not set")
else:
    print(f"✅ HDFC_API_SECRET: {API_SECRET[:8]}...")

if not USERNAME:
    errors.append("❌ HDFC_USERNAME not set")
else:
    print(f"✅ HDFC_USERNAME: {USERNAME}")

if not PASSWORD:
    errors.append("❌ HDFC_PASSWORD not set")
else:
    print(f"✅ HDFC_PASSWORD: {'*' * len(PASSWORD)}")

if not HDFC_AUTH_URL:
    errors.append("❌ HDFC_AUTH_URL not set")
else:
    print(f"✅ HDFC_AUTH_URL: {HDFC_AUTH_URL}")

if not HDFC_TOKEN_EXCHANGE_URL:
    errors.append("❌ HDFC_TOKEN_EXCHANGE_URL not set")
else:
    print(f"✅ HDFC_TOKEN_EXCHANGE_URL: {HDFC_TOKEN_EXCHANGE_URL}")

if not HDFC_HOLDINGS_URL:
    errors.append("❌ HDFC_HOLDINGS_URL not set")
else:
    print(f"✅ HDFC_HOLDINGS_URL: {HDFC_HOLDINGS_URL}")

if not url:
    errors.append("❌ SUPABASE_URL not set")
else:
    print(f"✅ SUPABASE_URL: {url[:30]}...")

if not key:
    errors.append("❌ SUPABASE_KEY not set")
else:
    print(f"✅ SUPABASE_KEY: {key[:8]}...")

print("=" * 70)

if errors:
    print("\n❌ ERRORS FOUND:")
    for error in errors:
        print(f"   {error}")
    print("\n" + "=" * 70)
    raise RuntimeError("Missing required environment variables: " + ", ".join(errors))
else:
    print("✅ ALL ENVIRONMENT VARIABLES ARE CORRECTLY SET!")
    print("=" * 70)

# ============================================================
# Helper Functions
# ============================================================

def get_token_id():
    """Request a token_id from HDFC (initial step)."""
    if not API_KEY:
        raise RuntimeError("API_KEY not set")
    
    url = f"{BASE}/login"
    params = {"api_key": API_KEY}
    
    print(f"🔄 Requesting token_id from: {url}")
    print(f"🔐 Using API Key: {API_KEY[:8]}...")
    
    try:
        r = requests.get(url, params=params, timeout=30)
        print(f"   Status: {r.status_code}")
        print(f"   Response: {r.text[:200]}")
        
        r.raise_for_status()
        data = r.json()
        token_id = data.get("tokenId") or data.get("token_id")
        
        if not token_id:
            raise ValueError(f"Could not extract token_id from response: {data}")
        
        print(f"✅ Got token_id: {token_id[:10]}...")
        return token_id
        
    except requests.exceptions.Timeout:
        raise RuntimeError("HDFC API timeout - server not responding")
    except requests.exceptions.ConnectionError as e:
        raise RuntimeError(f"Failed to connect to HDFC: {str(e)}")
    except Exception as e:
        raise RuntimeError(f"Failed to get token_id: {str(e)}")

def login_validate(token_id, username, password):
    url = f"{BASE}/login/validate"
    params = {"api_key": API_KEY, "token_id": token_id}
    payload = {"username": username, "password": password}
    
    print(f"🔐 Calling login_validate")
    print(f"   URL: {url}")
    
    r = requests.post(url, params=params, json=payload, headers=HEADERS_JSON)
    print(f"   Status: {r.status_code}")
    print(f"   Response: {r.text[:200]}")
    
    r.raise_for_status()
    
    if not r.text or r.text.strip() == "":
        return {"status": "success", "message": "Login validated"}
    
    try:
        return r.json()
    except ValueError:
        if r.status_code == 200:
            return {"status": "success", "message": "Login validated"}
        raise ValueError(f"Invalid JSON response from HDFC: {r.text[:200]}")

def validate_otp(token_id, otp):
    url = f"{BASE}/twofa/validate"
    params = {"api_key": API_KEY, "token_id": token_id}
    payload = {"answer": otp}
    
    print(f"📲 Validating OTP")
    print(f"   URL: {url}")
    
    try:
        resp = requests.post(url, params=params, json=payload, headers=HEADERS_JSON)
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return {"error": "network_failure", "details": str(e)}
    
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {resp.text[:200]}")
    
    if resp.status_code >= 400:
        return {"error": "http_error", "status": resp.status_code, "details": resp.text}
    
    try:
        data = resp.json()
    except Exception as e:
        print(f"❌ JSON parse failed: {e}")
        return {"error": "invalid_json", "status": resp.status_code, "raw": resp.text}
    
    return data

def fetch_access_token(token_id, request_token):
    """Exchange request_token for access_token."""
    url = HDFC_TOKEN_EXCHANGE_URL
    params = {"api_key": API_KEY, "request_token": request_token}
    payload = {"apiSecret": API_SECRET}
    
    print(f"🔑 Fetching access token")
    print(f"   URL: {url}")
    print(f"   Using: {API_KEY[:8]}... / {API_SECRET[:8]}...")
    
    resp = requests.post(url, params=params, json=payload, headers=HEADERS_JSON)
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {resp.text[:200]}")
    
    resp.raise_for_status()
    data = resp.json()
    access_token = data.get("accessToken")
    
    if not access_token:
        raise ValueError(f"Could not extract accessToken from response: {data}")
    
    print(f"✅ Got access token: {access_token[:10]}...")
    return access_token

def get_holdings(access_token):
    """Fetch holdings using access token."""
    url = HDFC_HOLDINGS_URL
    headers = {
        "Authorization": f"Bearer {access_token}",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
    
    print(f"📊 Fetching holdings")
    print(f"   URL: {url}")
    
    resp = requests.get(
        url,
        params={"api_key": API_KEY, "login_id": USERNAME},
        headers=headers
    )
    
    print(f"   Status: {resp.status_code}")
    print(f"   Response: {resp.text[:200]}")
    
    resp.raise_for_status()
    return resp.json()

# -----------------------------
# Helper Functions
# -----------------------------

def get_token_id():
    url = f"{BASE}/login"
    params = {"api_key": API_KEY}
    print(f"➡️ Requesting token_id: {url} params={params}")
    r = requests.get(url, params=params)
    print("  Status:", r.status_code, "Body:", r.text)
    r.raise_for_status()
    data = r.json()
    token_id = data.get("tokenId") or data.get("token_id")
    print("  Parsed token_id:", token_id)
    if not token_id:
        raise ValueError(f"Could not extract token_id from response: {data}")
    return token_id

def login_validate(token_id, username, password):
    url = f"{BASE}/login/validate"
    params = {"api_key": API_KEY, "token_id": token_id}
    payload = {"username": username, "password": password}
    safe_password = "*" * len(password) if password else None
    print("🔐 Calling login_validate")
    print("  URL:", url)
    print("  Params:", params)
    print("  Payload:", {"username": username, "password": safe_password})
    r = requests.post(url, params=params, json=payload, headers=HEADERS_JSON)
    print("  Response:", r.status_code, r.text)
    r.raise_for_status()

    # Handle empty or non-JSON responses
    if not r.text or r.text.strip() == "":
        print("  ⚠️ Empty response from HDFC API")
        return {"status": "success", "message": "Login validated, awaiting OTP"}

    try:
        return r.json()
    except ValueError as e:
        print(f"  ⚠️ Non-JSON response: {r.text[:200]}")
        # Return a success indicator if status is 200
        if r.status_code == 200:
            return {"status": "success", "message": "Login validated"}
        raise ValueError(f"Invalid JSON response from HDFC: {r.text[:200]}")

def validate_otp(token_id, otp):
    url = f"{BASE}/twofa/validate"
    params = {"api_key": API_KEY, "token_id": token_id}
    payload = {"answer": otp}

    print("📲 Validating OTP (twofa)")
    print("  URL:", url)
    print("  Params:", params)
    print("  Payload:", payload)

    try:
        resp = requests.post(url, params=params, json=payload, headers=HEADERS_JSON)
    except Exception as e:
        print("❌ Request failed:", e)
        return {"error": "network_failure", "details": str(e)}

    print("🔍 RAW RESPONSE:", resp.status_code, resp.text)

    # Handle HTTP errors gracefully
    if resp.status_code >= 400:
        return {"error": "http_error", "status": resp.status_code, "details": resp.text}

    # Handle non-JSON response
    try:
        data = resp.json()
    except Exception as e:
        print("❌ JSON PARSE FAILED:", e)
        return {
            "error": "invalid_json",
            "status": resp.status_code,
            "raw": resp.text
        }

    return data


def authorise(token_id, request_token, consent="Y"):
    url = f"{BASE}/authorise"
    params = {
        "api_key": API_KEY,
        "token_id": token_id,
        "request_token": request_token,
        "consent": consent
    }
    print("🔑 Authorising session")
    print("  URL:", url)
    print("  Params:", params)
    resp = requests.post(url, params=params, headers=HEADERS_JSON)
    print("  Response:", resp.status_code, resp.text)
    resp.raise_for_status()
    return resp.json()

def fetch_access_token(token_id, request_token):
    # CORRECT URL: access-token (with hyphen)
    url = f"{BASE}/access-token"
    
    # Use query parameters as shown in curl
    params = {
        "api_key": API_KEY,
        "request_token": request_token
    }
    
    # CORRECT payload: apiSecret (camelCase)
    payload = {
        "apiSecret": API_SECRET
    }
    
    print("🔑 Fetching access token")
    print("  URL:", url)
    print("  Params:", params)
    print("  Payload:", payload)
    
    resp = requests.post(url, params=params, json=payload, headers=HEADERS_JSON)
    print("  Response:", resp.status_code, resp.text)
    resp.raise_for_status()
    
    data = resp.json()
    # Response key is "accessToken" (camelCase)
    access_token = data.get("accessToken")
    print("  Parsed access_token:", access_token)
    if not access_token:
        raise ValueError(f"Could not extract accessToken from response: {data}")
    return access_token

def get_holdings(access_token):
    url = f"{BASE}/portfolio/holdings"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    }
    print("📊 Fetching holdings")
    print("  URL:", url)
    print("  Headers:", headers)
   # resp = requests.get(url, params={"api_key": API_KEY}, headers=headers)
    resp = requests.get(
    url,
    params={
        "api_key": API_KEY,
        "login_id": USERNAME   # <-- REQUIRED BY HDFC
    },
    headers=headers
)

    print("  Response:", resp.status_code, resp.text)
    resp.raise_for_status()
    return resp.json()

def get_holdings_with_fallback(request_token, token_id):
    """
    Try different ways to authenticate with holdings API
    """
    url = f"{BASE}/portfolio/holdings"
    
    # Different auth methods to try
    auth_methods = [
        # Method 1: Authorization header with request_token
        {
            "headers": {"Authorization": f"Bearer {request_token}"},
       #     "params": {"api_key": API_KEY}
            "params": {"api_key": API_KEY, "login_id": USERNAME}

        },
        # Method 2: Authorization header without Bearer
        {
            "headers": {"Authorization": request_token},
            "params": {"api_key": API_KEY}
        },
        # Method 3: Pass request_token as query parameter
        {
            "headers": {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"},
            "params": {"api_key": API_KEY, "request_token": request_token}
        },
        # Method 4: Pass both token_id and request_token
        {
            "headers": {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"},
            "params": {"api_key": API_KEY, "token_id": token_id, "request_token": request_token}
        },
        # Method 5: Custom header
        {
            "headers": {"X-Auth-Token": request_token, "User-Agent": "Mozilla/5.0"},
            "params": {"api_key": API_KEY}
        }
    ]
    
    print("📊 Trying multiple holdings authentication methods...")
    
    for i, method in enumerate(auth_methods, 1):
        try:
            print(f"  Method {i}: {method}")
            resp = requests.get(url, headers=method["headers"], params=method["params"])
            print(f"  Response {i}: {resp.status_code} - {resp.text[:100]}")
            
            if resp.status_code == 200:
                print(f"✅ Success with method {i}!")
                return resp.json()
                
        except Exception as e:
            print(f"  Method {i} error: {e}")
            continue
    
    # If all methods fail, raise the last error
    raise Exception(f"All {len(auth_methods)} authentication methods failed for holdings")

def resend_2fa(token_id):
    url = f"{BASE}/twofa/resend"
    params = {"api_key": API_KEY, "token_id": token_id}
    print("🔁 Resending 2FA OTP")
    print("  URL:", url)
    print("  Params:", params)
    resp = requests.post(url, params=params, headers=HEADERS_JSON)
    print("  Response:", resp.status_code, resp.text)
    resp.raise_for_status()
    return resp.json()
    
def process_holdings_success(holdings, user_id, hdfc_member_ids):
    """
    Process HDFC holdings and insert into:
        - equity_holdings
        - mutual_fund_holdings
    """

    equity_records = []
    mf_records = []

    import_date = datetime.utcnow().date().isoformat()

    print(f"🔄 Processing {len(holdings)} holdings for user {user_id}")

    for h in holdings:
        try:
            investment_type = h.get("investment_type", "").lower()

            # ------ EQUITY HOLDINGS ------
            if investment_type == "equity":
                equity_records.append({
                    "user_id": user_id,
                    "member_id": hdfc_member_ids["equity"],
                    "broker_platform": "HDFC Securities",
                    "symbol": h.get("tradingsymbol") or h.get("symbol") or "UNKNOWN",
                    "company_name": h.get("tradingsymbol") or h.get("symbol") or "UNKNOWN",
                    "quantity": float(h.get("quantity") or 0),
                    "average_price": float(h.get("averageprice") or 0),
                    "current_price": float(h.get("lastprice") or 0),
                    "invested_amount": (float(h.get("quantity") or 0) *
                                        float(h.get("averageprice") or 0)),
                    "current_value": (float(h.get("quantity") or 0) *
                                      float(h.get("lastprice") or 0)),
                    "import_date": import_date,
                })

            # ------ MUTUAL FUND HOLDINGS ------
            elif investment_type == "mutualfunds":
                mf_records.append({
                    "user_id": user_id,
                    "member_id": hdfc_member_ids["mutualFunds"],
                    "broker_platform": "HDFC Securities",
                    "scheme_name": h.get("schemename") or "Unknown",
                    "scheme_code": h.get("schemecode") or "",
                    "folio_number": h.get("folionumber") or "",
                    "fund_house": h.get("fundhouse") or "Unknown",
                    "units": float(h.get("units") or 0),
                    "average_nav": float(h.get("averagenav") or 0),
                    "current_nav": float(h.get("nav") or 0),
                    "invested_amount": (float(h.get("units") or 0) *
                                        float(h.get("averagenav") or 0)),
                    "current_value": (float(h.get("units") or 0) *
                                      float(h.get("nav") or 0)),
                    "import_date": import_date,
                })

        except Exception as e:
            print(f"❌ Error processing holding: {e}")
            continue

    # ----------------------------------------
    # DELETE OLD HOLDINGS BEFORE INSERTION
    # ----------------------------------------
    print("🗑️ Deleting old HDFC holdings...")

    supabase.table("equity_holdings").delete().match({
        "user_id": user_id,
        "broker_platform": "HDFC Securities",
        "member_id": hdfc_member_ids["equity"]
    }).execute()

    supabase.table("mutual_fund_holdings").delete().match({
        "user_id": user_id,
        "broker_platform": "HDFC Securities",
        "member_id": hdfc_member_ids["mutualFunds"]
    }).execute()

    # ----------------------------------------
    # INSERT NEW HOLDINGS
    # ----------------------------------------
    if equity_records:
        print(f"📥 Inserting {len(equity_records)} equity holdings...")
        supabase.table("equity_holdings").insert(equity_records).execute()

    if mf_records:
        print(f"📥 Inserting {len(mf_records)} mutual fund holdings...")
        supabase.table("mutual_fund_holdings").insert(mf_records).execute()

    print("✅ HDFC holdings imported successfully")

    return {
        "equity": len(equity_records),
        "mutualFunds": len(mf_records)
    }
