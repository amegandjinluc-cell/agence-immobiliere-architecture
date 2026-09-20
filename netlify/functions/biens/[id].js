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
    'Access-Control-Allow-Methods': 'GET,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const token = event.headers.authorization?.replace('Bearer ', '');
  const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
  const jwt = require('jsonwebtoken');
  const id = event.pathParameters.id;

  // Verify auth
  let user = null;
  if (token) {
    try { user = jwt.verify(token, JWT_SECRET); } catch(e) {}
  }
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Accès refusé' }) };
  }

  const db = readDB();
  const bienIndex = (db.biens || []).findIndex(b => b.id === parseInt(id));

  // GET detail
  if (event.httpMethod === 'GET') {
    if (bienIndex === -1) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Bien introuvable' }) };
    }
    const b = db.biens[bienIndex];
    b.photos = (db.photos || []).filter(p => p.bien_id === b.id).sort((a, c) => a.ordre - c.ordre);
    return { statusCode: 200, headers, body: JSON.stringify(b) };
  }

  // PUT update
  if (event.httpMethod === 'PUT') {
    if (bienIndex === -1) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Bien introuvable' }) };
    }
    const body = JSON.parse(event.body);
    db.biens[bienIndex] = {
      ...db.biens[bienIndex],
      type: body.type || db.biens[bienIndex].type,
      titre: body.titre || db.biens[bienIndex].titre,
      description: body.description ?? db.biens[bienIndex].description,
      prix: body.prix !== undefined ? parseFloat(body.prix) : db.biens[bienIndex].prix,
      devise: body.devise || db.biens[bienIndex].devise,
      localite: body.localite || db.biens[bienIndex].localite,
      quartier: body.quartier ?? db.biens[bienIndex].quartier,
      statut: body.statut || db.biens[bienIndex].statut,
      pieces: body.pieces ?? db.biens[bienIndex].pieces,
      superficie_m2: body.superficie !== undefined ? parseFloat(body.superficie) : db.biens[bienIndex].superficie_m2,
      equipements: body.equipements ?? db.biens[bienIndex].equipements,
      updated_at: new Date().toISOString()
    };

    if (body.photos && Array.isArray(body.photos)) {
      db.photos = (db.photos || []).filter(p => p.bien_id !== parseInt(id));
      body.photos.forEach((url, i) => {
        db.photos.push({ id: db.photos.length + 1, bien_id: parseInt(id), url, ordre: i });
      });
    }

    writeDB(db);
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Bien mis à jour' }) };
  }

  // DELETE
  if (event.httpMethod === 'DELETE') {
    db.biens.splice(bienIndex, 1);
    db.photos = (db.photos || []).filter(p => p.bien_id !== parseInt(id));
    writeDB(db);
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Bien supprimé' }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
