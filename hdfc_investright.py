import os
import requests

# -----------------------------
# Config
# -----------------------------
BASE = "https://developer.hdfcsec.com/oapi/v1"
API_KEY = os.getenv("HDFC_API_KEY")
API_SECRET = os.getenv("HDFC_API_SECRET")

HEADERS_JSON = {
    "Content-Type": "application/json",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    )
}

# -----------------------------
# Helper Functions
# -----------------------------

def get_token_id() -> str:
    """Step 1: Get initial token_id for the session"""
    url = f"{BASE}/login"
    params = {"api_key": API_KEY}
    print(f"➡️ Requesting token_id: {url} params={params}")
    
    r = requests.get(url, params=params, headers=HEADERS_JSON)
    print(f"  Status: {r.status_code} Body: {r.text}")
    r.raise_for_status()
    
    data = r.json()
    token_id = data.get("tokenId") or data.get("token_id")
    print(f"  Parsed token_id: {token_id}")
    
    if not token_id:
        raise ValueError(f"Could not extract token_id: {data}")
    return token_id


def login_validate(token_id: str, username: str, password: str) -> dict:
    """Step 2: Validate credentials and trigger OTP"""
    url = f"{BASE}/login/validate"
    params = {"api_key": API_KEY, "token_id": token_id}
    payload = {"username": username, "password": password}
    
    safe_pw = "*" * len(password) if password else None
    print("🔐 Calling login_validate")
    print(f"  URL: {url}")
    print(f"  Params: {params}")
    print(f"  Payload: {{'username': '{username}', 'password': '{safe_pw}'}}")
    
    r = requests.post(url, params=params, json=payload, headers=HEADERS_JSON)
    print(f"  Response: {r.status_code} {r.text}")
    r.raise_for_status()
    
    return r.json()


def validate_otp(token_id: str, answer: str) -> dict:
    """Step 3: Submit OTP using the SAME token_id from Step 1"""
    url = f"{BASE}/twofa/validate"
    params = {"api_key": API_KEY, "token_id": token_id}
    payload = {"answer": answer}
    
    print("📲 Validating OTP (twofa)")
    print(f"  Using token_id: {token_id}")
    print(f"  URL: {url}")
    print(f"  Params: {params}")
    print(f"  Payload: {payload}")
    
    # CRITICAL: Ensure we're using the exact same token_id from login
    r = requests.post(url, params=params, json=payload, headers=HEADERS_JSON)
    print(f"  Response: {r.status_code}")
    print(f"  Response Body: {r.text}")
    
    if r.status_code == 401:
        print("❌ 401 Error - Token may have expired or be invalid")
        print(f"   Token used: {token_id}")
        print("   This usually means:")
        print("   1. Token expired (took too long to enter OTP)")
        print("   2. Token was already used/invalidated")
        print("   3. Wrong token_id being passed")
    
    r.raise_for_status()
    return r.json()


def fetch_access_token(token_id: str, request_token: str) -> str:
    """Step 4: Convert request_token to access_token"""
    url = f"{BASE}/access-token"
    params = {"api_key": API_KEY, "request_token": request_token}
    payload = {"apiSecret": API_SECRET}
    
    print("🔑 Fetching access token")
    print(f"  URL: {url}")
    print(f"  Params: {params}")
    print(f"  Payload: {payload}")
    
    r = requests.post(url, params=params, json=payload, headers=HEADERS_JSON)
    print(f"  Response: {r.status_code} {r.text}")
    r.raise_for_status()
    
    data = r.json()
    access_token = data.get("accessToken")
    print(f"  Parsed access_token: {access_token[:50]}..." if access_token else None)
    
    if not access_token:
        raise ValueError(f"Could not extract accessToken: {data}")
    return access_token


def get_holdings(access_token: str) -> dict:
    """Step 5: Fetch holdings using access_token"""
    url = f"{BASE}/portfolio/holdings"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "User-Agent": HEADERS_JSON["User-Agent"]
    }
    
    print("📊 Fetching holdings")
    print(f"  URL: {url}")
    print(f"  Headers: {headers}")
    
    r = requests.get(url, params={"api_key": API_KEY}, headers=headers)
    print(f"  Response: {r.status_code} {r.text[:200]}...")
    r.raise_for_status()
    
    return r.json()


def get_holdings_with_fallback(request_token: str, token_id: str) -> dict:
    """Fallback: Try multiple ways to authenticate holdings"""
    url = f"{BASE}/portfolio/holdings"
    
    methods = [
        {
            "name": "Bearer token",
            "headers": {"Authorization": f"Bearer {request_token}"},
            "params": {"api_key": API_KEY}
        },
        {
            "name": "Direct auth header",
            "headers": {"Authorization": request_token},
            "params": {"api_key": API_KEY}
        },
        {
            "name": "Request token param",
            "headers": {"User-Agent": HEADERS_JSON["User-Agent"]},
            "params": {"api_key": API_KEY, "request_token": request_token}
        },
        {
            "name": "Both tokens",
            "headers": {"User-Agent": HEADERS_JSON["User-Agent"]},
            "params": {
                "api_key": API_KEY,
                "token_id": token_id,
                "request_token": request_token
            }
        }
    ]
    
    print("📊 Trying fallback authentication methods...")
    
    for i, method in enumerate(methods, start=1):
        try:
            print(f"  Method {i} ({method['name']}): {method}")
            r = requests.get(url, headers=method["headers"], params=method["params"])
            print(f"  Response {i}: {r.status_code} {r.text[:100]}...")
            
            if r.status_code == 200:
                print(f"✅ Success with method {i}")
                return r.json()
                
        except Exception as e:
            print(f"  Method {i} error: {e}")
            continue
    
    raise Exception("All fallback authentication methods failed")


def resend_2fa(token_id: str) -> dict:
    """Resend OTP if needed"""
    url = f"{BASE}/twofa/resend"
    params = {"api_key": API_KEY, "token_id": token_id}
    
    print("🔁 Resending 2FA OTP")
    print(f"  URL: {url}")
    print(f"  Params: {params}")
    
    r = requests.post(url, params=params, headers=HEADERS_JSON)
    print(f"  Response: {r.status_code} {r.text}")
    r.raise_for_status()
    
    return r.json()


# Debugging function to validate token flow
def debug_token_flow():
    """Debug function to test the complete flow"""
    print("🔍 Starting debug flow...")
    
    # Step 1: Get token
    token_id = get_token_id()
    print(f"✅ Got token_id: {token_id}")
    
    # Step 2: Login validate (this would normally require real credentials)
    print(f"⏭️  Next step: call login_validate('{token_id}', 'username', 'password')")
    print(f"⏭️  Then: call validate_otp('{token_id}', 'otp_code')")
    print("🔍 Make sure the SAME token_id is used in both calls!")
    
    return token_id
