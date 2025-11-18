# hdfc_investright.py
"""
HDFC Investright integration helper library.

Designed to be safe on import (no top-level execution), robust for Case A:
    "holdings" returned as a list of lists from HDFC.

Provides:
- get_token_id()
- login_validate(token_id, username, password)
- validate_otp(token_id, otp)
- fetch_access_token(token_id, request_token)
- get_holdings(token_or_request_token)
- get_holdings_with_fallback(request_token, token_id)
- process_holdings_success(holdings, user_id_or_map, maybe_map=None)

Behavior:
- HTTP calls use `requests` and rely on HDFC API key/secret from environment:
    HDFC_API_KEY, HDFC_API_SECRET
- Optional Supabase writing if SUPABASE_URL and SUPABASE_KEY present.
"""

from __future__ import annotations
import os
import json
import time
from typing import Any, Dict, List, Optional, Union
import requests
from datetime import datetime

# --- Configuration from environment ---
API_KEY = os.getenv("HDFC_API_KEY")
API_SECRET = os.getenv("HDFC_API_SECRET")
HDFC_BASE = os.getenv("HDFC_BASE_URL", "https://developer.hdfcsec.com/oapi/v1")

# Optional Supabase config for DB writes
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Attempt to initialize supabase client if configured
supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client  # type: ignore
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase client initialized")
    except Exception as e:
        print("⚠️ Could not initialize Supabase client:", e)
        supabase = None
else:
    print("ℹ️ Supabase not configured; DB writes will be skipped.")

# --- HTTP helpers ---
DEFAULT_HEADERS = {
    "User-Agent": "hdfc-integration/1.0 (+https://example.com)"
}


def _raise_for_response(resp: requests.Response) -> None:
    """Raise with helpful message on non-2xx responses."""
    if not resp.ok:
        msg = f"HTTP {resp.status_code} - {resp.text}"
        raise RuntimeError(msg)


# --------------------------
# Authentication / Tokens
# --------------------------
def get_token_id() -> str:
    """
    Request initial token_id from HDFC (login endpoint).
    Returns token_id string.
    Raises RuntimeError on failure.
    """
    if not API_KEY:
        raise RuntimeError("HDFC_API_KEY not configured in environment")

    url = f"{HDFC_BASE}/login"
    params = {"api_key": API_KEY}
    print(f"➡️ Requesting token_id: {url} params={params}")
    resp = requests.get(url, params=params, headers=DEFAULT_HEADERS, timeout=20)
    _raise_for_response(resp)
    data = resp.json()
    token_id = data.get("tokenId")
    if not token_id:
        raise RuntimeError(f"No tokenId returned: {data}")
    print("✅ Received token_id")
    return token_id


def login_validate(token_id: str, username: str, password: str) -> Dict[str, Any]:
    """
    Call login/validate with credentials. This typically returns twofa info.
    Returns the parsed JSON response.
    """
    if not API_KEY:
        raise RuntimeError("HDFC_API_KEY not configured")

    url = f"{HDFC_BASE}/login/validate"
    params = {"api_key": API_KEY, "token_id": token_id}
    payload = {"username": username, "password": password}
    print(f"🔐 Calling login_validate\n  URL: {url}\n  Params: {params}\n  Payload: (username hidden)")
    resp = requests.post(url, params=params, json=payload, headers=DEFAULT_HEADERS, timeout=20)
    _raise_for_response(resp)
    data = resp.json()
    print("✅ login_validate response received")
    return data


def validate_otp(token_id: str, otp: str) -> Dict[str, Any]:
    """
    Validate the OTP (twofa). Returns the response which ordinarily
    contains a requestToken, callbackUrl and authorised flag.
    """
    if not API_KEY:
        raise RuntimeError("HDFC_API_KEY not configured")

    url = f"{HDFC_BASE}/twofa/validate"
    params = {"api_key": API_KEY, "token_id": token_id}
    payload = {"answer": otp}
    print(f"📲 Validating OTP (twofa)\n  URL: {url}\n  Params: {params}")
    resp = requests.post(url, params=params, json=payload, headers=DEFAULT_HEADERS, timeout=20)
    _raise_for_response(resp)
    data = resp.json()
    print("🔍 validate_otp raw response:", json.dumps(data)[:500])
    return data


