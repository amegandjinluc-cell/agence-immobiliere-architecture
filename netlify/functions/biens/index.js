const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'database', 'data.json');

function readDB() {
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const token = event.headers.authorization?.replace('Bearer ', '');
  const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
  const jwt = require('jsonwebtoken');

  // GET list
  if (event.httpMethod === 'GET') {
    try {
      const db = readDB();
      let biens = db.biens || [];
      const { type, statut, localite, search, minPrice, maxPrice } = event.queryStringParameters || {};

      if (type) biens = biens.filter(b => b.type === type);
      if (statut) biens = biens.filter(b => b.statut === statut);
      if (localite) biens = biens.filter(b => (b.localite || '').toLowerCase().includes(localite.toLowerCase()));
      if (search) biens = biens.filter(b => (b.titre || '').toLowerCase().includes(search.toLowerCase()) || (b.description || '').toLowerCase().includes(search.toLowerCase()));
      if (minPrice) biens = biens.filter(b => b.prix >= parseFloat(minPrice));
      if (maxPrice) biens = biens.filter(b => b.prix <= parseFloat(maxPrice));

      biens.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Add photos
      for (const b of biens) {
        b.photos = (db.photos || []).filter(p => p.bien_id === b.id).sort((a, c) => a.ordre - c.ordre);
      }

      return { statusCode: 200, headers, body: JSON.stringify(biens) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // POST create
  if (event.httpMethod === 'POST') {
    try {
      let user = null;
      if (token) {
        try { user = jwt.verify(token, JWT_SECRET); } catch(e) {}
      }
      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Accès refusé' }) };
      }

      const body = JSON.parse(event.body);
      const db = readDB();
      if (!db.biens) db.biens = [];
      if (!db.photos) db.photos = [];

      const newBien = {
        id: db.biens.length > 0 ? Math.max(...db.biens.map(b => b.id)) + 1 : 1,
        type: body.type,
        titre: body.titre,
        description: body.description || '',
        prix: parseFloat(body.prix),
        devise: body.devise || 'FCFA',
        localite: body.localite,
        quartier: body.quartier || '',
        statut: body.statut || 'Disponible',
        pieces: body.pieces || null,
        superficie_m2: body.superficie || null,
        equipements: body.equipements || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      db.biens.push(newBien);

      // Handle photos
      if (body.photos && Array.isArray(body.photos)) {
        body.photos.forEach((url, i) => {
          db.photos.push({ id: db.photos.length + 1, bien_id: newBien.id, url, ordre: i });
        });
      }

      writeDB(db);
      return { statusCode: 201, headers, body: JSON.stringify({ id: newBien.id, message: 'Bien créé' }) };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
