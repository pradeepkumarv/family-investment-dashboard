# hdfc_investright.py
# Helper module for interacting with HDFC Securities OpenAPI and Supabase.
# Replace or adapt request/URL details as required by HDFC docs.
# Important: this module will not run any side-effects at import time.

import os
import requests
import logging
import traceback
from datetime import datetime
from typing import Optional, Dict, List, Any

logger = logging.getLogger("hdfc_investright")
logger.setLevel(logging.INFO)

# Supabase client (requires supabase package)
try:
    from supabase import create_client, Client
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    supabase: Optional[Client] = None
    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        logger.info("✅ Supabase client initialized")
    else:
        logger.warning("Supabase credentials missing; DB writes will fail until provided.")
except Exception as e:
    supabase = None
    logger.exception("Supabase client could not be initialized")

# HDFC API config
HDFC_API_KEY = os.getenv("HDFC_API_KEY")
HDFC_API_SECRET = os.getenv("HDFC_API_SECRET")
HDFC_TOKEN_ID_URL = os.getenv("HDFC_TOKEN_ID_URL", "https://developer.hdfcsec.com/oapi/v1/login/token_id")
HDFC_LOGIN_VALIDATE_URL = os.getenv("HDFC_TOKEN_EXCHANGE_URL", "https://developer.hdfcsec.com/oapi/v1/login/validate")
HDFC_ACCESS_TOKEN_URL = os.getenv("HDFC_TOKEN_EXCHANGE_URL", "https://developer.hdfcsec.com/oapi/v1/access-token")
HDFC_HOLDINGS_URL = os.getenv("HDFC_HOLDINGS_URL", "https://developer.hdfcsec.com/oapi/v1/portfolio/holdings")

