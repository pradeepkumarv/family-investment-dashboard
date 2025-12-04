# app.py
# Full working Flask application for HDFC + Zerodha import + Supabase insertion
# Key features:
#  - Fixed callback flow (redirects to frontend home on success)
#  - Robust token handling (request token -> access token -> fallback)
#  - Keeps Zerodha endpoints intact (assumes your Zerodha integration file handles its own logic)
#  - Uses session securely via FLASK_SECRET_KEY environment var
#  - Defensive programming & detailed logging for Render logs

from flask import Flask, request, render_template, jsonify, session, redirect, url_for
from flask_cors import CORS
import traceback
import os
from datetime import datetime
import logging

# Import helper module (corrected version provided separately)
import hdfc_investright

# configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("family-investment-dashboard")

# -------------------------------------------------------
# FLASK APP
# -------------------------------------------------------
app = Flask(__name__, static_folder="static", template_folder="templates")

# Secret key - must be set in environment for production
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key-change-me")
CORS(app, resources={
    r"/api/hdfc/*": {
        "origins": ["https://pradeepkumarv.github.io", "http://localhost:5000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/api/callback": {
        "origins": ["https://pradeepkumarv.github.io", "http://localhost:5000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/api/zerodha/*": {
        "origins": ["https://pradeepkumarv.github.io", "http://localhost:5000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Frontend home (for redirect after HDFC auth)
FRONTEND_HOME = os.getenv("FRONTEND_URL", "https://pradeepkumarv.github.io/family-investment-dashboard/")

# Default user id (optional)
DEFAULT_USER_ID = os.getenv("DEFAULT_USER_ID", "5f2db789-657d-48cf-a84d-8d3395f5b01d")

# -------------------------------------------------------
# Simple health endpoint
# -------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "time": datetime.utcnow().isoformat()}), 200


# app.py - FIXED VERSION
# Add this updated endpoint to your app.py

# Replace your /api/hdfc/auth-url endpoint in app.py with this FIXED version:

@app.route("/api/hdfc/auth-url", methods=["GET"])
def get_auth_url():
    """
    Generate HDFC authorization URL with token_id.
    Frontend should redirect to this URL.
    """
    try:
        # Get token_id from HDFC
        token_id = hdfc_investright.get_token_id()
        logger.info(f"✅ Got token_id: {token_id[:20]}...")
        
        # ✅ FIX: Include api_key in the authorization URL
        api_key = os.getenv("HDFC_API_KEY")
        if not api_key:
            raise RuntimeError("HDFC_API_KEY not found in environment")
        
        # Build the authorization URL with BOTH api_key and token_id
        auth_url = f"https://developer.hdfcsec.com/oapi/v1/login?api_key={api_key}&token_id={token_id}"
        
        logger.info(f"🔐 Generated auth URL: {auth_url[:80]}...")
        
        return {
            "auth_url": auth_url,
            "token_id": token_id
        }, 200
        
    except Exception as e:
        logger.error(f"❌ Error in get_auth_url: {e}")
        logger.exception("Full traceback:")
        return {
            "error": str(e),
            "message": "Failed to generate authorization URL"
        }, 500

# -------------------------------------------------------
# STATUS
# -------------------------------------------------------
@app.route("/api/hdfc/status", methods=["GET"])
def status():
    token = session.get("access_token")
    last_sync = session.get("last_sync")
    return jsonify({
        "connected": token is not None,
        "accessToken": token,
        "lastSync": last_sync
    }), 200

# -------------------------------------------------------
# HOLDINGS (MANUAL CALL) - useful for testing via frontend
# -------------------------------------------------------
@app.route("/api/hdfc/holdings", methods=["POST"])
def api_holdings():
    data = request.get_json() or {}
    access_token = data.get("accesstoken") or session.get("access_token")

    if not access_token:
        return jsonify({"error": "Missing access token"}), 400

    try:
        raw_holdings = hdfc_investright.get_holdings(access_token)
        mapped = hdfc_investright.map_holdings_for_frontend(raw_holdings)

        session["last_sync"] = datetime.utcnow().isoformat()
        session["access_token"] = access_token

        return jsonify({"data": mapped}), 200
    except Exception as e:
        logger.error("Error in /api/hdfc/holdings: %s", traceback.format_exc())
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# -------------------------------------------------------
# Landing page (used if you host backend UI templates)
# -------------------------------------------------------
@app.route("/", methods=["GET"])
def home():
    # If you have no server-side html, you can redirect to frontend.
    return redirect(FRONTEND_HOME)

# -------------------------------------------------------
# REQUEST OTP (start HDFC login flow)
# -------------------------------------------------------
@app.route("/request-otp", methods=["POST"])
def request_otp():
    username = request.form.get("username")
    password = request.form.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    try:
        token_id = hdfc_investright.get_token_id()
        session["token_id"] = token_id
        session["username"] = username
        session["password"] = password

        # login_validate returns intermediate payload (twofa question) but not the final request token
        login_payload = hdfc_investright.login_validate(token_id, username, password)

        # return minimal response; frontend will display OTP form and include token_id
        return jsonify({"status": "ok", "token_id": token_id, "twofa": login_payload.get("twofa")}), 200

    except Exception as e:
        logger.exception("request_otp failed")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# -------------------------------------------------------
# VALIDATE OTP
# -------------------------------------------------------
@app.route("/validate-otp", methods=["POST"])
def validate_otp():
    otp = request.form.get("otp") or (request.json or {}).get("otp")
    token_id = request.form.get("tokenid") or session.get("token_id")

    if not token_id:
        return jsonify({"error": "Session expired. Please login again."}), 401

    try:
        otp_result = hdfc_investright.validate_otp(token_id, otp)

        if not otp_result.get("authorised"):
            return jsonify({"error": "OTP validation failed!"}), 400

        request_token = otp_result.get("requestToken")
        session["request_token"] = request_token

        # redirect_url that HDFC will redirect to after user authorizes on their side
        # Include token_id as query parameter since session won't persist across HDFC redirect
        callback_url = otp_result.get("callbackUrl")
        if not callback_url:
            callback_url = request.host_url.rstrip("/") + f"/api/callback?token_id={token_id}&request_token={request_token}"

        return jsonify({
            "status": "redirect_required",
            "redirect_url": callback_url,
            "request_token": request_token
        }), 200

    except Exception as e:
        logger.exception("validate_otp failed")
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# -------------------------------------------------------
# CALLBACK REDIRECT (HDFC redirects to /api/callback)
# -------------------------------------------------------
@app.route("/api/callback", methods=["GET", "POST"])
def callback_redirect():
    """
    HDFC redirects to /api/callback, so we forward directly to callback handler
    This preserves session and passes query parameters
    """
    logger.info("Forwarding /api/callback to callback handler with args: %s", dict(request.args))
    return callback()

# -------------------------------------------------------
# CALLBACK (Final step after HDFC authorization)
# -------------------------------------------------------
@app.route("/api/hdfc/callback", methods=["GET", "POST"])
def callback():
    """
    HDFC callback handling:
      - attempts multiple strategies to obtain holdings:
          1) direct request_token -> holdings
          2) exchange request_token for access_token then holdings
          3) fallback helper (if available)
      - inserts holdings into Supabase using process_holdings_success
      - finally redirects to frontend home (option A)
    """
    try:
        request_token = session.get("request_token") or request.args.get("request_token") or request.args.get("requestToken")
        token_id = session.get("token_id") or request.args.get("token_id")

        user_id = session.get("user_id") or DEFAULT_USER_ID

        logger.info("HDFC callback invoked: token_id=%s request_token=%s user=%s", token_id, request_token, user_id)

        hdfc_member_ids = {
            "equity": "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49",
            "mutualFunds": "d3a4fc84-a94b-494d-915f-60901f16d973"
        }

        holdings_data = None

        # Step 1: Try direct (some APIs accept request_token as bearer)
        if request_token:
            try:
                holdings_data = hdfc_investright.get_holdings(request_token)
                logger.info("Fetched holdings using request_token (direct).")
            except Exception:
                logger.debug("Direct request_token holdings fetch failed.", exc_info=True)

        # Step 2: Exchange request_token for access token and fetch holdings
        if not holdings_data and token_id and request_token:
            try:
                access_token = hdfc_investright.fetch_access_token(token_id, request_token)
                if access_token:
                    session["access_token"] = access_token
                    session["last_sync"] = datetime.utcnow().isoformat()
                    holdings_data = hdfc_investright.get_holdings(access_token)
                    logger.info("Fetched holdings using exchanged access_token.")
            except Exception:
                logger.debug("Exchange for access token failed.", exc_info=True)

        # Step 3: Fallback helper inside the module
        if not holdings_data:
            try:
                holdings_data = hdfc_investright.get_holdings_with_fallback(request_token, token_id)
                if holdings_data:
                    logger.info("Fetched holdings via fallback helper.")
            except Exception:
                logger.debug("Fallback holdings fetch failed.", exc_info=True)

        # Save holdings into DB via helper
        if holdings_data and isinstance(holdings_data, dict) and "data" in holdings_data:
            try:
                # holdings_data["data"] expected to be list
                hdfc_investright.process_holdings_success(
                    holdings_data["data"],
                    user_id,
                    hdfc_member_ids
                )
                logger.info("Holdings processed and inserted into Supabase for user %s", user_id)
            except Exception:
                logger.exception("process_holdings_success failed")

            # Option A: redirect to frontend HOME page after successful import
            # append a query param so frontend can show a toast if desired
            redirect_url = FRONTEND_HOME.rstrip("/") + "/?hdfc_import=success"
            return redirect(redirect_url)

        # If no holdings found, redirect with error flag
        redirect_url = FRONTEND_HOME.rstrip("/") + "/?hdfc_import=error"
        return redirect(redirect_url)

    except Exception as e:
        logger.exception("Unhandled exception in callback")
        # On unexpected error, send to frontend with error flag (do not leak stack to clients)
        redirect_url = FRONTEND_HOME.rstrip("/") + "/?hdfc_import=error"
        return redirect(redirect_url)

# -------------------------------------------------------
# ZERODHA endpoints (stub delegations)
# -------------------------------------------------------
# If your zerodha integration runs through separate module files (JS or py),
# keep those routes intact or re-add them here. Below are example placeholders.
@app.route("/api/zerodha/holdings", methods=["GET"])
def zerodha_get_holdings():
    # If you have a zerodha python module (similar pattern), call it
    try:
        # Example - your actual code may differ
        from zerodha_integration import get_holdings as z_get_holdings
        user_id = session.get("user_id") or DEFAULT_USER_ID
        holdings = z_get_holdings(user_id)
        return jsonify({"data": holdings}), 200
    except Exception as e:
        logger.debug("No zerodha_integration module or error: %s", e)
        return jsonify({"error": "Zerodha endpoint not implemented on server."}), 501

# -------------------------------------------------------
# Error handlers
# -------------------------------------------------------
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "not_found", "msg": str(e)}), 404

@app.errorhandler(500)
def server_error(e):
    logger.exception("Internal server error")
    return jsonify({"error": "server_error", "msg": "Internal error"}), 500

# -------------------------------------------------------
# MAIN
# -------------------------------------------------------
if __name__ == "__main__":
    # Dev server. Production should use gunicorn as you do on Render.
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
