const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database', 'immobilier.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('Erreur DB:', err);
  else console.log('✅ SQLite connecté:', DB_PATH);
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS biens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('Maison','Appartement','Immeuble','Terrain','Bureau','Autre')),
    titre TEXT NOT NULL,
    description TEXT,
    prix REAL NOT NULL,
    devise TEXT DEFAULT 'FCFA',
    localite TEXT NOT NULL,
    quartier TEXT,
    statut TEXT DEFAULT 'Disponible' CHECK(statut IN ('Disponible','Loué','Vendu','Sous compromis')),
    pieces INTEGER,
    superficie_m2 REAL,
    equipements TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bien_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    ordre INTEGER DEFAULT 0,
    FOREIGN KEY (bien_id) REFERENCES biens(id) ON DELETE CASCADE
  )`);

  // Seed admin si absent
  db.get('SELECT * FROM users WHERE email = ?', ['admin@immobilier.tg'], (err, row) => {
    if (!row) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('admin123', 10);
      db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', ['admin@immobilier.tg', hash], (err) => {
        if (err) console.error('Seed error:', err);
        else console.log('✅ Admin seed créé: admin@immobilier.tg / admin123');
      });
    }
  });
});

module.exports = db;
