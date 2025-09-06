// kite.js
import { KiteConnect } from 'https://cdn.jsdelivr.net/npm/kiteconnect@3.0.0/dist/umd/kiteconnect.js';

const API_KEY = 'ci3r8v1cbqb6e73p';

// Initialize once your app has set the access token in localStorage
const kc = new KiteConnect({ api_key: API_KEY });
kc.setAccessToken(localStorage.getItem('kite_access_token'));

export async function fetchHoldings() {
  const resp = await kc.getHoldings();
  return resp.data;
}

export async function fetchPositions() {
  const resp = await kc.getPositions();
  return resp.data;
}
