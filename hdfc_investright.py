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
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

MEMBERS = {
    "equity": "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49",
    "mutualFunds": "d3a4fc84-a94b-494d-915f-60901f16d973"
}

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
    Process HDFC Securities holdings into:
        - equity_holdings
        - mutual_fund_holdings
    """

    equity_records = []
    mf_records = []

    import_date = datetime.utcnow().date().isoformat()

    print(f"🔄 Processing {len(holdings)} holdings for user {user_id}")

    for h in holdings:
        try:
            security_id = (h.get("security_id") or "").lower()

            # Determine type (Option A logic)
            if "fund" in security_id or "mf" in security_id:
                holding_type = "mutualFunds"
                member_id = hdfc_member_ids["mutualFunds"]
            else:
                holding_type = "equity"
                member_id = hdfc_member_ids["equity"]

            # ---------------------
            # EQUITY
            # ---------------------
            if holding_type == "equity":
                equity_records.append({
                    "user_id": user_id,
                    "member_id": member_id,
                    "broker_platform": "HDFC Securities",
                    "symbol": h.get("security_id", "UNKNOWN"),
                    "company_name": h.get("company_name", "UNKNOWN"),
                    "sector_name": h.get("sector_name", ""),
                    "isin": h.get("isin", ""),
                    "quantity": float(h.get("quantity") or 0),
                    "average_price": float(h.get("average_price") or 0),
                    "current_price": float(h.get("close_price") or 0),
                    "invested_amount": float(h.get("investment_value") or 0),
                    "current_value": float(h.get("quantity") or 0) * float(h.get("close_price") or 0),
                    "import_date": import_date
                })

            # ---------------------
            # MUTUAL FUNDS
            # ---------------------
            else:
                mf_records.append({
                    "user_id": user_id,
                    "member_id": member_id,
                    "broker_platform": "HDFC Securities",
                    "scheme_name": h.get("company_name", "Unknown"),
                    "scheme_code": h.get("security_id", ""),
                    "units": float(h.get("quantity") or 0),
                    "average_nav": float(h.get("average_price") or 0),
                    "current_nav": float(h.get("close_price") or 0),
                    "invested_amount": float(h.get("investment_value") or 0),
                    "current_value": float(h.get("quantity") or 0) * float(h.get("close_price") or 0),
                    "import_date": import_date
                })

        except Exception as e:
            print(f"❌ Error processing holding: {e}")
            continue

    # --------------
    # DELETE OLD DATA
    # --------------
    print("🗑️ Deleting old HDFC holdings...")

    supabase.table("equity_holdings").delete().match({
        "user_id": user_id,
        "broker_platform": "HDFC Securities"
    }).execute()

    supabase.table("mutual_fund_holdings").delete().match({
        "user_id": user_id,
        "broker_platform": "HDFC Securities"
    }).execute()

    # --------------
    # INSERT NEW
    # --------------
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

def deep_flatten(items):
    """Recursively flatten lists inside lists."""
    flat = []
    for item in items:
        if isinstance(item, list):
            flat.extend(deep_flatten(item))
        else:
            flat.append(item)
    return flat


def normalize_holdings(raw):
    """Ensure we always return a flat list of dicts."""
    if isinstance(raw, dict):
        # If API gave a dict instead of list
        raw = [raw]

    if isinstance(raw, list):
        return deep_flatten(raw)

    print("❌ Unknown holdings structure:", raw)
    return []


def parse_holding(h):
    try:
        return {
            "name": h.get("company_name", ""),
            "isin": h.get("isin"),
            "sector": h.get("sector_name", ""),
            "quantity": float(h.get("quantity", 0)),
            "avg_price": float(h.get("average_price", 0)),
            "close_price": float(h.get("close_price", 0)),
            "investment_value": float(h.get("investment_value", 0)),
            "pnl": float(h.get("pnl", 0)),
            "ltcg_qty": float(h.get("ltcg_quantity", 0)),
            "sip": h.get("sip_indicator", "N") == "Y",
            "type": "MF" if h.get("sip_indicator") == "Y" else "EQ"
        }

    except Exception as e:
        print("⚠️ Error parsing holding:", e, h)
        return None


# ---------- MAIN LOGIC ----------

raw = holdings_json.get("holdings", [])
cleaned = normalize_holdings(raw)

parsed_holdings = []

for h in cleaned:
    if not isinstance(h, dict):
        print("⚠️ Skipped non-dict item:", h)
        continue

    parsed = parse_holding(h)
    if parsed:
        parsed_holdings.append(parsed)


