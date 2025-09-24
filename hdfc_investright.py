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

def process_holdings_success(holdings, broker_platform="HDFC Securities"):
    """
    Process HDFC holdings and insert into Supabase investments table.
    - holdings: list of dicts from HDFC API
    """
    inserted_count = 0
    errors = []

    for h in holdings:
        try:
            is_mf = h.get("sip_indicator") == "Y"
            inv_type = "mutualFunds" if is_mf else "equity"
            member_id = MEMBERS[inv_type]

            # Common fields
            new_row = {
                "member_id": member_id,
                "investment_type": inv_type,
                "broker_platform": broker_platform,
                "company_name": h.get("company_name"),
                "symbol_or_name": h.get("company_name"),
                "sector_name": h.get("sector_name"),
                "isin": h.get("isin"),
                "security_id": h.get("security_id"),
                "instrument_token": h.get("instrument_token"),
                "created_at": datetime.utcnow().isoformat(),
                "last_updated": datetime.utcnow().isoformat()
            }

            # Financial calculations
            quantity = h.get("quantity", 0) or h.get("mf_quantity", 0) or 0
            avg_price = h.get("average_price", 0) or h.get("mf_average_price", 0) or 0
            close_price = h.get("close_price", 0) or 0

            invested_amount = round(quantity * avg_price, 2)
            current_value = round(quantity * close_price, 2)
            gain_loss = round(current_value - invested_amount, 2)

            # Add computed fields
            new_row.update({
                "quantity": quantity,
                "average_price": avg_price,
                "close_price": close_price,
                "invested_amount": invested_amount,
                "current_value": current_value,
                "gain_loss": gain_loss,
                "sip_indicator": h.get("sip_indicator"),
                "mtf_indicator": h.get("mtf_indicator")
            })

            # Insert into Supabase
            response = supabase.table("investments").insert(new_row).execute()
            if response.data:
                inserted_count += 1

        except Exception as e:
            errors.append(str(e))

    print(f"✅ Inserted {inserted_count} holdings into Supabase")
    if errors:
        print("⚠️ Errors:", errors)

