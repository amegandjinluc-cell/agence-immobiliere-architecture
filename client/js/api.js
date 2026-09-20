// API helper
const API_BASE = '';

async function fetchBiens(filters = {}) {
  const qs = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/api/biens${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error('Erreur API');
  return res.json();
}

async function fetchBien(id) {
  const res = await fetch(`${API_BASE}/api/biens/${id}`);
  if (!res.ok) throw new Error('Bien non trouvé');
  return res.json();
}

async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}
