# app.py
import os
import logging
import traceback
from datetime import datetime
from typing import List, Dict, Any, Optional

import requests
from flask import Flask, request, jsonify, session, render_template
from flask_cors import CORS

# -----------------------
# Basic configuration
# -----------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("hdfc_integration")

app = Flask(__name__, template_folder="templates")
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "super-secret-key")

CORS(app, resources={
    r"/api/hdfc/*": {
        "origins": ["https://pradeepkumarv.github.io", "http://localhost:5000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# -----------------------
# Config from environment
# -----------------------
HDFC_API_KEY = os.getenv("HDFC_API_KEY")
HDFC_API_SECRET = os.getenv("HDFC_API_SECRET")
HDFC_USERNAME = os.getenv("HDFC_USERNAME")
HDFC_PASSWORD = os.getenv("HDFC_PASSWORD")
CALLBACK_URL = os.getenv("CALLBACK_URL", "https://family-investment-dashboard.onrender.com/api/callback")

# Supabase placeholders (replace with your client initialization)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = None  # You'll replace this with your supabase client initialization

# Member IDs mapping (we use a dict — change values if you have different ids)
DEFAULT_HDFC_MEMBER_IDS = {
    "equity": "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49",
    "mutualFunds": "d3a4fc84-a94b-494d-915f-60901f16d973"
}

# -----------------------
# Utility HTTP helpers
# -----------------------
def safe_post(url: str, params=None, json=None, headers=None, timeout=15):
    try:
        resp = requests.post(url, params=params, json=json, headers=headers, timeout=timeout)
        logger.debug("POST %s -> %s %s", url, resp.status_code, resp.text[:100])
        return resp
    except Exception as e:
        logger.exception("HTTP POST failed: %s", e)
        raise

def safe_get(url: str, params=None, headers=None, timeout=15):
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=timeout)
        logger.debug("GET %s -> %s %s", url, resp.status_code, resp.text[:100])
        return resp
    except Exception as e:
        logger.exception("HTTP GET failed: %s", e)
        raise

# -----------------------
# HDFC API wrappers
# -----------------------
HDFC_BASE = "https://developer.hdfcsec.com/oapi/v1"

def get_token_id() -> str:
    """Request a token_id from HDFC dev endpoint"""
    params = {"api_key": HDFC_API_KEY}
    logger.info("➡️ Requesting token_id: %s params=%s", f"{HDFC_BASE}/login", params)
    resp = safe_post(f"{HDFC_BASE}/login", params=params)
    resp.raise_for_status()
    token = resp.json().get("tokenId")
    logger.info("✅ Received token_id")
    return token

def login_validate(token_id: str, username: str, password: str) -> Dict[str, Any]:
    """Send username/password to login/validate endpoint. Returns JSON (may contain twofa)."""
    url = f"{HDFC_BASE}/login/validate"
    params = {"api_key": HDFC_API_KEY, "token_id": token_id}
    payload = {"username": username, "password": password}
    resp = safe_post(url, params=params, json=payload)
    resp.raise_for_status()
    logger.info("✅ login_validate response received")
    return resp.json()

def validate_otp(token_id: str, otp_answer: str) -> Dict[str, Any]:
    """Validate the OTP (twofa) and return the requestToken + callbackUrl etc."""
    url = f"{HDFC_BASE}/twofa/validate"
    params = {"api_key": HDFC_API_KEY, "token_id": token_id}
    payload = {"answer": otp_answer}
    resp = safe_post(url, params=params, json=payload)
    resp.raise_for_status()
    logger.info("🔍 validate_otp raw response: %s", resp.text[:300])
    return resp.json()

def fetch_access_token(token_id: str, request_token: str) -> str:
    """Exchange request_token for accessToken using apiSecret"""
    url = f"{HDFC_BASE}/access-token"
    params = {"api_key": HDFC_API_KEY, "request_token": request_token}
    payload = {"apiSecret": HDFC_API_SECRET}
    resp = safe_post(url, params=params, json=payload)
    resp.raise_for_status()
    data = resp.json()
    access_token = data.get("accessToken")
    logger.info("✅ Parsed access_token")
    return access_token

def get_holdings(token_or_access: str) -> Dict[str, Any]:
    """
    Attempt to fetch holdings. token_or_access can be requestToken or accessToken (Bearer).
    The HDFC API expects Bearer <token> in Authorization header.
    """
    url = f"{HDFC_BASE}/portfolio/holdings"
    headers = {
        "Authorization": f"Bearer {token_or_access}",
        "User-Agent": "HDFC-Integration/1.0"
    }
    resp = safe_get(url, headers=headers)
    # Do not raise for status yet - calling code inspects
    try:
        return resp.json()
    except Exception:
        logger.exception("Failed to parse holdings response")
        return {"error": "invalid_response"}

def get_holdings_with_fallback(request_token: Optional[str], token_id: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Last-resort: try sequence to fetch holdings through different tokens or approaches.
    Keep simple here: if we have token_id and request_token, re-attempt fetch using access token.
    """
    if not request_token or not token_id:
        return None
    try:
        access_token = fetch_access_token(token_id, request_token)
        return get_holdings(access_token)
    except Exception as e:
        logger.warning("❌ Fallback to fetch_access_token failed: %s", e)
        return None

# -----------------------
# Normalizers / parsers
# -----------------------
def normalize_holdings(raw: Any) -> List[Dict[str, Any]]:
    """
    Convert raw holdings into a flat list of dicts.
    The HDFC response sometimes returns 'data' -> list of holdings; some entries may be nested lists.
    """
    result: List[Dict[str, Any]] = []

    if raw is None:
        return result

    # Common wrappers
    if isinstance(raw, dict):
        # Many HDFC responses use {"status": "...", "data": [...]}
        if "data" in raw and isinstance(raw["data"], list):
            raw_list = raw["data"]
        else:
            # If they used the key 'holdings' or similar
            raw_list = raw.get("holdings") or raw.get("portfolio") or []
    elif isinstance(raw, list):
        raw_list = raw
    else:
        logger.warning("normalize_holdings: unexpected type %s", type(raw))
        return result

    for item in raw_list:
        if isinstance(item, dict):
            result.append(item)
        elif isinstance(item, list):
            # Flatten nested lists of holdings
            for inner in item:
                if isinstance(inner, dict):
                    result.append(inner)
                else:
                    logger.debug("normalize_holdings: unknown inner element type %s", type(inner))
        else:
            logger.debug("normalize_holdings: unknown element type %s", type(item))

    return result

def parse_holding(h: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Parse a single holding dict from HDFC into canonical structure.
    Detect equity vs mutual fund using multiple heuristics.
    Returns canonical dict or None if unknown.
    """
    try:
        # Heuristics for equity:
        has_symbol = bool(h.get("tradingsymbol") or h.get("symbol") or h.get("security_id"))
        has_quantity = h.get("quantity") is not None

        # Heuristics for mutual fund:
        has_schemecolors = bool(h.get("schemename") or h.get("fundhouse") or h.get("units") or h.get("nav") or h.get("isin", "").startswith("INF"))

        if has_symbol and has_quantity:
            # Equity
            parsed = {
                "type": "equity",
                "symbol": h.get("tradingsymbol") or h.get("symbol") or h.get("security_id") or "",
                "company_name": h.get("company_name") or h.get("symbol") or "",
                "isin": h.get("isin") or "",
                "quantity": float(h.get("quantity") or 0),
                "average_price": float(h.get("average_price") or h.get("averageprice") or 0),
                "current_price": float(h.get("close_price") or h.get("lastprice") or 0),
                "investment_value": float(h.get("investment_value") or 0),
                "pnl": float(h.get("pnl") or 0),
                "raw": h
            }
            return parsed

        elif has_schemecolors:
            # Mutual fund
            parsed = {
                "type": "mutualFund",
                "scheme_name": h.get("company_name") or h.get("schemename") or "",
                "isin": h.get("isin") or "",
                "units": float(h.get("quantity") or h.get("units") or 0),
                "average_nav": float(h.get("average_price") or h.get("average_nav") or h.get("averagenav") or 0),
                "current_nav": float(h.get("close_price") or h.get("nav") or 0),
                "investment_value": float(h.get("investment_value") or 0),
                "raw": h
            }
            return parsed

        else:
            # Unknown entry
            logger.warning("⚠️ Unknown holding type. Skipped: %s", {k: h.get(k) for k in ("security_id","company_name","isin")})
            return None

    except Exception as e:
        logger.exception("❌ Error parsing holding: %s", e)
        return None

# -----------------------
# Process & persist holdings
# -----------------------
def process_holdings_success(holdings: List[Dict[str, Any]], user_id: str, hdfc_member_ids: Dict[str, str]) -> Dict[str, int]:
    """
    Convert normalized holdings into DB-ready records and insert to Supabase tables.
    Returns counts.
    This function is safe to call multiple times (it will delete previous HDFC holdings for the user/broker).
    """
    equity_records = []
    mf_records = []

    import_date = datetime.utcnow().date().isoformat()
    logger.info("🔄 Processing %d holdings for user %s", len(holdings), user_id)

    for raw in holdings:
        try:
            parsed = parse_holding(raw)
            if parsed is None:
                continue

            if parsed["type"] == "equity":
                eq = {
                    "user_id": user_id,
                    "member_id": hdfc_member_ids.get("equity") or DEFAULT_HDFC_MEMBER_IDS["equity"],
                    "broker_platform": "HDFC Securities",
                    "symbol": parsed["symbol"],
                    "company_name": parsed["company_name"],
                    "quantity": float(parsed["quantity"]),
                    "average_price": float(parsed["average_price"]),
                    "current_price": float(parsed["current_price"]),
                    "invested_amount": float(parsed["investment_value"]) if parsed.get("investment_value") else float(parsed["quantity"]) * float(parsed["average_price"] or 0),
                    "current_value": float(parsed.get("current_price") or 0) * float(parsed["quantity"]),
                    "import_date": import_date,
                    "raw": parsed["raw"]
                }
                equity_records.append(eq)

            elif parsed["type"] == "mutualFund":
                mf = {
                    "user_id": user_id,
                    "member_id": hdfc_member_ids.get("mutualFunds") or DEFAULT_HDFC_MEMBER_IDS["mutualFunds"],
                    "broker_platform": "HDFC Securities",
                    "scheme_name": parsed["scheme_name"],
                    "isin": parsed.get("isin", ""),
                    "units": float(parsed["units"]),
                    "average_nav": float(parsed["average_nav"]),
                    "current_nav": float(parsed["current_nav"]),
                    "invested_amount": float(parsed.get("investment_value")) or float(parsed["units"]) * float(parsed["average_nav"] or 0),
                    "current_value": float(parsed["units"]) * float(parsed["current_nav"] or 0),
                    "import_date": import_date,
                    "raw": parsed["raw"]
                }
                mf_records.append(mf)
            else:
                logger.warning("Unknown parsed type: %s", parsed.get("type"))
                continue

        except Exception as e:
            logger.exception("❌ Error processing holding: %s", e)
            continue

    # Delete old holdings (replace with your DB client logic)
    logger.info("🗑️ Deleting old HDFC holdings...")
    try:
        if supabase:
            supabase.table("equity_holdings").delete().match({
                "user_id": user_id,
                "broker_platform": "HDFC Securities",
                "member_id": DEFAULT_HDFC_MEMBER_IDS["equity"]
            }).execute()

            supabase.table("mutual_fund_holdings").delete().match({
                "user_id": user_id,
                "broker_platform": "HDFC Securities",
                "member_id": DEFAULT_HDFC_MEMBER_IDS["mutualFunds"]
            }).execute()
        else:
            logger.info("Supabase client not configured; skipping DB delete/insert steps.")
    except Exception as e:
        logger.exception("Error while deleting old holdings: %s", e)

    # Insert new holdings
    try:
        if supabase and equity_records:
            logger.info("📥 Inserting %d equity holdings...", len(equity_records))
            supabase.table("equity_holdings").insert(equity_records).execute()
        if supabase and mf_records:
            logger.info("📥 Inserting %d mutual fund holdings...", len(mf_records))
            supabase.table("mutual_fund_holdings").insert(mf_records).execute()
    except Exception as e:
        logger.exception("Error inserting holdings: %s", e)

    logger.info("✅ HDFC holdings prepared (not all environments insert into DB here).")
    return {"equity": len(equity_records), "mutualFunds": len(mf_records)}

# -----------------------
# Flask routes
# -----------------------
@app.route("/", methods=["GET"])
def home():
    # render a simple page that points to /request-otp
    try:
        return render_template("login.html")
    except Exception:
        return "<h3>HDFC integration</h3><p>Use /request-otp to start</p>"

@app.route("/api/hdfc/auth-url", methods=["GET"])
def get_auth_url():
    auth_url = os.getenv("FRONTEND_URL", CALLBACK_URL)
    return jsonify({"url": auth_url})

@app.route("/api/hdfc/status", methods=["GET"])
def status():
    token = session.get("access_token")
    last_sync = session.get("last_sync")
    return jsonify({
        "connected": token is not None,
        "accessToken": token,
        "lastSync": last_sync
    })

@app.route("/request-otp", methods=["POST"])
def request_otp():
    """
    Starts the login flow: requests token_id and calls login_validate
    Expects form data: username & password (if not supplied uses env vars)
    """
    username = request.form.get("username") or HDFC_USERNAME
    password = request.form.get("password") or HDFC_PASSWORD

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    try:
        token_id = get_token_id()
        session["token_id"] = token_id
        session["username"] = username
        session["password"] = password

        # Call login_validate (returns twofa instructions typically)
        login_payload = login_validate(token_id, username, password)
        logger.info("login_validate returned twofa data")

        # Render OTP page (user should post OTP to /validate-otp)
        return render_template("otp.html", tokenid=token_id)
    except Exception as e:
        logger.exception("request_otp failed")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@app.route("/validate-otp", methods=["POST"])
def validate_otp_route():
    otp = request.form.get("otp")
    token_id = request.form.get("tokenid") or session.get("token_id")

    if not token_id:
        return jsonify({"error": "Session expired. Please login again."}), 401

    try:
        otp_result = validate_otp(token_id, otp)
        if not otp_result.get("authorised"):
            return jsonify({"error": "OTP validation failed!"}), 400

        request_token = otp_result.get("requestToken")
        session["request_token"] = request_token
        # Callback url is provided by HDFC; store it safely
        session["callback_url"] = otp_result.get("callbackUrl", CALLBACK_URL)

        return jsonify({
            "status": "redirect_required",
            "redirect_url": otp_result.get("callbackUrl") or CALLBACK_URL,
            "message": "Please complete authorization"
        })
    except Exception as e:
        logger.exception("validate_otp_route failed")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@app.route("/api/hdfc/holdings", methods=["POST"])
def api_holdings():
    """
    Manual endpoint to fetch holdings by passing an access token in JSON body:
    { "accesstoken": "<token>" }
    """
    data = request.json or {}
    access_token = data.get("accesstoken")

    if not access_token:
        return jsonify({"error": "Missing access token"}), 400

    try:
        raw = get_holdings(access_token)
        normalized = normalize_holdings(raw)
        mapped = [parse_holding(h) for h in normalized if parse_holding(h)]
        session["last_sync"] = datetime.utcnow().isoformat()
        session["access_token"] = access_token
        return jsonify({"data": mapped})
    except Exception as e:
        logger.exception("api_holdings error")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@app.route("/api/hdfc/callback", methods=["GET", "POST"])
def callback():
    """
    Final callback invoked after user completes authorization with HDFC.
    This route tries:
      1) Attempt get_holdings(request_token)
      2) If not, exchange request_token for access_token and try
      3) If still not, fallback helper
      4) Process normalized holdings and store them
    """
    try:
        request_token = session.get("request_token") or request.args.get("request_token")
        token_id = session.get("token_id")

        user_id = session.get("user_id") or "pradeep"
        hdfc_member_ids = DEFAULT_HDFC_MEMBER_IDS

        holdings_data = None

        # Step 1: Try direct request_token (some HDFC endpoints accept requestToken as bearer)
        if request_token:
            try:
                holdings_data = get_holdings(request_token)
                if isinstance(holdings_data, dict) and holdings_data.get("error"):
                    # treat as failed
                    holdings_data = None
            except Exception:
                holdings_data = None

        # Step 2: Try exchange to access token
        if not holdings_data and token_id and request_token:
            try:
                access_token = fetch_access_token(token_id, request_token)
                session["access_token"] = access_token
                session["last_sync"] = datetime.utcnow().isoformat()
                holdings_data = get_holdings(access_token)
            except Exception:
                holdings_data = None

        # Step 3: Fallback
        if not holdings_data:
            holdings_data = get_holdings_with_fallback(request_token, token_id)

        # Validate and normalize
        if holdings_data and isinstance(holdings_data, dict) and "data" in holdings_data:
            raw_list = normalize_holdings(holdings_data)
            parsed_list = [parse_holding(h) for h in raw_list if parse_holding(h)]
            # Persist to DB (process_holdings_success expects raw holdings, but it uses parse again;
            # we'll feed the original raw_list since it expects HDFC format)
            result_counts = process_holdings_success(raw_list, user_id, hdfc_member_ids)

            return jsonify({"status": "success", "count": sum(result_counts.values()), "detail": result_counts})

        # If we reach here it failed
        return jsonify({"error": "No holdings received"}), 400

    except Exception as e:
        logger.exception("callback error")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# -----------------------
# Run server (dev)
# -----------------------
if __name__ == "__main__":
    # Local dev defaults: port 5000
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
