const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

function requireAdmin(req, res, next) {
  const clave = req.headers['x-admin-key'];
  if (!process.env.ADMIN_SECRET) {
    return res.status(500).json({ error: 'ADMIN_SECRET no esta configurado en el servidor' });
  }
  if (clave !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Clave de administrador invalida' });
  }
  next();
}

router.use(requireAdmin);

router.get('/pinturas', async (req, res) => {
  const result = await pool.query('SELECT * FROM pinturas ORDER BY creado_en DESC');
  res.json({ pinturas: result.rows });
});

router.post('/pinturas', async (req, res) => {
  const { nombre, imagen_url, precio, marco } = req.body;
  if (!nombre || !imagen_url || !precio || !marco) {
    return res.status(400).json({ error: 'Faltan campos (nombre, imagen_url, precio, marco)' });
  }
  if (!['bronce', 'plata', 'oro'].includes(marco)) {
    return res.status(400).json({ error: 'Marco invalido (debe ser bronce, plata u oro)' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO pinturas (nombre, imagen_url, precio, marco) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre.trim(), imagen_url, precio, marco]
    );
    res.status(201).json({ pintura: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando la pintura' });
  }
});

router.delete('/pinturas/:id', async (req, res) => {
  await pool.query('DELETE FROM pinturas WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;