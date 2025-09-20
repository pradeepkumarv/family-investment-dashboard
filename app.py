from flask import Flask, request, render_template, jsonify, session, redirect, url_for
from flask_cors import CORS
import hdfc_investright
import os
import json

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "super-secret-key-change-this")

# Enable CORS for all routes
CORS(app, origins=[
    "https://family-investment-dashboard.onrender.com", 
    "http://localhost:3000", 
    "https://pradeepkumarv.github.io"
])

API_KEY = os.getenv("HDFC_API_KEY")
API_SECRET = os.getenv("HDFC_API_SECRET")

@app.route("/", methods=["GET"])
def home():
    """Main authentication page with return URL support"""
    return_url = request.args.get('return_url', '')
    action = request.args.get('action', '')
    
    return render_template("login.html", 
                          return_url=return_url, 
                          action=action)

@app.route("/request-otp", methods=["POST"])
def request_otp():
    """Request OTP for HDFC authentication"""
    username = request.form.get("username")
    password = request.form.get("password")
    return_url = request.form.get("return_url", "")
    
    try:
        # STEP 1: Get fresh token_id (only do this ONCE per login session)
        token_id = hdfc_investright.get_token_id()
        print(f"🔑 Generated NEW token_id for this session: {token_id}")
        
        # STEP 2: Store in session for later use in OTP validation
        session["token_id"] = token_id
        session["username"] = username
        session["password"] = password
        session["return_url"] = return_url
        
        # STEP 3: Validate credentials (triggers OTP)
        result = hdfc_investright.login_validate(token_id, username, password)
        print("Login validate response:", result)
        
        # STEP 4: Render OTP form with the SAME token_id
        return render_template("otp.html", 
                              tokenid=token_id, 
                              return_url=return_url)
    except Exception as e:
        print(f"❌ Error in request_otp: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/holdings", methods=["POST"])
def holdings():
    """Validate OTP and redirect to callback"""
    otp = request.form.get("otp")
    token_id_from_form = request.form.get("tokenid")
    token_id_from_session = session.get("token_id")
    return_url = session.get("return_url", "")
    
    # Use token_id from session (most reliable)
    token_id = token_id_from_session or token_id_from_form
    
    if not token_id:
        return jsonify({"error": "Session expired. Please login again."}), 401
    
    print(f"🔍 OTP Validation Debug:")
    print(f"  OTP: {otp}")
    print(f"  Token from form: {token_id_from_form}")
    print(f"  Token from session: {token_id_from_session}")
    print(f"  Using token_id: {token_id}")
    
    try:
        # CRITICAL: Use the EXACT SAME token_id from the session
        otp_result = hdfc_investright.validate_otp(token_id, otp)
        
        if not otp_result.get("authorised"):
            return jsonify({"error": "OTP validation failed!"}), 400
        
        # Get callback URL for redirect
        callback_url = otp_result.get("callbackUrl")
        if not callback_url:
            return jsonify({"error": "No callback URL received"}), 400
        
        # Store request_token in session for use in callback
        request_token = otp_result.get("requestToken")
        session["request_token"] = request_token
        
        print(f"✅ OTP validation successful!")
        print(f"  Request token: {request_token[:50]}..." if request_token else None)
        print(f"  Callback URL: {callback_url}")
        
        # Return redirect response to frontend
        return jsonify({
            "status": "redirect_required",
            "redirect_url": callback_url,
            "message": "Please complete authorization"
        })
        
    except Exception as e:
        print(f"❌ Error in holdings (OTP validation): {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/callback", methods=["GET", "POST"])
def callback():
    """Handle HDFC callback and process holdings"""
    print("📞 Callback received!")
    
    token_id = session.get("token_id")
    request_token = session.get("request_token")
    return_url = session.get("return_url", "")
    
    print(f"🔍 Callback Debug:")
    print(f"  Token ID: {token_id}")
    print(f"  Request Token: {request_token[:50]}..." if request_token else None)
    print(f"  Return URL: {return_url}")
    
    if not token_id or not request_token:
        return "Session expired - please restart authentication", 400
    
    try:
        print("✅ Authorization already completed during OTP validation")
        
        # Try Method 1: Use request_token directly
        print("🔄 Method 1: Using request_token directly for holdings...")
        try:
            holdings_data = hdfc_investright.get_holdings(request_token)
            return process_holdings_success(holdings_data, return_url)
        except Exception as direct_error:
            print(f"❌ Method 1 failed: {direct_error}")
        
        # Try Method 2: Convert to access_token first
        print("🔄 Method 2: Converting to access_token...")
        try:
            access_token = hdfc_investright.fetch_access_token(token_id, request_token)
            print(f"✅ Got access token: {access_token[:50]}...")
            
            holdings_data = hdfc_investright.get_holdings(access_token)
            return process_holdings_success(holdings_data, return_url, access_token)
        except Exception as token_error:
            print(f"❌ Method 2 failed: {token_error}")
        
        # Try Method 3: Fallback methods
        print("🔄 Method 3: Trying fallback authentication...")
        holdings_data = hdfc_investright.get_holdings_with_fallback(request_token, token_id)
        return process_holdings_success(holdings_data, return_url)
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"💥 Error in callback: {e}")
        print(error_trace)
        
        # Redirect back to original dashboard with error
        if return_url:
            error_redirect = f"{return_url}?auth_status=error&error={str(e)}"
            return redirect(error_redirect)
        
        return f"""
        <h2>❌ Authentication Failed</h2>
        <p>Failed to import holdings: {str(e)}</p>
        <a href="{return_url if return_url else '/'}">Try Again</a>
        <pre>{error_trace}</pre>
        """, 500

