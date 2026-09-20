const express = require('express');
const multer = require('multer');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { query, all, run } = require('../models/db');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => { cb(null, file.mimetype.startsWith('image/')); } });

// GET liste avec filtres
router.get('/', async (req, res) => {
  try {
    const { type, statut, localite, search, minPrice, maxPrice } = req.query;
    let sql = 'SELECT * FROM biens WHERE 1=1';
    const params = [];
    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (statut) { sql += ' AND statut = ?'; params.push(statut); }
    if (localite) { sql += ' AND localite LIKE ?'; params.push('%' + localite + '%'); }
    if (search) { sql += ' AND (titre LIKE ? OR description LIKE ?)'; params.push('%' + search + '%', '%' + search + '%'); }
    if (minPrice) { sql += ' AND prix >= ?'; params.push(minPrice); }
    if (maxPrice) { sql += ' AND prix <= ?'; params.push(maxPrice); }
    sql += ' ORDER BY created_at DESC';

    const biens = await all(sql, params);
    for (const b of biens) { b.photos = await all('SELECT * FROM photos WHERE bien_id = ? ORDER BY ordre', [b.id]); }
    res.json(biens);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }); }
});

// GET detail
router.get('/:id', async (req, res) => {
  try {
    const b = await query('SELECT * FROM biens WHERE id = ?', [req.params.id]);
    if (!b) return res.status(404).json({ error: 'Bien introuvable' });
    b.photos = await all('SELECT * FROM photos WHERE bien_id = ? ORDER BY ordre', [b.id]);
    res.json(b);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }); }
});

// POST créer
router.post('/', authMiddleware, upload.array('photos', 10), async (req, res) => {
  try {
    const { type, titre, description, prix, devise, localite, quartier, statut, pieces, superficie, equipements } = req.body;
    const result = await run(
      `INSERT INTO biens (type, titre, description, prix, devise, localite, quartier, statut, pieces, superficie_m2, equipements) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [type, titre, description, prix, devise || 'FCFA', localite, quartier, statut || 'Disponible', pieces, superficie, equipements]
    );
    if (req.files) for (let i = 0; i < req.files.length; i++) await run('INSERT INTO photos (bien_id, url, ordre) VALUES (?,?,?)', [result.lastID, '/uploads/' + req.files[i].filename, i]);
    res.status(201).json({ id: result.lastID, message: 'Bien créé' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }); }
});

// PUT modifier
router.put('/:id', authMiddleware, upload.array('photos', 10), async (req, res) => {
  try {
    const { type, titre, description, prix, devise, localite, quartier, statut, pieces, superficie, equipements } = req.body;
    await run(`UPDATE biens SET type=?,titre=?,description=?,prix=?,devise=?,localite=?,quartier=?,statut=?,pieces=?,superficie_m2=?,equipements=? WHERE id=?`, [type,titre,description,prix,devise||'FCFA',localite,quartier,statut,pieces,superficie,equipements,req.params.id]);
    if (req.files) for (let i = 0; i < req.files.length; i++) await run('INSERT INTO photos (bien_id, url, ordre) VALUES (?,?,?)', [req.params.id, '/uploads/' + req.files[i].filename, i]);
    res.json({ message: 'Bien mis à jour' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }); }
});

// DELETE
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await run('DELETE FROM photos WHERE bien_id = ?', [req.params.id]);
    await run('DELETE FROM biens WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bien supprimé' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur serveur' }); }
});

module.exports = router;
