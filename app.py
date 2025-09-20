from flask import Flask, request, render_template, jsonify, session, redirect
from flask_cors import CORS
import hdfc_investright
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "super-secret-key")

# Allow your GitHub Pages front-end origin
CORS(app, resources={r"/api/hdfc/*": {"origins": "https://pradeepkumarv.github.io"}})

API_KEY = os.getenv("HDFC_API_KEY")
API_SECRET = os.getenv("HDFC_API_SECRET")

# -------------------------
# AUTH URL
# -------------------------
@app.route("/api/hdfc/auth-url", methods=["GET"])
def get_auth_url():
    """
    Build and return the authorization URL for HDFC Securities
    """
    # For now just return your Render hosted login page
    auth_url = "https://family-investment-dashboard.onrender.com/"
    return jsonify({"url": auth_url})

# -------------------------
# STATUS
# -------------------------
@app.route("/api/hdfc/status", methods=["GET"])
def status():
    """
    Return connection status, last sync, and stored access token
    """
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
    """
    Fetch holdings from HDFC using the provided access token
    """
    data = request.json or {}
    access_token = data.get("accesstoken")

    if not access_token:
        return jsonify({"error": "Missing access token"}), 400

    try:
        holdings_data = hdfc_investright.get_holdings(access_token)
        # Store sync time + token for frontend
        session["last_sync"] = datetime.utcnow().isoformat()
        session["access_token"] = access_token

        return jsonify({"data": holdings_data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
    try:
        token_id = hdfc_investright.get_token_id()
        session["token_id"] = token_id
        session["username"] = username
        session["password"] = password
        
        result = hdfc_investright.login_validate(token_id, username, password)
        print("Login validate response:", result)
        
        return render_template("otp.html", tokenid=token_id)
       
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
@app.route("/api/callback", methods=["GET", "POST"])
def callback():
    print("📞 Callback received!")
    
    token_id = session.get("token_id")
    request_token = session.get("request_token")
    
    if not token_id or not request_token:
        return "Session expired", 400
    
    try:
        # First try with request_token directly
        try:
            holdings_data = hdfc_investright.get_holdings(request_token)
            return process_holdings_success(holdings_data)
        except Exception as direct_error:
            print(f"Direct request_token failed: {direct_error}")
        
        # Then try with access_token
        try:
            access_token = hdfc_investright.fetch_access_token(token_id, request_token)
            print("Access token received:", access_token[:50] + "..." if access_token else None)
            
            holdings_data = hdfc_investright.get_holdings(access_token)
            session["access_token"] = access_token
            session["last_sync"] = datetime.utcnow().isoformat()
            return process_holdings_success(holdings_data)
        except Exception as token_error:
            print(f"Access token method failed: {token_error}")
        
        # Last resort fallback
        holdings_data = hdfc_investright.get_holdings_with_fallback(request_token, token_id)
        return process_holdings_success(holdings_data)
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"💥 Error in callback: {e}")
        print(error_trace)
        
        return f"""
        <html>
            <body>
                <h2>❌ Error</h2>
                <p>Failed to import holdings: {str(e)}</p>
                <p><a href="/">Try Again</a></p>
                <pre>{error_trace}</pre>
            </body>
        </html>
        """, 500

# -------------------------
# PROCESS HOLDINGS SUCCESS
# -------------------------
def process_holdings_success(holdings_data):
    """
    Helper function to process successful holdings retrieval
    """
    print(f"✅ Holdings retrieved successfully")

    # Save last sync time
    session["last_sync"] = datetime.utcnow().isoformat()

    # For now just return JSON
    return jsonify({"data": holdings_data})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
