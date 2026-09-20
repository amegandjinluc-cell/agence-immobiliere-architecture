const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

const DB = {
  users: [{ id: 1, email: 'admin@immobilier.tg', password_hash: '$2a$10$z7fnZTrR//gdcwk5O6/1EeezwI.90z5ncDgBvqtchXVzkxwxElGb.', created_at: '2026-09-20T16:00:00Z' }],
  biens: [
    { id: 1, type: 'Maison', titre: 'Belle villa moderne — Gbojomé, Lomé', description: 'Magnifique villa contemporaine à Gbojomé, quartier résidentiel calme de Lomé. Façade blanche épurée, accès privatif sécurisé, idéale pour famille ou investissement.', prix: 12000000, devise: 'FCFA', localite: 'Lomé', quartier: 'Gbojomé', statut: 'Disponible', pieces: 4, superficie_m2: 120, equipements: 'Climatisation, Parking, Jardin', created_at: '2026-09-20T16:00:00Z', updated_at: '2026-09-20T16:00:00Z' },
    { id: 2, type: 'Maison', titre: 'Confortable maison familiale — Gbojomé', description: 'Maison familiale spacieuse dans le quartier Gbojomé. Pièces lumineuses, cour intérieure, quartier calme et sécurisé. Parfaite pour couple ou petite famille.', prix: 8500000, devise: 'FCFA', localite: 'Lomé', quartier: 'Gbojomé', statut: 'Disponible', pieces: 3, superficie_m2: 90, equipements: 'Parking, Cour', created_at: '2026-09-20T16:00:00Z', updated_at: '2026-09-20T16:00:00Z' }
  ],
  photos: [
    { id: 1, bien_id: 1, url: '/images/house1_main.jpg', ordre: 0 },
    { id: 2, bien_id: 1, url: '/images/house1_thumb1.jpg', ordre: 1 },
    { id: 3, bien_id: 1, url: '/images/house1_thumb2.jpg', ordre: 2 },
    { id: 4, bien_id: 1, url: '/images/house1_thumb3.jpg', ordre: 3 },
    { id: 5, bien_id: 1, url: '/images/house1_thumb4.jpg', ordre: 4 },
    { id: 6, bien_id: 1, url: '/images/house1_thumb5.jpg', ordre: 5 },
    { id: 7, bien_id: 1, url: '/images/house1_thumb6.jpg', ordre: 6 }
  ]
};

let data = JSON.parse(JSON.stringify(DB));

function verifyToken(event) {
  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch(e) { return null; }
}

function cors() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Content-Type': 'application/json' };
}

async function handler(event) {
  const headers = cors();
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const rawPath = event.path.replace('/.netlify/functions/api', '') || '/';
  const splat = event.pathParameters?.splat || '';
  const path = splat ? '/' + splat : rawPath;
  const parts = path.split('/').filter(Boolean);

  // POST /auth/login
  if (parts[0] === 'auth' && parts[1] === 'login' && event.httpMethod === 'POST') {
    try {
      const { email, password } = JSON.parse(event.body);
      const user = data.users.find(u => u.email === email);
      if (!user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Identifiants incorrects' }) };
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Identifiants incorrects' }) };
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
      return { statusCode: 200, headers, body: JSON.stringify({ token, user: { id: user.id, email: user.email } }) };
    } catch (err) { return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }; }
  }

  // GET /biens or POST /biens
  if (parts[0] === 'biens' && parts.length === 1) {
    // GET list
    if (event.httpMethod === 'GET') {
      const { type, statut, localite, search, minPrice, maxPrice } = event.queryStringParameters || {};
      let biens = [...data.biens];
      if (type) biens = biens.filter(b => b.type === type);
      if (statut) biens = biens.filter(b => b.statut === statut);
      if (localite) biens = biens.filter(b => (b.localite || '').toLowerCase().includes(localite.toLowerCase()));
      if (search) biens = biens.filter(b => (b.titre || '').toLowerCase().includes(search.toLowerCase()) || (b.description || '').toLowerCase().includes(search.toLowerCase()));
      if (minPrice) biens = biens.filter(b => b.prix >= parseFloat(minPrice));
      if (maxPrice) biens = biens.filter(b => b.prix <= parseFloat(maxPrice));
      biens.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      for (const b of biens) b.photos = data.photos.filter(p => p.bien_id === b.id).sort((a, c) => a.ordre - c.ordre);
      return { statusCode: 200, headers, body: JSON.stringify(biens) };
    }
    // POST create
    if (event.httpMethod === 'POST') {
      if (!verifyToken(event)) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Accès refusé' }) };
      const body = JSON.parse(event.body);
      const newBien = {
        id: data.biens.length > 0 ? Math.max(...data.biens.map(b => b.id)) + 1 : 1,
        type: body.type, titre: body.titre, description: body.description || '',
        prix: parseFloat(body.prix), devise: body.devise || 'FCFA',
        localite: body.localite, quartier: body.quartier || '', statut: body.statut || 'Disponible',
        pieces: body.pieces || null, superficie_m2: body.superficie || null,
        equipements: body.equipements || '',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      };
      data.biens.push(newBien);
      if (body.photos) body.photos.forEach((url, i) => { data.photos.push({ id: data.photos.length + 1, bien_id: newBien.id, url, ordre: i }); });
      return { statusCode: 201, headers, body: JSON.stringify({ id: newBien.id, message: 'Bien créé' }) };
    }
  }

  // GET /biens/:id, PUT /biens/:id, DELETE /biens/:id
  if (parts[0] === 'biens' && parts.length === 2 && event.httpMethod !== 'POST') {
    const id = parseInt(parts[1]);
    const bienIndex = data.biens.findIndex(b => b.id === id);
    if (bienIndex === -1) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Bien introuvable' }) };

    // GET detail (no auth needed)
    if (event.httpMethod === 'GET') {
      const b = { ...data.biens[bienIndex] };
      b.photos = data.photos.filter(p => p.bien_id === id).sort((a, c) => a.ordre - c.ordre);
      return { statusCode: 200, headers, body: JSON.stringify(b) };
    }

    // PUT / DELETE require auth
    if (!verifyToken(event)) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Accès refusé' }) };

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body);
      data.biens[bienIndex] = { ...data.biens[bienIndex], ...body, id, updated_at: new Date().toISOString() };
      data.photos = data.photos.filter(p => p.bien_id !== id);
      if (body.photos) body.photos.forEach((url, i) => { data.photos.push({ id: data.photos.length + 1, bien_id: id, url, ordre: i }); });
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Bien mis à jour' }) };
    }

    if (event.httpMethod === 'DELETE') {
      data.biens.splice(bienIndex, 1);
      data.photos = data.photos.filter(p => p.bien_id !== id);
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Bien supprimé' }) };
    }
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: 'Endpoint not found' }) };
}

exports.handler = handler;
