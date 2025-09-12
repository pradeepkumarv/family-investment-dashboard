// api/hdfc/holdings.js

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method==='OPTIONS') return res.status(200).end();
  if (req.method!=='POST') return res.status(405).json({error:'Method not allowed'});

  const { access_token, api_key } = req.body||{};
  if (!access_token||!api_key) return res.status(400).json({error:'Missing access_token or api_key'});

  try {
    const resp = await fetch('https://developer.hdfcsec.com/oapi/v1/holdings',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Accept':'application/json',
        'Authorization':access_token,
        'X-API-Key':api_key
      },
      body:JSON.stringify({api_key})
    });
    const data = await resp.json();
    if (resp.ok) {
      return res.status(200).json({status:'success',data:data.data});
    } else {
      return res.status(400).json({status:'error',error:data.error||'Failed to fetch holdings'});
    }
  } catch(err){
    console.error('Holdings API error:',err);
    return res.status(500).json({status:'error',error:'Internal server error'});
  }
}