def process_holdings_success(holdings_data, return_url="", access_token=None):
    """Helper function to process successful holdings retrieval"""
    print(f"✅ Holdings retrieved successfully!")
    
    # Handle different response formats
    if isinstance(holdings_data, dict):
        if 'data' in holdings_data:
            holdings = holdings_data['data']
        else:
            holdings = [holdings_data]
    elif isinstance(holdings_data, list):
        holdings = holdings_data
    else:
        holdings = []
    
    print(f"📊 Processing {len(holdings)} holdings...")
    
    # Map to member_id as per your config
    mapped = []
    member_counts = {"equity": 0, "mf": 0, "other": 0}
    
    for h in holdings:
        try:
            # Determine investment type and assign member
            if h.get("exchange") in ["BSE", "NSE"] or h.get("security_id"):
                h["member_id"] = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"
                h["member_name"] = "Pradeep Kumar V"
                h["investment_type"] = "equity"
                member_counts["equity"] += 1
            elif h.get("asset_class") == "MUTUAL_FUND" or "folio" in h or h.get("company_name", "").upper().find("FUND") != -1:
                h["member_id"] = "d3a4fc84-a94b-494d-915c-60901f16d973"
                h["member_name"] = "Sanchita Pradeep"
                h["investment_type"] = "mutualFunds"
                member_counts["mf"] += 1
            else:
                h["member_id"] = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"
                h["member_name"] = "Pradeep Kumar V"
                h["investment_type"] = "other"
                member_counts["other"] += 1
            
            mapped.append(h)
            
        except Exception as mapping_error:
            print(f"⚠️ Error mapping holding: {mapping_error}")
            h["member_id"] = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"
            h["member_name"] = "Pradeep Kumar V"
            h["investment_type"] = "unknown"
            mapped.append(h)
    
    print(f"📈 Final counts - Equity: {member_counts['equity']}, MF: {member_counts['mf']}, Other: {member_counts['other']}")
    
    # Store holdings in session for potential API access
    session["holdings_data"] = mapped
    
    # Clear authentication session data
    session.pop("token_id", None)
    session.pop("request_token", None)
    
    # If there's a return URL, redirect back to dashboard with success status
    if return_url:
        success_redirect = f"{return_url}?auth_status=success"
        if access_token:
            success_redirect += f"&auth_token={access_token[:50]}..."
        
        # Add holdings count to URL
        success_redirect += f"&equity_count={member_counts['equity']}&mf_count={member_counts['mf']}"
        
        return redirect(success_redirect)
    
    # Return success page with detailed breakdown
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>HDFC Securities - Import Successful</title>
        <style>
            body {{ font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }}
            .success {{ background: #d1fae5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; }}
            .counts {{ background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }}
            .button {{ background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 20px; }}
        </style>
        <script>
            setTimeout(function() {{
                window.location.href = "{return_url if return_url else '/'}";
            }}, 5000);
        </script>
    </head>
    <body>
        <div class="success">
            <h2>✅ HDFC Securities Import Successful!</h2>
            
            <div class="counts">
                <h3>Holdings Summary:</h3>
                <p><strong>Total Holdings:</strong> {len(mapped)}</p>
                <p><strong>Equity (Pradeep):</strong> {member_counts['equity']}</p>
                <p><strong>Mutual Funds (Sanchita):</strong> {member_counts['mf']}</p>
                <p><strong>Other:</strong> {member_counts['other']}</p>
            </div>
            
            <p>Your HDFC Securities holdings have been successfully imported and mapped to the appropriate family members.</p>
            
            <a href="{return_url if return_url else '/'}" class="button">🏠 Return to Dashboard</a>
            
            <p><small>Automatically redirecting in 5 seconds...</small></p>
        </div>
    </body>
    </html>
    """

@app.route("/api/holdings", methods=["GET", "POST"])
def api_holdings():
    """API endpoint for fetching holdings data"""
    if request.method == "POST":
        data = request.get_json()
        access_token = data.get("access_token")
        holdings_type = data.get("type", "equity")
        
        if not access_token:
            return jsonify({"error": "Access token required"}), 400
            
        try:
            holdings_data = hdfc_investright.get_holdings(access_token)
            return jsonify(holdings_data)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    # GET method - return stored holdings from session
    holdings_data = session.get("holdings_data", [])
    return jsonify({"data": holdings_data})

@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "HDFC Securities integration service running"})

# Debug endpoint for testing
@app.route("/debug", methods=["GET"])
def debug():
    """Debug endpoint to test token generation"""
    try:
        token_id = hdfc_investright.get_token_id()
        return jsonify({
            "status": "success",
            "token_id": token_id,
            "message": "Token generated successfully"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
