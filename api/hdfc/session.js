// api/hdfc/session.js

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method==='OPTIONS') return res.status(200).end();
  if (req.method!=='POST') return res.status(405).json({error:'Method not allowed'});

  const { step, username, password, otp, api_key, api_secret, request_token } = req.body||{};
  if (!api_key||!api_secret) return res.status(400).json({error:'Missing API key or secret'});

  try {
    if (step==='initiate') {
      // Step 1: login → returns request_token or access_token
      if (!username||!password) {
        return res.status(400).json({error:'Missing username or password'});
      }
      const resp = await fetch('https://developer.hdfcsec.com/oapi/v1/access/token',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({username,password,api_key,api_secret})
      });
      const text = await resp.text();
      let data={};
      try{data=JSON.parse(text);}catch(e){
        return res.status(500).json({error:'Invalid response from HDFC API',details:text.substring(0,200)});
      }
      if (resp.ok && data.data?.request_token) {
        return res.status(200).json({requires_2fa:true,request_token:data.data.request_token});
      }
      if (resp.ok && data.data?.access_token) {
        return res.status(200).json({access_token:data.data.access_token,user_info:data.data.user_info||{}});
      }
      return res.status(400).json({error:data.error||data.message||'Login failed'});
    }
    else if (step==='verify') {
      // Step 2: verify OTP → returns final access_token
      if (!otp||!request_token) {
        return res.status(400).json({error:'Missing OTP or request_token'});
      }
      const resp = await fetch('https://developer.hdfcsec.com/oapi/v1/validate',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({request_token,otp})
      });
      const text = await resp.text();
      let data={};
      try{data=JSON.parse(text);}catch(e){
        return res.status(500).json({error:'Invalid OTP response from HDFC API',details:text.substring(0,200)});
      }
      if (resp.ok && (data.data?.access_token||data.access_token)) {
        const token = data.data?.access_token||data.access_token;
        const info  = data.data?.user_info||data.user_info||{};
        return res.status(200).json({access_token:token,user_info:info});
      }
      return res.status(400).json({error:data.error||data.message||'OTP validation failed'});
    }
    else {
      return res.status(400).json({error:'Invalid step. Use "initiate" or "verify"'});
    }
  }
  catch(err){
    console.error('Session API error:',err);
    return res.status(500).json({error:'Internal server error'});
  }
}
