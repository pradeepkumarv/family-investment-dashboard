# hdfc_investright.py - FIXED VERSION with enhanced error handling

import os
import requests
import logging
import traceback
from datetime import datetime
from typing import Optional, Dict, List, Any

logger = logging.getLogger("hdfc_investright")
logger.setLevel(logging.INFO)

# Supabase client
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

# HDFC API Configuration
HDFC_API_KEY = os.getenv("HDFC_API_KEY")
HDFC_API_SECRET = os.getenv("HDFC_API_SECRET")
HDFC_TOKEN_ID_URL = os.getenv("HDFC_TOKEN_ID_URL", "https://developer.hdfcsec.com/oapi/v1/login/tokenid")
HDFC_LOGIN_VALIDATE_URL = os.getenv("HDFC_TOKEN_EXCHANGE_URL", "https://developer.hdfcsec.com/oapi/v1/login/validate")
HDFC_ACCESS_TOKEN_URL = os.getenv("HDFC_TOKEN_EXCHANGE_URL", "https://developer.hdfcsec.com/oapi/v1/access-token")
HDFC_HOLDINGS_URL = os.getenv("HDFC_HOLDINGS_URL", "https://developer.hdfcsec.com/oapi/v1/portfolio/holdings")

logger.info(f"📋 HDFC API Configuration:")
logger.info(f"  - API Key: {'✅ Set' if HDFC_API_KEY else '❌ Missing'}")
logger.info(f"  - API Secret: {'✅ Set' if HDFC_API_SECRET else '❌ Missing'}")
logger.info(f"  - Token ID URL: {HDFC_TOKEN_ID_URL}")

def get_token_id() -> str:
    """
    Request a tokenid from HDFC (initial step).
    Enhanced with better error handling and logging.
    """
    if not HDFC_API_KEY:
        raise RuntimeError("HDFC_API_KEY environment variable is not set")
    
    params = {'api_key': HDFC_API_KEY}
    headers = {
        'User-Agent': 'Family-Investment-Dashboard/1.0',
        'Accept': 'application/json'
    }
    
    logger.info(f"🔑 Requesting tokenid from: {HDFC_TOKEN_ID_URL}")
    logger.info(f"🔑 With API key: {HDFC_API_KEY[:10]}...")  # Log first 10 chars only
    
    try:
        resp = requests.get(HDFC_TOKEN_ID_URL, params=params, headers=headers, timeout=30)
        
        # Log response details
        logger.info(f"📊 Response status: {resp.status_code}")
        logger.info(f"📊 Response headers: {dict(resp.headers)}")
        logger.info(f"📊 Response text (first 200 chars): {resp.text[:200]}")
        
        # Check if response is JSON
        content_type = resp.headers.get('Content-Type', '')
        if 'json' not in content_type.lower():
            logger.error(f"❌ Expected JSON but got Content-Type: {content_type}")
            logger.error(f"❌ Full response text: {resp.text}")
            raise RuntimeError(f"HDFC API returned non-JSON response (Content-Type: {content_type})")
        
        # Try to parse JSON
        try:
            data = resp.json()
        except ValueError as e:
            logger.error(f"❌ Failed to parse JSON response: {e}")
            logger.error(f"❌ Raw response text: {resp.text}")
            raise RuntimeError(f"HDFC API returned invalid JSON: {str(e)}")
        
        # Extract token_id
        token_id = data.get('tokenId') or data.get('tokenid') or data.get('token_id')
        
        if not token_id:
            logger.error(f"❌ No tokenid in response. Full data: {data}")
            raise RuntimeError(f"No tokenid returned from HDFC. Response: {data}")
        
        logger.info(f"✅ Successfully got tokenid: {token_id[:10]}...")
        return token_id
        
    except requests.exceptions.RequestException as e:
        logger.exception(f"❌ Network error calling HDFC API: {e}")
        raise RuntimeError(f"Failed to connect to HDFC API: {str(e)}")
    except Exception as e:
        logger.exception(f"❌ Unexpected error in get_token_id: {e}")
        raise

