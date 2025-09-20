from supabase import create_client, Client
from flask import Flask, request, render_template, jsonify, session, redirect
from flask_cors import CORS
import hdfc_investright
import os  # ✅ make sure this is here before you use os
from datetime import datetime


# Supabase config (set these in Render env variables)
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://tqjwhbwcteuvmreldgae.supabase.co")
SUPABASE_KEY = os.getenv("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTYwNDA4OSwiZXhwIjoyMDcxMTgwMDg5fQ.vzUzbdgf0cyJlXTVEHkqnsj4OtF6xdPCplBLDPEwA78")  or os.getenv("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwODksImV4cCI6MjA3MTE4MDA4OX0.g4ksBnP-IjpIdu6l0zaiOTJGMTCDoh32kNG9GFGzdTw")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# -------------------------
# CALLBACK
# -------------------------
@app.route("/api/callback", methods=["GET", "POST"])
def callback():
    print("📞 Callback received!")

    token_id = session.get("token_id")
    request_token = session.get("request_token")

    if not token_id or not request_token:
        return jsonify({"error": "Session expired"}), 400

    try:
        holdings_data = None

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

        # ✅ Save to Supabase and return result
        return process_holdings_success(holdings_data)

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"💥 Error in callback: {e}")
        print(error_trace)
        return jsonify({"error": str(e), "trace": error_trace}), 500


# -------------------------
# PROCESS HOLDINGS SUCCESS
# -------------------------
def process_holdings_success(holdings_data):
    """
    Process HDFC holdings and insert into Supabase investments table.
    """
    try:
        if not isinstance(holdings_data, list):
            holdings_data = holdings_data.get("data", [])

        inserted_count = 0
        for h in holdings_data:
            # Map member_id & investment_type
            if h.get("exchange") in ["BSE", "NSE"]:
                member_id = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"  # Pradeep
                investment_type = "equity"
            elif h.get("asset_class") == "MUTUAL_FUND" or "folio" in h:
                member_id = "d3a4fc84-a94b-494d-915f-60901f16d973"  # Sanchita
                investment_type = "mutualFunds"
            else:
                member_id = "bef9db5e-2f21-4038-8f3f-f78ce1bbfb49"
                investment_type = "other"

            data = {
                "member_id": member_id,
                "investment_type": investment_type,
                "company_name": h.get("company_name"),
                "authorised_quantity": h.get("authorised_quantity", 0),
                "average_price": h.get("average_price", 0),
                "brokerplatform": "HDFC Securities",
                "close_price": h.get("close_price", 0),
                "collateral_quantity": h.get("collateral_quantity", 0),
                "corporate_action_indicator": h.get("corporate_action_indicator"),
                "corporate_action_message": h.get("corporate_action_message"),
                "createdat": datetime.utcnow().isoformat(),
                "day_change": h.get("day_change", 0),
                "day_change_percentage": h.get("day_change_percentage", 0),
                "discrepancy": h.get("discrepancy", False),
                "hdfcdata": h,  # raw JSON
                "instrument_token": h.get("instrument_token"),
                "investment_value": h.get("investment_value", 0),
                "isin": h.get("isin"),
                "ltcg_quantity": h.get("ltcg_quantity", 0),
                "mtf_indicator": h.get("mtf_indicator"),
                "pnl": h.get("pnl", 0),
                "quantity": h.get("quantity", 0),
                "realised": h.get("realised", 0),
                "sector_name": h.get("sector_name"),
                "security_id": h.get("security_id"),
                "sip_indicator": h.get("sip_indicator"),
                "t1_quantity": h.get("t1_quantity", 0),
                "used_quantity": h.get("used_quantity", 0),
            }

            resp = supabase.table("investments").insert(data).execute()
            if resp.data:
                inserted_count += 1
            else:
                print("⚠️ Insert error:", resp)

        print(f"✅ Inserted {inserted_count} holdings into Supabase")
        return jsonify({"status": "success", "inserted": inserted_count}), 200

    except Exception as e:
        import traceback
        print("❌ Error in process_holdings_success:", e)
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
