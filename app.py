from flask import Flask, request, render_template, jsonify, session
from flask_cors import CORS
import hdfc_investright
import traceback
import os
import requests
from datetime import datetime

# -------------------------------------------------------
# FLASK APP
# -------------------------------------------------------
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

# -------------------------------------------------------
# AUTH URL
# -------------------------------------------------------
@app.route("/api/hdfc/auth-url", methods=["GET"])
def get_auth_url():
    auth_url = "https://family-investment-dashboard.onrender.com/"
    return jsonify({"url": auth_url})

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
    })

# -------------------------------------------------------
# HOLDINGS (MANUAL CALL)
# -------------------------------------------------------
@app.route("/api/hdfc/holdings", methods=["POST"])
def api_holdings():
    data = request.json or {}
    access_token = data.get("accesstoken")

    if not access_token:
        return jsonify({"error": "Missing access token"}), 400

    try:
        raw_holdings = hdfc_investright.get_holdings(access_token)
        mapped = map_holdings(raw_holdings)

        session["last_sync"] = datetime.utcnow().isoformat()
        session["access_token"] = access_token

        return jsonify({"data": mapped})
    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# -------------------------------------------------------
# MAPPING LOGIC
# -------------------------------------------------------
def map_holdings(holdings):
    mapped = []

    if isinstance(holdings, dict) and "data" in holdings:
        holdings_list = holdings["data"]
    else:
        holdings_list = holdings if isinstance(holdings, list) else []

    for h in holdings_list:
        try:
            if h.get("exchange") in ["BSE", "NSE"]:
                h["member_id"] = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"
                h["investment_type"] = "equity"

            elif h.get("asset_class") == "MUTUAL_FUND" or "folio" in h:
                h["member_id"] = "d3a4fc84-a94b-494d-915f-60901f16d973"
                h["investment_type"] = "mutualFunds"

            else:
                h["member_id"] = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"
                h["investment_type"] = "other"

            mapped.append(h)

        except:
            h["member_id"] = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"
            h["investment_type"] = "unknown"
            mapped.append(h)

    return mapped

# -------------------------------------------------------
# LANDING PAGE
# -------------------------------------------------------
@app.route("/", methods=["GET"])
def home():
    return render_template("login.html")

# -------------------------------------------------------
# REQUEST OTP
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

        hdfc_investright.login_validate(token_id, username, password)

        return render_template("otp.html", tokenid=token_id)

    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# -------------------------------------------------------
# VALIDATE OTP
# -------------------------------------------------------
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

        request_token = otp_result.get("requestToken")
        session["request_token"] = request_token

        return jsonify({
            "status": "redirect_required",
            "redirect_url": otp_result.get("callbackUrl"),
            "message": "Please complete authorization"
        })

    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# -------------------------------------------------------
# CALLBACK (FINAL)
# -------------------------------------------------------
@app.route("/api/hdfc/callback", methods=["GET", "POST"])
def callback():
    try:
        request_token = session.get("request_token")
        token_id = session.get("token_id")

        user_id = "pradeep"
        hdfc_member_ids = ["bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"]

        holdings_data = None

        # Step 1: Direct holdings fetch
        try:
            holdings_data = hdfc_investright.get_holdings(request_token)
        except:
            pass

        # Step 2: Use access token
        if not holdings_data:
            try:
                access_token = hdfc_investright.fetch_access_token(token_id, request_token)
                session["access_token"] = access_token
                session["last_sync"] = datetime.utcnow().isoformat()

                holdings_data = hdfc_investright.get_holdings(access_token)
            except:
                pass

        # Step 3: Fallback
        if not holdings_data:
            holdings_data = hdfc_investright.get_holdings_with_fallback(request_token, token_id)

        # Save holdings to DB
        if holdings_data and "data" in holdings_data:
            hdfc_investright.process_holdings_success(
                holdings_data["data"],
                {
                    "equity": "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49",
                    "mutualFunds": "d3a4fc84-a94b-494d-915f-60901f16d973"
                },
                hdfc_member_ids
            )
            return jsonify({"status": "success", "count": len(holdings_data["data"])})

        return jsonify({"error": "No holdings received"}), 400

    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


# -------------------------------------------------------
# MAIN
# -------------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
