from flask import Flask, request, render_template, jsonify, session, redirect
from flask_session import Session
import hdfc_investright
import redis
import os

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "super-secret-key")

# Session configuration (for Redis)
app.config["SESSION_TYPE"] = "redis"
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_USE_SIGNER"] = True
app.config["SESSION_KEY_PREFIX"] = "hdfc:"
app.config["SESSION_REDIS"] = redis.from_url(os.environ.get("REDIS_URL"))

Session(app)

API_KEY = os.getenv("HDFC_API_KEY")
API_SECRET = os.getenv("HDFC_API_SECRET")

@app.route("/", methods=["GET"])
def home():
    return render_template("login.html")

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

@app.route("/holdings", methods=["POST"])
def holdings():
    otp = request.form.get("otp")
    token_id = request.form.get("tokenid") or session.get("token_id")
    
    if not token_id:
        return jsonify({"error": "Session expired. Please login again."}), 401
    
    try:
        # Validate OTP
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

        # Return redirect response to frontend
        return jsonify({
            "status": "redirect_required",
            "redirect_url": callback_url,
            "message": "Please complete authorization"
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/api/callback", methods=["GET", "POST"])
def callback():
    print("📞 Callback received!")
    
    token_id = session.get("token_id")
    request_token = session.get("request_token")
    
    if not token_id or not request_token:
        return "Session expired", 400
    
    try:
        # SKIP Step 1: Authorization is already done (authorised=true in OTP response)
        print("✅ Authorization already completed during OTP validation")
        
        # Step 2: Try using request_token directly for holdings
        print("🔄 Using request_token directly for holdings...")
        try:
            holdings_data = hdfc_investright.get_holdings(request_token)
            return process_holdings_success(holdings_data)
        except Exception as direct_error:
            print(f"Direct request_token failed: {direct_error}")
        
        # Step 3: Try getting access_token (corrected endpoint)
        print("🔄 Attempting to get access_token...")
        try:
            access_token = hdfc_investright.fetch_access_token(token_id, request_token)
            print("Access token received:", access_token[:50] + "..." if access_token else None)
            
            # Get holdings with access_token
            holdings_data = hdfc_investright.get_holdings(access_token)
            return process_holdings_success(holdings_data)
            
        except Exception as token_error:
            print(f"Access token method failed: {token_error}")
        
        # Step 4: Last resort - try different auth methods
        print("🔄 Trying fallback authentication methods...")
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

def process_holdings_success(holdings_data):
    """
    Helper function to process successful holdings retrieval
    """
    print(f"✅ Holdings retrieved successfully: {len(holdings_data) if isinstance(holdings_data, list) else 'Unknown count'}")
    
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

    # Map to member_id as per your config
    mapped = []
    member_counts = {"equity": 0, "mf": 0, "other": 0}
    
    for h in holdings:
        try:
            # Determine investment type and assign member
            if h.get("exchange") in ["BSE", "NSE"]:
                h["member_id"] = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"
                h["member_name"] = "Pradeep Kumar V"
                h["investment_type"] = "equity"
                member_counts["equity"] += 1
            elif h.get("asset_class") == "MUTUAL_FUND" or "folio" in h:
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
    
    # Clear session data
    session.pop("token_id", None)
    session.pop("request_token", None)
    
    # Return success page with detailed breakdown
    return f"""
    <html>
        <head>
            <title>HDFC Holdings Imported Successfully</title>
            <style>
                body {{ 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    text-align: center; 
                    padding: 50px; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    margin: 0;
                }}
                .success-container {{
                    background: white;
                    border-radius: 15px;
                    padding: 40px;
                    max-width: 500px;
                    margin: 0 auto;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                }}
                .stats {{
                    background: #f8f9fa;
                    border-radius: 10px;
                    padding: 20px;
                    margin: 20px 0;
                }}
                .btn {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 8px;
                    display: inline-block;
                    margin: 10px;
                }}
                .countdown {{ color: #666; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="success-container">
                <h2>🎉 Holdings Import Successful!</h2>
                
                <div class="stats">
                    <h3>📊 Import Summary</h3>
                    <p><strong>Total Holdings:</strong> {len(mapped)}</p>
                    <p><strong>Equity (Pradeep):</strong> {member_counts['equity']}</p>
                    <p><strong>Mutual Funds (Sanchita):</strong> {member_counts['mf']}</p>
                    <p><strong>Other:</strong> {member_counts['other']}</p>
                </div>
                
                <p>Your HDFC Securities holdings have been successfully imported and mapped to the appropriate family members.</p>
                
                <a href="/" class="btn">🏠 Return to Dashboard</a>
                
                <div class="countdown">
                    <p>Automatically redirecting in <span id="countdown">5</span> seconds...</p>
                </div>
            </div>
            
            <script>
                let timeLeft = 5;
                const countdownEl = document.getElementById('countdown');
                
                const timer = setInterval(() => {{
                    timeLeft--;
                    countdownEl.textContent = timeLeft;
                    
                    if (timeLeft <= 0) {{
                        clearInterval(timer);
                        window.location.href = '/';
                    }}
                }}, 1000);
            </script>
        </body>
    </html>
    """

if __name__ == "__main__":
    app.run(debug=True)