def fetch_access_token(token_id: str, request_token: str) -> str:
    """
    Exchange a request token for an access token.
    Returns the access token string.
    """
    if not API_KEY or not API_SECRET:
        raise RuntimeError("HDFC_API_KEY / HDFC_API_SECRET not configured")

    url = f"{HDFC_BASE}/access-token"
    params = {"api_key": API_KEY, "request_token": request_token}
    payload = {"apiSecret": API_SECRET}
    print(f"🔑 Fetching access token\n  URL: {url}\n  Params: {params}")
    resp = requests.post(url, params=params, json=payload, headers=DEFAULT_HEADERS, timeout=20)
    _raise_for_response(resp)
    data = resp.json()
    access_token = data.get("accessToken")
    if not access_token:
        raise RuntimeError(f"No accessToken returned: {data}")
    print("✅ Parsed access_token")
    return access_token


# --------------------------
# Holdings fetch and parsing
# --------------------------
def get_holdings(token: str) -> Optional[Dict[str, Any]]:
    """
    Attempt to fetch holdings using a bearer token (either requestToken or accessToken).
    Returns parsed JSON on success, or None if holdings are not found / 4xx/5xx returned.
    """
    url = f"{HDFC_BASE}/portfolio/holdings"
    headers = DEFAULT_HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    print(f"📊 Fetching holdings\n  URL: {url}\n  Headers: Authorization Bearer <token hidden>")
    try:
        resp = requests.get(url, headers=headers, timeout=25)
    except Exception as e:
        print("❌ HTTP error while fetching holdings:", e)
        return None

    # treat 200/201 as success
    if resp.status_code in (200, 201):
        try:
            data = resp.json()
            print("📥 Holdings fetched, status", resp.status_code)
            return data
        except Exception as e:
            print("❌ Error parsing holdings JSON:", e)
            return None
    else:
        # Log the response body for debugging
        print(f"⚠️ Fetch holdings returned {resp.status_code}: {resp.text}")
        return None


def get_holdings_with_fallback(request_token: str, token_id: str) -> Optional[Dict[str, Any]]:
    """
    Fallback approach: exchange request_token -> access_token and re-try holdings.
    """
    try:
        access_token = fetch_access_token(token_id, request_token)
        # small safety sleep in case HDFC propagation is slow
        time.sleep(0.2)
        return get_holdings(access_token)
    except Exception as e:
        print("❌ Fallback to fetch_access_token failed:", e)
        return None


# --------------------------
# Normalization & parsing helpers
# --------------------------
def normalize_holdings(raw_holdings: Any) -> List[Dict[str, Any]]:
    """
    Normalize the HDFC holdings payload for Case A (list of lists):
      - Accepts list-of-lists, mixed lists, or flat lists.
      - Returns a flat list of dict holdings.
    """
    normalized: List[Dict[str, Any]] = []

    if raw_holdings is None:
        return normalized

    if isinstance(raw_holdings, dict):
        # maybe top-level { "data": { "holdings": [...] } } shape
        for key in ("data", "holdings"):
            if key in raw_holdings:
                return normalize_holdings(raw_holdings[key])
        print("⚠️ Received dict holdings but unknown shape; returning empty")
        return normalized

    if not isinstance(raw_holdings, list):
        print("⚠️ normalize_holdings: expected list, got", type(raw_holdings))
        return normalized

    # Case A: list of lists (primary expected shape)
    for item in raw_holdings:
        if isinstance(item, list):
            # flatten
            for sub in item:
                if isinstance(sub, dict):
                    normalized.append(sub)
                else:
                    print("⚠️ normalize_holdings: skipping non-dict in sublist:", type(sub))
        elif isinstance(item, dict):
            normalized.append(item)
        else:
            print("⚠️ normalize_holdings: skipping unexpected item type:", type(item))

    return normalized


