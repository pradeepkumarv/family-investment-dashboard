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
    return r.json()

def validate_otp(token_id, otp):
    url = f"{BASE}/twofa/validate"
    params = {"api_key": API_KEY, "token_id": token_id}
    payload = {"answer": otp}
    print("📲 Validating OTP (twofa)")
    print("  URL:", url)
    print("  Params:", params)
    print("  Payload:", payload)
    resp = requests.post(url, params=params, json=payload, headers=HEADERS_JSON)
    print("  Response:", resp.status_code, resp.text)
    resp.raise_for_status()
    return resp.json()

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
    resp = requests.get(url, params={"api_key": API_KEY}, headers=headers)
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
            "params": {"api_key": API_KEY}
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
    
def process_holdings_success(holdings, user_id, broker_platform="HDFC Securities"):
    """Process HDFC holdings and insert into new equity_holdings and mutual_fund_holdings tables."""
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

    # Delete old holdings first
    if equity_member_id:
        print(f"🗑️ Deleting old equity holdings for {MEMBER_NAMES['equity']}")
        supabase.table("equity_holdings").delete().eq("user_id", user_id).eq("broker_platform", broker_platform).eq("member_id", equity_member_id).execute()

    if mf_member_id:
        print(f"🗑️ Deleting old MF holdings for {MEMBER_NAMES['mutualFunds']}")
        supabase.table("mutual_fund_holdings").delete().eq("user_id", user_id).eq("broker_platform", broker_platform).eq("member_id", mf_member_id).execute()

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
                    "import_date": datetime.utcnow().date().isoformat()
                }

                resp = supabase.table("mutual_fund_holdings").insert(new_row).execute()

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
                    "import_date": datetime.utcnow().date().isoformat()
                }

                resp = supabase.table("equity_holdings").insert(new_row).execute()
            else:
                print(f"⚠️ Skipping {company_name} - no member ID available")
                continue

            if resp.data:
                inserted_count += 1
                print(f"✅ Inserted {company_name}: ₹{invested_amount:.2f} → ₹{current_value:.2f}")
            else:
                print(f"❌ Insert failed for {company_name}: {resp}")

        except Exception as e:
            msg = f"{company_name} error: {e}"
            errors.append(msg)
            print(f"❌ {msg}")

    print(f"📈 Summary: {inserted_count}/{len(holdings)} holdings processed")
    return {"inserted": inserted_count, "errors": errors}
