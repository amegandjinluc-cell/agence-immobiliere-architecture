// API helper
// Local dev: relative URL (served by Express on port 3001)
// Production (Netlify): direct function URL
const IS_PROD = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
const API_BASE = IS_PROD
  ? 'https://imaginative-pudding-9d3bc7.netlify.app/.netlify/functions/api'
  : '';

async function fetchBiens(filters = {}) {
  const qs = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/biens${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error('Erreur API');
  return res.json();
}

async function fetchBien(id) {
  const res = await fetch(`${API_BASE}/biens/${id}`);
  if (!res.ok) throw new Error('Bien non trouvé');
  return res.json();
}

async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}