def classify_holding(h: Dict[str, Any]) -> str:
    """
    Return 'equity', 'mutualFund' or 'unknown' based on HDFC fields.
    Heuristics tuned to your sample payloads.
    """
    # Equity signals
    if any(h.get(k) for k in ("security_id", "company_name", "isin")) and h.get("quantity") is not None:
        # further check: if ISIN starts with 'INF' -> likely MF, treat carefully
        isin = (h.get("isin") or "").upper()
        if isin.startswith("INF"):
            return "mutualFund"
        return "equity"

    # Mutual fund signals
    if any(h.get(k) for k in ("company_name", "close_price")) and (h.get("sip_indicator") == "Y" or (h.get("isin") or "").upper().startswith("INF")):
        return "mutualFund"

    return "unknown"


def parse_holding(h: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Parse an individual holding dict into a consistent internal format.
    Returns a dict or None if unparsable.
    """
    try:
        kind = classify_holding(h)
        base = {
            "raw": h,
            "kind": kind,
            "company_name": h.get("company_name") or h.get("name") or "",
            "isin": h.get("isin"),
            "sector": h.get("sector_name") or h.get("sector") or "",
        }

        if kind == "equity":
            qty = float(h.get("quantity") or 0)
            avg = float(h.get("average_price") or h.get("averageprice") or 0)
            close = float(h.get("close_price") or h.get("lastprice") or 0)
            invested = float(h.get("investment_value") or (qty * avg))
            current_value = qty * close
            return {
                **base,
                "symbol": h.get("security_id") or h.get("tradingsymbol") or "",
                "quantity": qty,
                "average_price": avg,
                "current_price": close,
                "invested_amount": invested,
                "current_value": current_value,
                "pnl": float(h.get("pnl") or 0),
            }

        elif kind == "mutualFund":
            units = float(h.get("quantity") or h.get("units") or 0)
            avg_nav = float(h.get("average_price") or h.get("averageprice") or h.get("averagenav") or 0)
            nav = float(h.get("close_price") or h.get("nav") or 0)
            invested = units * avg_nav
            current_value = units * nav
            return {
                **base,
                "scheme_name": h.get("company_name") or h.get("schemename") or "",
                "units": units,
                "average_nav": avg_nav,
                "current_nav": nav,
                "invested_amount": invested,
                "current_value": current_value,
                "sip": (h.get("sip_indicator") == "Y"),
            }

        else:
            print("⚠️ classify_holding -> unknown; skipping:", h.get("company_name", h))
            return None

    except Exception as e:
        print("❌ Error parsing holding:", e)
        return None


# --------------------------
# Persistence: process_holdings_success
# --------------------------
def process_holdings_success(holdings: List[Dict[str, Any]],
                             user_id_or_map: Union[str, Dict[str, str]],
                             maybe_map: Optional[Union[Dict[str, str], str]] = None
                             ) -> Dict[str, int]:
    """
    Process imported holdings and persist them.

    This function is compatible with two call styles used in your app:
    1) process_holdings_success(holdings, user_id, hdfc_member_ids_dict)
       - user_id: str
       - hdfc_member_ids_dict: {"equity": "<uuid>", "mutualFunds": "<uuid>"}

    2) process_holdings_success(holdings, hdfc_member_ids_dict, hdfc_member_ids_list)
       - user passes a dict as second arg (legacy)
       - maybe_map will be used to find user_id if provided

    It is defensive: if Supabase not configured, it returns the prepared record counts
    without attempting DB insert.
    """
    # Determine user_id and member_map robustly
    if isinstance(user_id_or_map, dict):
        # caller passed map as second arg
        member_map = user_id_or_map
        user_id = maybe_map if isinstance(maybe_map, str) else "unknown_user"
    else:
        user_id = user_id_or_map or "unknown_user"
        member_map = maybe_map if isinstance(maybe_map, dict) else {
            "equity": "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49",
            "mutualFunds": "d3a4fc84-a94b-494d-915f-60901f16d973"
        }

    print(f"🔄 Processing {len(holdings)} holdings for user {user_id} with member_map {member_map}")

    # Normalize flattening (Case A: list-of-lists may have already been flattened by caller,
    # but ensure we normalize here).
    normalized = normalize_holdings(holdings)

    equity_records = []
    mf_records = []
    import_date = datetime.utcnow().date().isoformat()

    for h in normalized:
        parsed = parse_holding(h)
        if not parsed:
            # parse_holding already logged reason
            continue

        try:
            if parsed["kind"] == "equity":
                equity_records.append({
                    "user_id": user_id,
                    "member_id": member_map.get("equity"),
                    "broker_platform": "HDFC Securities",
                    "symbol": parsed.get("symbol", ""),
                    "company_name": parsed.get("company_name", ""),
                    "quantity": parsed.get("quantity", 0),
                    "average_price": parsed.get("average_price", 0),
                    "current_price": parsed.get("current_price", 0),
                    "invested_amount": parsed.get("invested_amount", 0),
                    "current_value": parsed.get("current_value", 0),
                    "pnl": parsed.get("pnl", 0),
                    "import_date": import_date,
                    "raw": parsed.get("raw"),
                })

            elif parsed["kind"] == "mutualFund":
                mf_records.append({
                    "user_id": user_id,
                    "member_id": member_map.get("mutualFunds"),
                    "broker_platform": "HDFC Securities",
                    "scheme_name": parsed.get("scheme_name", ""),
                    "folio_number": parsed["raw"].get("folio_number") or parsed["raw"].get("folionumber") or "",
                    "units": parsed.get("units", 0),
                    "average_nav": parsed.get("average_nav", 0),
                    "current_nav": parsed.get("current_nav", 0),
                    "invested_amount": parsed.get("invested_amount", 0),
                    "current_value": parsed.get("current_value", 0),
                    "import_date": import_date,
                    "raw": parsed.get("raw"),
                })
            else:
                print("⚠️ Unexpected kind when building records:", parsed["kind"])
        except Exception as e:
            print("❌ Error building record for holding:", e)
            continue

    # Delete old holdings for this user / broker / member(s)
    print("🗑️ Deleting old HDFC holdings...")

    if supabase:
        try:
            # equity delete
            if member_map.get("equity"):
                supabase.table("equity_holdings").delete().match({
                    "user_id": user_id,
                    "broker_platform": "HDFC Securities",
                    "member_id": member_map.get("equity")
                }).execute()
            # mf delete
            if member_map.get("mutualFunds"):
                supabase.table("mutual_fund_holdings").delete().match({
                    "user_id": user_id,
                    "broker_platform": "HDFC Securities",
                    "member_id": member_map.get("mutualFunds")
                }).execute()
        except Exception as e:
            print("❌ Error deleting old holdings from Supabase:", e)
    else:
        print("ℹ️ Supabase not configured - skipped delete step")

    # Insert new records
    if equity_records:
        print(f"📥 Prepared {len(equity_records)} equity records for insertion")
        if supabase:
            try:
                supabase.table("equity_holdings").insert(equity_records).execute()
                print("✅ Inserted equity holdings into Supabase")
            except Exception as e:
                print("❌ Error inserting equity records:", e)
    else:
        print("ℹ️ No equity records to insert")

    if mf_records:
        print(f"📥 Prepared {len(mf_records)} mutual fund records for insertion")
        if supabase:
            try:
                supabase.table("mutual_fund_holdings").insert(mf_records).execute()
                print("✅ Inserted mutual fund holdings into Supabase")
            except Exception as e:
                print("❌ Error inserting MF records:", e)
    else:
        print("ℹ️ No mutual fund records to insert")

    print("✅ HDFC holdings processed successfully")
    return {"equity": len(equity_records), "mutualFunds": len(mf_records)}


# --------------------------
# Convenience / CLI helpers
# --------------------------
def _example_usage_text() -> str:
    return (
        "This module provides helper functions for HDFC Investright integration.\n"
        "Import functions and call them from your Flask app (no top-level execution here)."
    )


# Module-level export
__all__ = [
    "get_token_id",
    "login_validate",
    "validate_otp",
    "fetch_access_token",
    "get_holdings",
    "get_holdings_with_fallback",
    "process_holdings_success",
    "normalize_holdings",
    "parse_holding",
    "classify_holding",
]