# ------------------------
# Helper: HTTP wrappers
# ------------------------
def _get(url, params=None, headers=None):
    resp = requests.get(url, params=params, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()

def _post(url, data=None, params=None, headers=None, json_payload=None):
    resp = requests.post(url, params=params, data=data, json=json_payload, headers=headers, timeout=30)
    resp.raise_for_status()
    return resp.json()

# ------------------------
# Public API functions
# ------------------------
def get_token_id() -> str:
    """Request a token_id from HDFC (initial step)."""
    params = {"api_key": HDFC_API_KEY}
    resp = requests.get(HDFC_TOKEN_ID_URL, params=params, timeout=30)
    data = resp.json()
    token_id = data.get("tokenId") or data.get("token_id") or data.get("tokenId")
    if not token_id:
        raise RuntimeError("No token_id returned from HDFC")
    logger.info("➡️ Requesting token_id: %s", HDFC_TOKEN_ID_URL)
    return token_id

def login_validate(token_id: str, username: str, password: str) -> dict:
    """Start login validate (sends credentials) -> returns twofa response."""
    params = {"api_key": HDFC_API_KEY, "token_id": token_id}
    payload = {"username": username, "password": password}
    resp = _post(HDFC_LOGIN_VALIDATE_URL, data=payload, params=params)
    logger.info("✅ login_validate response received")
    return resp

def validate_otp(token_id: str, otp: str) -> dict:
    """Send OTP and receive requestToken + callbackUrl + authorised boolean."""
    params = {"api_key": HDFC_API_KEY, "token_id": token_id}
    payload = {"answer": otp}
    url = "https://developer.hdfcsec.com/oapi/v1/twofa/validate"
    resp = _post(url, data=payload, params=params)
    logger.info("🔍 validate_otp raw response: %s", resp if isinstance(resp, dict) else str(resp))
    return resp

def fetch_access_token(token_id: str, request_token: str) -> Optional[str]:
    """Exchange request_token for an access token."""
    params = {"api_key": HDFC_API_KEY, "request_token": request_token}
    payload = {"apiSecret": HDFC_API_SECRET}
    resp = _post(HDFC_ACCESS_TOKEN_URL, data=payload, params=params)
    access_token = resp.get("accessToken")
    logger.info("✅ Parsed access_token")
    return access_token

def get_holdings(access_token_or_request_token: str) -> dict:
    """
    Fetch holdings from HDFC holdings endpoint.
    The API may accept either a valid access token (bearer) or (rarely) request_token directly.
    Returns parsed JSON dict from API.
    """
    headers = {"Authorization": f"Bearer {access_token_or_request_token}", "User-Agent": "Family-Investment-Dashboard/1.0"}
    resp = requests.get(HDFC_HOLDINGS_URL, headers=headers, timeout=30)
    try:
        data = resp.json()
    except Exception:
        logger.exception("Failed to parse holdings response")
        raise
    return data

def get_holdings_with_fallback(request_token: Optional[str], token_id: Optional[str]) -> Optional[dict]:
    """
    Provide a fallback approach if direct fetch fails:
      - try exchanging token again if possible / or attempt alternate endpoints
      - This function should be conservative; return None if unsuccessful.
    """
    try:
        if not request_token or not token_id:
            return None
        # Try to fetch access token again
        access_token = fetch_access_token(token_id, request_token)
        if not access_token:
            return None
        return get_holdings(access_token)
    except Exception:
        logger.exception("get_holdings_with_fallback failed")
        return None

# ------------------------
# Normalization & mapping helpers
# ------------------------
def normalize_holdings_payload(payload: Any) -> List[dict]:
    """
    Normalize the HDFC holdings payload to a list of dictionaries.
    The HDFC API sometimes returns nested lists or mixed shapes.
    """
    if not payload:
        return []

    # If a dict with "data" and "data" is a list
    if isinstance(payload, dict) and "data" in payload and isinstance(payload["data"], list):
        return payload["data"]

    # If it's already a list
    if isinstance(payload, list):
        # Flatten if nested lists present
        result = []
        for item in payload:
            if isinstance(item, list):
                result.extend(item)
            elif isinstance(item, dict):
                result.append(item)
        return result

    # Unknown shape
    logger.warning("Unknown holdings payload shape; returning empty list")
    return []

def map_holdings_for_frontend(raw_holdings_payload: Any) -> List[dict]:
    """
    Map the HDFC raw payload into a sanitized list for frontend consumption.
    """
    holdings_list = normalize_holdings_payload(raw_holdings_payload)
    mapped = []

    for h in holdings_list:
        try:
            # Fields from HDFC: security_id/company_name/isin/quantity/average_price/close_price/investment_value/sip_indicator
            symbol = h.get("security_id") or h.get("tradingsymbol") or h.get("symbol")
            company_name = h.get("company_name") or h.get("company") or ""
            isin = h.get("isin")
            quantity = float(h.get("quantity") or 0)
            avg_price = float(h.get("average_price") or h.get("averageprice") or 0)
            current_price = float(h.get("close_price") or h.get("lastprice") or 0)
            invested_value = float(h.get("investment_value") or 0)
            pnl = float(h.get("pnl") or 0)
            sip = h.get("sip_indicator") == "Y"

            mapped.append({
                "symbol": symbol,
                "company_name": company_name,
                "isin": isin,
                "quantity": quantity,
                "average_price": avg_price,
                "current_price": current_price,
                "invested_value": invested_value,
                "pnl": pnl,
                "sip": sip,
                # keep raw for debugging
                "_raw": h
            })
        except Exception:
            logger.exception("Failed to map holding: %s", h)
            continue

    return mapped

# ------------------------
# DB processing: inserts into Supabase
# ------------------------
def process_holdings_success(holdings: List[dict], user_id: str, hdfc_member_ids: Dict[str, str]) -> Dict[str, int]:
    """
    Process and insert HDFC holdings to Supabase:
      - equity_holdings table
      - mutual_fund_holdings table

    Expects:
      - holdings: list of raw holding dicts (API-specific fields)
      - user_id: your user identifier in your DB
      - hdfc_member_ids: {"equity": "<uuid>", "mutualFunds": "<uuid>"}
    """
    if supabase is None:
        raise RuntimeError("Supabase client is not initialized — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")

    equity_records = []
    mf_records = []
    import_date = datetime.utcnow().date().isoformat()

    logger.info("🔄 Processing %d holdings for user %s", len(holdings), user_id)

    for h in holdings:
        try:
            # Determine if this is a mutual fund or equity from HDFC fields
            # Mutual fund holdings typically don't have 'security_id' and have 'company_name' containing fund name OR 'sip_indicator' may be 'Y'
            is_mf = False
            if any(k in h for k in ("schemename", "fundhouse", "nav")):
                is_mf = True
            elif h.get("sip_indicator") == "Y":
                # SIP flagged (mutual funds typically)
                is_mf = True
            elif h.get("security_id") and isinstance(h.get("security_id"), str):
                # likely an equity
                is_mf = False
            else:
                # Heuristic by ISIN: mutual funds have INF prefix (IN + F?)
                isin = (h.get("isin") or "").upper()
                if isin.startswith("INF"):
                    is_mf = True

            if not is_mf:
                # Equity record mapping
                equity_records.append({
                    "user_id": user_id,
                    "member_id": hdfc_member_ids.get("equity"),
                    "broker_platform": "HDFC Securities",
                    "symbol": h.get("security_id") or h.get("tradingsymbol") or h.get("symbol") or None,
                    "company_name": h.get("company_name") or h.get("company") or None,
                    "quantity": float(h.get("quantity") or 0),
                    "average_price": float(h.get("average_price") or h.get("averageprice") or 0),
                    "current_price": float(h.get("close_price") or h.get("lastprice") or 0),
                    "invested_amount": float(h.get("investment_value") or (float(h.get("quantity") or 0) * float(h.get("average_price") or 0))),
                    "current_value": float(h.get("quantity") or 0) * float(h.get("close_price") or 0),
                    "import_date": import_date,
                    "raw": h
                })
            else:
                # Mutual fund mapping
                mf_records.append({
                    "user_id": user_id,
                    "member_id": hdfc_member_ids.get("mutualFunds"),
                    "broker_platform": "HDFC Securities",
                    "scheme_name": h.get("company_name") or h.get("schemename") or None,
                    "scheme_code": h.get("schemecode") or "",
                    "folio_number": h.get("folio") or h.get("folio_number") or "",
                    "fund_house": h.get("fundhouse") or None,
                    "units": float(h.get("quantity") or h.get("units") or 0),
                    "average_nav": float(h.get("average_price") or h.get("averagenav") or 0),
                    "current_nav": float(h.get("close_price") or h.get("nav") or 0),
                    "invested_amount": float(h.get("investment_value") or (float(h.get("quantity") or 0) * float(h.get("average_price") or 0))),
                    "current_value": float(h.get("quantity") or 0) * float(h.get("close_price") or 0),
                    "import_date": import_date,
                    "raw": h
                })

        except Exception as e:
            logger.exception("❌ Error processing holding: %s", e)
            continue

    logger.info("🗑️ Deleting old HDFC holdings for user %s", user_id)

    # Delete previous records for this user and broker_member combination
    try:
        if equity_records:
            supabase.table("equity_holdings").delete().match({
                "user_id": user_id,
                "broker_platform": "HDFC Securities",
                "member_id": hdfc_member_ids.get("equity")
            }).execute()
        if mf_records:
            supabase.table("mutual_fund_holdings").delete().match({
                "user_id": user_id,
                "broker_platform": "HDFC Securities",
                "member_id": hdfc_member_ids.get("mutualFunds")
            }).execute()
    except Exception:
        logger.exception("Failed to delete previous holdings (continuing)")

    # Insert new holdings in batches
    try:
        if equity_records:
            logger.info("📥 Inserting %d equity holdings...", len(equity_records))
            supabase.table("equity_holdings").insert(equity_records).execute()
        if mf_records:
            logger.info("📥 Inserting %d mutual fund holdings...", len(mf_records))
            supabase.table("mutual_fund_holdings").insert(mf_records).execute()
    except Exception:
        logger.exception("Failed to insert holdings into Supabase")
        raise

    logger.info("✅ HDFC holdings imported successfully")

    return {"equity": len(equity_records), "mutualFunds": len(mf_records)}
