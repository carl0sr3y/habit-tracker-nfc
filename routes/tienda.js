const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Listar el catalogo completo, marcando que ya compro el usuario
router.get('/', async (req, res) => {
  const pinturas = await pool.query(
    `SELECT p.*, EXISTS (
       SELECT 1 FROM compras_pinturas cp WHERE cp.usuario_id = $1 AND cp.pintura_id = p.id
     ) AS comprada
     FROM pinturas p ORDER BY precio ASC`,
    [req.usuarioId]
  );

  const usuario = await pool.query('SELECT tema_activo FROM usuarios WHERE id = $1', [req.usuarioId]);

  const temas = await pool.query(
    `SELECT t.*, EXISTS (
       SELECT 1 FROM compras_temas ct WHERE ct.usuario_id = $1 AND ct.tema_id = t.id
     ) AS comprado
     FROM temas t ORDER BY precio ASC`,
    [req.usuarioId]
  );

  res.json({
    pinturas: pinturas.rows,
    temas: temas.rows.map(t => ({ ...t, activo: t.clave === usuario.rows[0].tema_activo }))
  });
});

// Comprar una pintura
router.post('/comprar/pintura/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pinturaResult = await client.query('SELECT * FROM pinturas WHERE id = $1', [id]);
    const pintura = pinturaResult.rows[0];
    if (!pintura) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Pintura no encontrada' }); }

    const yaComprada = await client.query(
      'SELECT 1 FROM compras_pinturas WHERE usuario_id = $1 AND pintura_id = $2',
      [req.usuarioId, id]
    );
    if (yaComprada.rows[0]) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Ya tienes esta pintura' }); }

    const usuarioResult = await client.query('SELECT monedas FROM usuarios WHERE id = $1', [req.usuarioId]);
    if (usuarioResult.rows[0].monedas < pintura.precio) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No tienes suficientes monedas' });
    }

    await client.query('UPDATE usuarios SET monedas = monedas - $1 WHERE id = $2', [pintura.precio, req.usuarioId]);
    await client.query('INSERT INTO compras_pinturas (usuario_id, pintura_id) VALUES ($1, $2)', [req.usuarioId, id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al comprar' });
  } finally {
    client.release();
  }
});

// Comprar un tema
router.post('/comprar/tema/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const temaResult = await client.query('SELECT * FROM temas WHERE id = $1', [id]);
    const tema = temaResult.rows[0];
    if (!tema) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Tema no encontrado' }); }

    const yaComprado = await client.query(
      'SELECT 1 FROM compras_temas WHERE usuario_id = $1 AND tema_id = $2',
      [req.usuarioId, id]
    );
    if (yaComprado.rows[0]) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Ya tienes este tema' }); }

    const usuarioResult = await client.query('SELECT monedas FROM usuarios WHERE id = $1', [req.usuarioId]);
    if (usuarioResult.rows[0].monedas < tema.precio) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No tienes suficientes monedas' });
    }

    await client.query('UPDATE usuarios SET monedas = monedas - $1 WHERE id = $2', [tema.precio, req.usuarioId]);
    await client.query('INSERT INTO compras_temas (usuario_id, tema_id) VALUES ($1, $2)', [req.usuarioId, id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al comprar' });
  } finally {
    client.release();
  }
});

// Activar un tema ya comprado (o quitar el tema, pasando clave: null)
router.post('/activar-tema', async (req, res) => {
  const { clave } = req.body;

  if (clave) {
    const poseido = await pool.query(
      `SELECT 1 FROM compras_temas ct
       JOIN temas t ON t.id = ct.tema_id
       WHERE ct.usuario_id = $1 AND t.clave = $2`,
      [req.usuarioId, clave]
    );
    if (!poseido.rows[0]) return res.status(403).json({ error: 'No has comprado este tema' });
  }

  await pool.query('UPDATE usuarios SET tema_activo = $1 WHERE id = $2', [clave || null, req.usuarioId]);
  res.json({ ok: true });
});

module.exports = router;
