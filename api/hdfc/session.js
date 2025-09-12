// api/hdfc/session.js
// Handles HDFC login -> 2FA -> authorize -> access token exchange
export default async function handler(req, res) {
  // CORS (allow your frontend origin in production)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { step, username, password, otp, api_key, api_secret, request_token } = req.body || {};
  if (!api_key || !api_secret) return res.status(400).json({ error: 'Missing API key or secret' });

  // helper to fetch and parse robustly
  async function safeFetch(url, opts = {}) {
    const r = await fetch(url, opts);
    const text = await r.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (e) {
      return { ok: r.ok, rawText: text, parsed: null, status: r.status };
    }
    return { ok: r.ok, parsed: data, status: r.status, rawText: text };
  }

  // add a standard User-Agent (HDFC expects it)
  const baseHeaders = {
    'User-Agent': 'Family-Investment-Dashboard/1.0 (+https://your-app.example)',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  try {
    if (step === 'initiate') {
      // Step 1: login → returns token_id/request_token or immediate access_token (if 2FA not required)
      if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

      const url = 'https://developer.hdfcsec.com/oapi/v1/access/token';
      const body = JSON.stringify({ username, password, api_key, api_secret });

      const result = await safeFetch(url, { method: 'POST', headers: baseHeaders, body });
      if (!result.ok) {
        // Try to surface detailed message
        const msg = result.parsed?.error || result.parsed?.message || result.rawText || 'Login failed';
        return res.status(400).json({ error: msg, details: result.parsed || result.rawText });
      }

      const d = result.parsed || {};
      // Defensive extraction: token_id, request_token, access_token may be nested in `data` or flat
      const dataBlock = d.data || d;
      const tokenId = dataBlock.request_token || dataBlock.token_id || dataBlock.requestToken || null;
      const accessToken = dataBlock.access_token || dataBlock.accessToken || d.access_token || null;

      if (accessToken) {
        // direct success (no 2FA required)
        return res.status(200).json({ access_token: accessToken, user_info: dataBlock.user_info || {} });
      }

      if (tokenId) {
        // 2FA required — send token_id back to client (they will enter OTP)
        return res.status(200).json({ requires_2fa: true, request_token: tokenId });
      }

      // fallback: unknown response
      return res.status(400).json({ error: 'Unexpected login response', details: d });
    }

    else if (step === 'verify') {
      // Step 2: validate OTP using token_id & answer (OTP)
      if (!otp || !request_token) return res.status(400).json({ error: 'Missing OTP or request_token' });

      // HDFC validate endpoint expects token_id in query and JSON body with "answer"
      // Example: POST /oapi/v1/twofa/validate?api_key=...&token_id=...
      const validateUrl = `https://developer.hdfcsec.com/oapi/v1/twofa/validate?api_key=${encodeURIComponent(api_key)}&token_id=${encodeURIComponent(request_token)}`;

      const result = await safeFetch(validateUrl, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({ answer: String(otp) })
      });

      if (!result.ok) {
        const msg = result.parsed?.error || result.parsed?.message || result.rawText || 'OTP validation failed';
        return res.status(400).json({ error: msg, details: result.parsed || result.rawText });
      }

      // After validate, the API may return a request_token (to be authorized) or an access_token directly
      const d = result.parsed || {};
      const dataBlock = d.data || d;
      const accessToken = dataBlock.access_token || dataBlock.accessToken || d.access_token || null;
      const postRequestToken = dataBlock.request_token || dataBlock.token_id || dataBlock.requestToken || null;

      // If access_token already returned, done
      if (accessToken) {
        return res.status(200).json({ access_token: accessToken, user_info: dataBlock.user_info || {} });
      }

      // If validate returned a request_token that still needs authorization, call authorize then exchange for access_token
      if (postRequestToken) {
        // call authorize (consent/disclaimer) automatically server-side
        const authUrl = `https://developer.hdfcsec.com/oapi/v1/authorize`;
        const authPayload = { request_token: postRequestToken, api_key, consent: true };

        const authResult = await safeFetch(authUrl, {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify(authPayload)
        });

        if (!authResult.ok) {
          const msg = authResult.parsed?.error || authResult.parsed?.message || authResult.rawText || 'Authorization failed';
          return res.status(400).json({ error: msg, details: authResult.parsed || authResult.rawText });
        }

        // After authorize, we should have a final request_token (or same token). Exchange it for access_token
        const authData = authResult.parsed || {};
        const authBlock = authData.data || authData;
        const finalRequestToken = authBlock.request_token || authBlock.token_id || postRequestToken;

        // Exchange for access token
        // Some docs show GET with query params; using POST with api_key/api_secret/request_token is safe and robust
        const tokenUrl = `https://developer.hdfcsec.com/oapi/v1/access/token`;
        const tokenPayload = JSON.stringify({ api_key, api_secret, request_token: finalRequestToken });

        const tokenResult = await safeFetch(tokenUrl, {
          method: 'POST',
          headers: baseHeaders,
          body: tokenPayload
        });

        if (!tokenResult.ok) {
          const msg = tokenResult.parsed?.error || tokenResult.parsed?.message || tokenResult.rawText || 'Token exchange failed';
          return res.status(400).json({ error: msg, details: tokenResult.parsed || tokenResult.rawText });
        }

        const tokenData = tokenResult.parsed || {};
        const tokenBlock = tokenData.data || tokenData;
        const finalAccessToken = tokenBlock.access_token || tokenBlock.accessToken || tokenData.access_token || null;

        if (finalAccessToken) {
          return res.status(200).json({ access_token: finalAccessToken, user_info: tokenBlock.user_info || {} });
        }

        return res.status(500).json({ error: 'Access token not provided by HDFC after authorize', details: tokenData });
      }

      // If we reach here, ambiguous success structure
      return res.status(400).json({ error: 'OTP validate succeeded but no token returned', details: d });
    }

    else if (step === 'resend_otp') {
      // Resend OTP endpoint: expects request_token and api_key
      if (!request_token) return res.status(400).json({ error: 'Missing request_token for resend' });

      const resendUrl = `https://developer.hdfcsec.com/oapi/v1/twofa/resend?api_key=${encodeURIComponent(api_key)}&token_id=${encodeURIComponent(request_token)}`;

      const result = await safeFetch(resendUrl, { method: 'GET', headers: baseHeaders });

      if (!result.ok) {
        const msg = result.parsed?.error || result.parsed?.message || result.rawText || 'Resend OTP failed';
        return res.status(400).json({ error: msg, details: result.parsed || result.rawText });
      }

      return res.status(200).json({ success: true, message: result.parsed?.message || 'OTP resent' });
    }

    else {
      return res.status(400).json({ error: 'Invalid step. Use "initiate", "verify" or "resend_otp"' });
    }
  } catch (err) {
    console.error('Session API error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
