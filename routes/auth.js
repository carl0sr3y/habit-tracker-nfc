const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60 * 1000
};

router.post('/registro', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Falta email o password' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (email, password_hash) VALUES ($1, $2) RETURNING id, email, monedas',
      [email.toLowerCase().trim(), hash]
    );
    const usuario = result.rows[0];
    const token = jwt.sign({ usuarioId: usuario.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, COOKIE_OPTS);
    res.json({ usuario });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error creando la cuenta' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Falta email o password' });
  }
  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, monedas FROM usuarios WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const usuario = result.rows[0];
    if (!usuario) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
    const ok = await bcrypt.compare(password, usuario.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
    const token = jwt.sign({ usuarioId: usuario.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, COOKIE_OPTS);
    res.json({ usuario: { id: usuario.id, email: usuario.email, monedas: usuario.monedas } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error iniciando sesion' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/yo', require('../middleware/auth').requireAuth, async (req, res) => {
  const result = await pool.query('SELECT id, email, monedas, tema_activo FROM usuarios WHERE id = $1', [req.usuarioId]);
  res.json({ usuario: result.rows[0] });
});

module.exports = router;