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
    """
    Initiates login by requesting a fresh token_id.
    """
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
    """
    Validates username/password and prompts for OTP.
    """
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
    """
    Submits the OTP against the original token_id.
    """
    url = f"{BASE}/twofa/validate"
    params = {"api_key": API_KEY, "token_id": token_id}
    payload = {"answer": answer}

    print("📲 Validating OTP (twofa)")
    print(f"  URL: {url}")
    print(f"  Params: {params}")
    print(f"  Payload: {payload}")

    r = requests.post(url, params=params, json=payload, headers=HEADERS_JSON)
    print(f"  Response: {r.status_code} {r.text}")
    r.raise_for_status()
    return r.json()


def fetch_access_token(token_id: str, request_token: str) -> str:
    """
    Exchanges request_token for a long-lived accessToken.
    """
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
    print(f"  Parsed access_token: {access_token}")
    if not access_token:
        raise ValueError(f"Could not extract accessToken: {data}")
    return access_token


def get_holdings(access_token: str) -> dict:
    """
    Fetches portfolio holdings using a valid accessToken.
    """
    url = f"{BASE}/portfolio/holdings"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "User-Agent": HEADERS_JSON["User-Agent"]
    }

    print("📊 Fetching holdings")
    print(f"  URL: {url}")
    print(f"  Headers: {headers}")

    r = requests.get(url, params={"api_key": API_KEY}, headers=headers)
    print(f"  Response: {r.status_code} {r.text}")
    r.raise_for_status()
    return r.json()


def get_holdings_with_fallback(request_token: str, token_id: str) -> dict:
    """
    Attempts multiple authentication methods if standard accessToken fails.
    """
    url = f"{BASE}/portfolio/holdings"
    methods = [
        {"headers": {"Authorization": f"Bearer {request_token}"}, "params": {"api_key": API_KEY}},
        {"headers": {"Authorization": request_token}, "params": {"api_key": API_KEY}},
        {"headers": {"User-Agent": HEADERS_JSON["User-Agent"]}, "params": {"api_key": API_KEY, "request_token": request_token}},
        {"headers": {"User-Agent": HEADERS_JSON["User-Agent"]}, "params": {"api_key": API_KEY, "token_id": token_id, "request_token": request_token}},
        {"headers": {"X-Auth-Token": request_token, "User-Agent": HEADERS_JSON["User-Agent"]}, "params": {"api_key": API_KEY}}
    ]

    print("📊 Trying multiple holdings authentication methods...")
    last_error = None

    for i, m in enumerate(methods, start=1):
        try:
            print(f"  Method {i}: headers={m['headers']} params={m['params']}")
            r = requests.get(url, headers=m["headers"], params=m["params"])
            print(f"  Response {i}: {r.status_code} {r.text[:100]}")
            if r.status_code == 200:
                print(f"✅ Success with method {i}")
                return r.json()
        except Exception as e:
            print(f"  Method {i} error: {e}")
            last_error = e

    raise Exception(f"All methods failed; last error: {last_error}")


def resend_2fa(token_id: str) -> dict:
    """
    Resends the OTP to the registered mobile/email.
    """
    url = f"{BASE}/twofa/resend"
    params = {"api_key": API_KEY
