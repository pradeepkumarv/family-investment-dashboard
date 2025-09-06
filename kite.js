// kite.js
import { KiteConnect } from 'https://cdn.jsdelivr.net/npm/kiteconnect@3.0.0/dist/es/kiteconnect.mjs';
const API_KEY = 'ci3r8v1cbqb6e73p';
const kc = new KiteConnect({ api_key: API_KEY });
kc.setAccessToken(localStorage.getItem('kite_access_token'));
export async function fetchHoldings() {
  return (await kc.getHoldings()).data;
}
export async function fetchPositions() {
  return (await kc.getPositions()).data;
}