def login_validate(token_id: str, username: str, password: str) -> dict:
    """
    Start login validate: sends credentials, returns two-fa response.
    """
    params = {'api_key': HDFC_API_KEY, 'tokenid': token_id}
    payload = {'username': username, 'password': password}
    headers = {
        'User-Agent': 'Family-Investment-Dashboard/1.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
    }
    
    logger.info(f"🔐 Login validate for user: {username}")
    
    try:
        resp = requests.post(HDFC_LOGIN_VALIDATE_URL, data=payload, params=params, headers=headers, timeout=30)
        
        logger.info(f"📊 Login validate response status: {resp.status_code}")
        logger.info(f"📊 Login validate response: {resp.text[:200]}")
        
        resp.raise_for_status()
        data = resp.json()
        
        logger.info(f"✅ Login validate successful")
        return data
        
    except Exception as e:
        logger.exception(f"❌ Login validate failed: {e}")
        raise

def validate_otp(token_id: str, otp: str) -> dict:
    """
    Send OTP and receive request_token + callback_url + authorised boolean.
    """
    params = {'api_key': HDFC_API_KEY, 'tokenid': token_id}
    payload = {'answer': otp}
    url = "https://developer.hdfcsec.com/oapi/v1/twofa/validate"
    headers = {
        'User-Agent': 'Family-Investment-Dashboard/1.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
    }
    
    logger.info(f"🔢 Validating OTP...")
    
    try:
        resp = requests.post(url, data=payload, params=params, headers=headers, timeout=30)
        
        logger.info(f"📊 OTP validate response status: {resp.status_code}")
        logger.info(f"📊 OTP validate response: {resp.text}")
        
        resp.raise_for_status()
        data = resp.json()
        
        logger.info(f"✅ OTP validation successful: {data}")
        return data
        
    except Exception as e:
        logger.exception(f"❌ OTP validation failed: {e}")
        raise

def fetch_access_token(token_id: str, request_token: str) -> Optional[str]:
    """
    Exchange request_token for an access token.
    """
    params = {'api_key': HDFC_API_KEY, 'request_token': request_token}
    payload = {'apiSecret': HDFC_API_SECRET}
    headers = {
        'User-Agent': 'Family-Investment-Dashboard/1.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
    }
    
    logger.info(f"🔄 Exchanging request_token for access_token...")
    
    try:
        resp = requests.post(HDFC_ACCESS_TOKEN_URL, data=payload, params=params, headers=headers, timeout=30)
        
        logger.info(f"📊 Access token response status: {resp.status_code}")
        logger.info(f"📊 Access token response: {resp.text[:200]}")
        
        resp.raise_for_status()
        data = resp.json()
        
        access_token = data.get('accessToken')
        
        if not access_token:
            logger.error(f"❌ No access token in response: {data}")
            return None
        
        logger.info(f"✅ Got access token: {access_token[:10]}...")
        return access_token
        
    except Exception as e:
        logger.exception(f"❌ Failed to fetch access token: {e}")
        return None

def get_holdings(access_token_or_request_token: str) -> dict:
    """
    Fetch holdings from HDFC holdings endpoint.
    """
    headers = {
        'Authorization': f'Bearer {access_token_or_request_token}',
        'User-Agent': 'Family-Investment-Dashboard/1.0',
        'Accept': 'application/json'
    }
    
    logger.info(f"📥 Fetching holdings...")
    
    try:
        resp = requests.get(HDFC_HOLDINGS_URL, headers=headers, timeout=30)
        
        logger.info(f"📊 Holdings response status: {resp.status_code}")
        logger.info(f"📊 Holdings response: {resp.text[:500]}")
        
        resp.raise_for_status()
        data = resp.json()
        
        logger.info(f"✅ Successfully fetched holdings")
        return data
        
    except Exception as e:
        logger.exception(f"❌ Failed to fetch holdings: {e}")
        raise

# Rest of your functions remain the same...
# (normalize_holdings_payload, map_holdings_for_frontend, process_holdings_success, etc.)
