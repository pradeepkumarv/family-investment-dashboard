from flask import Flask, request, render_template, jsonify, session, redirect
from flask_cors import CORS
import hdfc_investright
import traceback
import os
import requests
from datetime import datetime

# ✅ CREATE FLASK APP FIRST
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "super-secret-key")

CORS(app, resources={
    r"/api/hdfc/*": {
        "origins": ["https://pradeepkumarv.github.io", "http://localhost:5000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})


API_KEY = os.getenv("HDFC_API_KEY")
API_SECRET = os.getenv("HDFC_API_SECRET")

# -------------------------
# AUTH URL
# -------------------------
@app.route("/api/hdfc/auth-url", methods=["GET"])
def get_auth_url():
    # For now return your Render hosted login page
    auth_url = "https://family-investment-dashboard.onrender.com/"
    return jsonify({"url": auth_url})

# -------------------------
# STATUS
# -------------------------
@app.route("/api/hdfc/status", methods=["GET"])
def status():
    token = session.get("access_token")
    last_sync = session.get("last_sync")
    connected = token is not None
    return jsonify({
        "connected": connected,
        "accessToken": token,
        "lastSync": last_sync
    })

# -------------------------
# HOLDINGS
# -------------------------
@app.route("/api/hdfc/holdings", methods=["POST"])
def api_holdings():
    data = request.json or {}
    access_token = data.get("accesstoken")

    if not access_token:
        return jsonify({"error": "Missing access token"}), 400

    try:
        raw_holdings = hdfc_investright.get_holdings(access_token)
        mapped = map_holdings(raw_holdings)

        # Save sync info in session
        session["last_sync"] = datetime.utcnow().isoformat()
        session["access_token"] = access_token

        return jsonify({"data": mapped})
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        print("💥 Error in /api/hdfc/holdings:", e)
        print(traceback_str)
        return jsonify({"error": str(e), "trace": traceback_str}), 500

# -------------------------
# HELPER: MAP HOLDINGS
# -------------------------
def map_holdings(holdings):
    mapped = []
    if isinstance(holdings, dict) and "data" in holdings:
        holdings_list = holdings["data"]
    elif isinstance(holdings, list):
        holdings_list = holdings
    else:
        holdings_list = []

    for h in holdings_list:
        try:
            if h.get("exchange") in ["BSE", "NSE"]:
                h["member_id"] = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"  # Pradeep
                h["investment_type"] = "equity"
            elif h.get("asset_class") == "MUTUAL_FUND" or "folio" in h:
                h["member_id"] = "d3a4fc84-a94b-494d-915f-60901f16d973"  # Sanchita
                h["investment_type"] = "mutualFunds"
            else:
                h["member_id"] = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"
                h["investment_type"] = "other"
            mapped.append(h)
        except Exception as e:
            print("⚠️ Mapping error:", e)
            h["member_id"] = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"
            h["investment_type"] = "unknown"
            mapped.append(h)
    return mapped

# -------------------------
# LANDING
# -------------------------
@app.route("/", methods=["GET"])
def home():
    return render_template("login.html")

# -------------------------
# REQUEST OTP
# -------------------------
@app.route("/request-otp", methods=["POST"])
def request_otp():
    username = request.form.get("username")
    password = request.form.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    try:
        print(f"🔵 Requesting OTP for user: {username}")

        token_id = hdfc_investright.get_token_id()
        print(f"✅ Got token_id: {token_id}")

        session["token_id"] = token_id
        session["username"] = username
        session["password"] = password

        result = hdfc_investright.login_validate(token_id, username, password)
        print(f"✅ Login validate response: {result}")

        return render_template("otp.html", tokenid=token_id)

    except ValueError as e:
        error_msg = str(e)
        print(f"❌ ValueError in request-otp: {error_msg}")
        return jsonify({"error": f"Invalid response from HDFC: {error_msg}"}), 500
    except requests.exceptions.HTTPError as e:
        error_msg = str(e)
        print(f"❌ HTTP Error in request-otp: {error_msg}")
        return jsonify({"error": f"HDFC API error: {error_msg}"}), 500
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Unexpected error in request-otp: {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Request failed: {error_msg}"}), 500

# -------------------------
# VALIDATE OTP
# -------------------------
@app.route("/validate-otp", methods=["POST"])
def validate_otp():
    otp = request.form.get("otp")
    token_id = request.form.get("tokenid") or session.get("token_id")
    
    if not token_id:
        return jsonify({"error": "Session expired. Please login again."}), 401
    
    try:
        otp_result = hdfc_investright.validate_otp(token_id, otp)
        
        if not otp_result.get("authorised"):
            return jsonify({"error": "OTP validation failed!"}), 400

        callback_url = otp_result.get("callbackUrl")
        if not callback_url:
            return jsonify({"error": "No callback URL received"}), 400

        request_token = otp_result.get("requestToken")
        session["request_token"] = request_token

        return jsonify({
            "status": "redirect_required",
            "redirect_url": callback_url,
            "message": "Please complete authorization"
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



# -------------------------
# CALLBACK
# -------------------------
      
# -------------------------
# CALLBACK
# -------------------------
@app.route("/api/hdfc/callback", methods=["GET", "POST"])
def callback():
    try:
        holdings_data = None
        request_token = session.get("request_token")
        token_id = session.get("token_id")

        # Step 1: Try request_token directly
        try:
            holdings_data = hdfc_investright.get_holdings(request_token)
        except Exception as direct_error:
            print(f"❌ Direct request_token failed: {direct_error}")

        # Step 2: Try with access_token
        if not holdings_data:
            try:
                access_token = hdfc_investright.fetch_access_token(token_id, request_token)
                print("✅ Access token received:", access_token[:50] + "..." if access_token else None)

                holdings_data = hdfc_investright.get_holdings(access_token)
                session["access_token"] = access_token
                session["last_sync"] = datetime.utcnow().isoformat()
            except Exception as token_error:
                print(f"❌ Access token method failed: {token_error}")

        # Step 3: Fallback
        if not holdings_data:
            holdings_data = hdfc_investright.get_holdings_with_fallback(request_token, token_id)

        # ✅ Save holdings into Supabase and return response
       if holdings_data and "data" in holdings_data:
            hdfc_investright.process_holdings_success(
                holdings_data["data"],
                user_id,
                hdfc_member_ids
        )
    return jsonify({"status": "success", "count": len(holdings_data["data"])})
else:
    return jsonify({"error": "No holdings received"}), 400

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"💥 Error in callback: {e}")
        print(error_trace)
        return jsonify({"error": str(e), "trace": error_trace}), 500



# -------------------------
# PROCESS HOLDINGS SUCCESS
# -------------------------

# -------------------------
# MAIN
# -------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
