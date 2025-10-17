# HDFC Import Fix - Deployment Instructions

## Problem
The server logs show the OLD code is still running, which uses `upsert` with `ON CONFLICT` that fails because there's no unique constraint. The updated code I provided needs to be deployed.

## Files to Update on Your Server

### 1. Update `hdfc_investright.py`

Replace the entire `process_holdings_success` function (around line 200-260) with this:

```python
def process_holdings_success(holdings, user_id, broker_platform="HDFC Securities"):
    """Process HDFC holdings and insert into new equity_holdings and mutual_fund_holdings tables."""
    inserted_count = 0
    errors = []

    print(f"🔄 Processing {len(holdings)} HDFC holdings...")

    # Get member IDs dynamically by name
    equity_member_id = get_member_id_by_name("pradeep kumar v", user_id)
    mf_member_id = get_member_id_by_name("sanchita pradeep", user_id)

    print(f"📋 Member IDs: Equity={equity_member_id}, MF={mf_member_id}")

    if not equity_member_id and not mf_member_id:
        print("❌ No members found. Please add 'pradeep kumar v' and 'sanchita pradeep' first.")
        return {"inserted": 0, "errors": ["No members found"]}

    # Delete old holdings first (prevents duplicates)
    if equity_member_id:
        print(f"🗑️ Deleting old equity holdings for pradeep kumar v")
        supabase.table("equity_holdings").delete().eq("user_id", user_id).eq("broker_platform", broker_platform).eq("member_id", equity_member_id).execute()

    if mf_member_id:
        print(f"🗑️ Deleting old MF holdings for sanchita pradeep")
        supabase.table("mutual_fund_holdings").delete().eq("user_id", user_id).eq("broker_platform", broker_platform).eq("member_id", mf_member_id).execute()

    for h in holdings:
        try:
            company_name = h.get("company_name") or h.get("scheme_name", "Unknown")
            quantity = float(h.get("quantity") or h.get("units") or 0)
            avg_price = float(h.get("average_price") or h.get("avg_price") or 0)
            close_price = float(h.get("close_price") or h.get("ltp") or h.get("nav") or 0)

            invested_amount = quantity * avg_price if quantity and avg_price else 0
            current_value = quantity * close_price if quantity and close_price else invested_amount

            is_mf = h.get("sip_indicator") == "Y" or "fund" in company_name.lower()

            print(f"📊 {company_name}: qty={quantity}, avg={avg_price}, close={close_price}")
            print(f"   💰 Invested={invested_amount}, Current={current_value}")

            if is_mf and mf_member_id:
                # Insert into mutual_fund_holdings
                new_row = {
                    "user_id": user_id,
                    "member_id": mf_member_id,
                    "broker_platform": broker_platform,
                    "scheme_name": company_name,
                    "scheme_code": h.get("security_id") or "",
                    "folio_number": "",
                    "fund_house": "",
                    "units": quantity,
                    "average_nav": avg_price,
                    "current_nav": close_price,
                    "invested_amount": round(invested_amount, 2),
                    "current_value": round(current_value, 2),
                    "import_date": datetime.utcnow().date().isoformat()
                }

                resp = supabase.table("mutual_fund_holdings").insert(new_row).execute()

            elif not is_mf and equity_member_id:
                # Insert into equity_holdings
                new_row = {
                    "user_id": user_id,
                    "member_id": equity_member_id,
                    "broker_platform": broker_platform,
                    "symbol": h.get("security_id") or company_name[:10].upper(),
                    "company_name": company_name,
                    "quantity": quantity,
                    "average_price": avg_price,
                    "current_price": close_price,
                    "invested_amount": round(invested_amount, 2),
                    "current_value": round(current_value, 2),
                    "import_date": datetime.utcnow().date().isoformat()
                }

                resp = supabase.table("equity_holdings").insert(new_row).execute()
            else:
                print(f"⚠️ Skipping {company_name} - no member ID available")
                continue

            if resp.data:
                inserted_count += 1
                print(f"✅ Inserted {company_name}: ₹{invested_amount:.2f} → ₹{current_value:.2f}")
            else:
                print(f"❌ Insert failed for {company_name}: {resp}")

        except Exception as e:
            msg = f"{company_name} error: {e}"
            errors.append(msg)
            print(f"❌ {msg}")

    print(f"📈 Summary: {inserted_count}/{len(holdings)} holdings processed")
    return {"inserted": inserted_count, "errors": errors}
```

### 2. Add helper function to `hdfc_investright.py`

Add this function near the top, after the SUPABASE_CLIENT initialization (around line 25):

```python
MEMBER_NAMES = {
    "equity": "pradeep kumar v",
    "mutualFunds": "sanchita pradeep"
}

def get_member_id_by_name(name, user_id):
    """Look up member ID by name"""
    try:
        result = supabase.table("family_members").select("id").eq("user_id", user_id).ilike("name", name).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]["id"]
        return None
    except Exception as e:
        print(f"Error looking up member {name}: {e}")
        return None
```

### 3. Update `app.py` callback function

Find the `/api/hdfc/callback` route and update line 214 to pass user_id:

```python
# OLD (line 214):
hdfc_investright.process_holdings_success(holdings_data["data"])

# NEW (line 214):
hdfc_investright.process_holdings_success(holdings_data["data"], user_id)
```

And add user_id extraction at the beginning of the callback function (after line 183):

```python
# Get user_id from query parameter or session
user_id = request.args.get("user_id") or session.get("user_id")
if not user_id:
    return jsonify({"error": "user_id required"}), 400
```

## Deployment Steps

### If using Render:

1. **Commit changes to your repository:**
   ```bash
   git add hdfc_investright.py app.py
   git commit -m "Fix HDFC import to use new tables and prevent duplicates"
   git push origin main
   ```

2. **Render will auto-deploy** (if auto-deploy is enabled)
   - Or manually trigger deployment in Render dashboard

3. **Wait for deployment to complete**

### If deploying manually:

1. Upload the updated `hdfc_investright.py` and `app.py` files
2. Restart the Python application
3. Check logs to verify new code is running

## Pre-Deployment Checklist

Before deploying, ensure:

1. ✅ Database tables created (run migration if not done)
2. ✅ Family members added:
   - "Pradeep Kumar V"
   - "Sanchita Pradeep"
3. ✅ Old HDFC data cleaned up (run cleanup SQL)

## Verify Deployment

After deployment, check the logs. You should see:
- ✅ `"📋 Member IDs: Equity=..., MF=..."` (not the old hardcoded IDs)
- ✅ `"🗑️ Deleting old equity holdings..."` (delete-then-insert)
- ✅ `"✅ Inserted [company name]..."` (successful inserts)
- ❌ NO MORE "ON CONFLICT" errors

## Quick Test

1. Login to HDFC via your app
2. Complete OTP
3. Check logs for the messages above
4. Refresh frontend - should see HDFC holdings appear

## Still Not Working?

If you see the same "ON CONFLICT" error after deployment:
1. Verify the new code is actually deployed (check file timestamps on server)
2. Make sure Python app restarted with new code
3. Check if there's any caching (restart Render app completely)
4. Verify the callback URL is hitting your updated server
