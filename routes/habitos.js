const express = require('express');
const crypto = require('crypto');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { calcularRachas } = require('../lib/rachas');

const router = express.Router();
router.use(requireAuth);

const EFECTOS_VALIDOS = ['estrellas', 'ondas', 'luciernagas'];
const MODOS_VALIDOS = ['nfc', 'manual'];

// Listar todos los habitos del usuario, con si ya se cumplio hoy y su mini-historial reciente
router.get('/', async (req, res) => {
  const result = await pool.query(
    `SELECT h.*,
       EXISTS (
         SELECT 1 FROM cumplidos c
         WHERE c.habito_id = h.id AND c.fecha = CURRENT_DATE AND c.activo = true
       ) AS cumplido_hoy
     FROM habitos h
     WHERE h.usuario_id = $1 AND h.activo = true
     ORDER BY h.creado_en ASC`,
    [req.usuarioId]
  );

  const cumplidosRecientes = await pool.query(
    `SELECT c.habito_id, c.fecha FROM cumplidos c
     JOIN habitos h ON h.id = c.habito_id
     WHERE h.usuario_id = $1 AND c.activo = true
       AND c.fecha >= (CURRENT_DATE - INTERVAL '34 days')`,
    [req.usuarioId]
  );
  const fechasPorHabito = {};
  cumplidosRecientes.rows.forEach(r => {
    const fecha = r.fecha.toISOString().slice(0, 10);
    if (!fechasPorHabito[r.habito_id]) fechasPorHabito[r.habito_id] = new Set();
    fechasPorHabito[r.habito_id].add(fecha);
  });

  const hoy = new Date();
  const ultimos35Dias = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    ultimos35Dias.push(d.toISOString().slice(0, 10));
  }

  const habitosConHistorial = result.rows.map(h => ({
    ...h,
    ultimos_dias: ultimos35Dias.map(fecha => ({
      fecha,
      cumplido: (fechasPorHabito[h.id] || new Set()).has(fecha)
    }))
  }));

  res.json({ habitos: habitosConHistorial });
});

// Crear un habito nuevo
router.post('/', async (req, res) => {
  const { nombre, color, descripcion, modo, hora_inicio, hora_fin, efecto_visual } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }
  const modoFinal = MODOS_VALIDOS.includes(modo) ? modo : 'nfc';
  const efectoFinal = EFECTOS_VALIDOS.includes(efecto_visual) ? efecto_visual : 'estrellas';

  // Si es modo nfc, generamos un identificador unico para grabar en el chip fisico
  const tagNfcId = modoFinal === 'nfc' ? crypto.randomBytes(8).toString('hex') : null;

  try {
    const result = await pool.query(
      `INSERT INTO habitos (usuario_id, nombre, color, descripcion, modo, tag_nfc_id, hora_inicio, hora_fin, efecto_visual)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.usuarioId,
        nombre.trim(),
        color || '#4f46e5',
        descripcion || null,
        modoFinal,
        tagNfcId,
        hora_inicio || null,
        hora_fin || null,
        efectoFinal
      ]
    );
    res.status(201).json({ habito: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando el habito' });
  }
});

// Obtener el detalle de un habito (incluye historial de cumplidos)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const habitoResult = await pool.query(
    'SELECT * FROM habitos WHERE id = $1 AND usuario_id = $2',
    [id, req.usuarioId]
  );
  const habito = habitoResult.rows[0];
  if (!habito) return res.status(404).json({ error: 'Habito no encontrado' });

  const historial = await pool.query(
    `SELECT fecha, marcado_en FROM cumplidos
     WHERE habito_id = $1 AND activo = true
     ORDER BY fecha DESC LIMIT 365`,
    [id]
  );

  const cumplidoHoy = await pool.query(
    `SELECT id FROM cumplidos WHERE habito_id = $1 AND fecha = CURRENT_DATE AND activo = true`,
    [id]
  );

  const trofeos = await pool.query(
    `SELECT dias, ganado_en FROM trofeos WHERE habito_id = $1 AND tipo = 'habito' ORDER BY dias ASC`,
    [id]
  );

  // Racha actual = dias consecutivos hasta hoy o ayer (si hoy aun no se ha marcado, la racha "sigue viva" hasta ayer)
  const fechasHabito = await pool.query(
    `SELECT fecha FROM cumplidos WHERE habito_id = $1 AND activo = true ORDER BY fecha ASC`,
    [id]
  );
  const { rachaActual } = calcularRachas(fechasHabito.rows.map(r => r.fecha.toISOString().slice(0, 10)));
  // Si el ultimo cumplido no fue hoy ni ayer, la racha ya se rompio (aunque el numero calculado sea de dias pasados)
  const ultimaFecha = fechasHabito.rows.length ? fechasHabito.rows[fechasHabito.rows.length - 1].fecha : null;
  let rachaVigente = 0;
  if (ultimaFecha) {
    const hoy = new Date(); hoy.setUTCHours(0, 0, 0, 0);
    const diffDias = Math.round((hoy - new Date(ultimaFecha.toISOString().slice(0, 10) + 'T00:00:00Z')) / 86400000);
    rachaVigente = diffDias <= 1 ? rachaActual : 0;
  }

  res.json({
    habito,
    historial: historial.rows,
    cumplido_hoy_id: cumplidoHoy.rows[0] ? cumplidoHoy.rows[0].id : null,
    racha_actual: rachaVigente,
    racha_maxima: habito.racha_maxima,
    trofeos: trofeos.rows
  });
});

// Editar un habito (nombre, color, descripcion, horario, efecto)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, color, descripcion, hora_inicio, hora_fin, efecto_visual } = req.body;

  const efectoFinal = EFECTOS_VALIDOS.includes(efecto_visual) ? efecto_visual : undefined;

  const habitoActual = await pool.query(
    'SELECT * FROM habitos WHERE id = $1 AND usuario_id = $2',
    [id, req.usuarioId]
  );
  if (!habitoActual.rows[0]) return res.status(404).json({ error: 'Habito no encontrado' });
  const actual = habitoActual.rows[0];

  const result = await pool.query(
    `UPDATE habitos SET
       nombre = $1, color = $2, descripcion = $3,
       hora_inicio = $4, hora_fin = $5, efecto_visual = $6
     WHERE id = $7 AND usuario_id = $8
     RETURNING *`,
    [
      nombre !== undefined ? nombre : actual.nombre,
      color !== undefined ? color : actual.color,
      descripcion !== undefined ? descripcion : actual.descripcion,
      hora_inicio !== undefined ? hora_inicio : actual.hora_inicio,
      hora_fin !== undefined ? hora_fin : actual.hora_fin,
      efectoFinal !== undefined ? efectoFinal : actual.efecto_visual,
      id,
      req.usuarioId
    ]
  );
  res.json({ habito: result.rows[0] });
});

// Borrar (desactivar) un habito
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query(
    'UPDATE habitos SET activo = false WHERE id = $1 AND usuario_id = $2',
    [id, req.usuarioId]
  );
  res.json({ ok: true });
});

module.exports = router;
