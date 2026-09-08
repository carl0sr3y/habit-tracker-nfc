const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { calcularRachas } = require('../lib/rachas');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const usuario = await pool.query(
    'SELECT monedas, racha_maxima_dia_perfecto FROM usuarios WHERE id = $1',
    [req.usuarioId]
  );

  const fechasPerfectos = await pool.query(
    'SELECT fecha FROM dias_perfectos WHERE usuario_id = $1 ORDER BY fecha ASC',
    [req.usuarioId]
  );
  const { rachaActual } = calcularRachas(fechasPerfectos.rows.map(r => r.fecha.toISOString().slice(0, 10)));
  const ultimaFecha = fechasPerfectos.rows.length
    ? fechasPerfectos.rows[fechasPerfectos.rows.length - 1].fecha
    : null;
  let rachaVigente = 0;
  if (ultimaFecha) {
    const hoy = new Date(); hoy.setUTCHours(0, 0, 0, 0);
    const diffDias = Math.round((hoy - new Date(ultimaFecha.toISOString().slice(0, 10) + 'T00:00:00Z')) / 86400000);
    rachaVigente = diffDias <= 1 ? rachaActual : 0;
  }

  const trofeosDiaPerfecto = await pool.query(
    `SELECT dias, ganado_en FROM trofeos WHERE usuario_id = $1 AND tipo = 'dia_perfecto' ORDER BY dias ASC`,
    [req.usuarioId]
  );

  const trofeosPorHabito = await pool.query(
    `SELECT t.dias, t.ganado_en, h.id AS habito_id, h.nombre AS habito_nombre, h.color AS habito_color
     FROM trofeos t
     JOIN habitos h ON h.id = t.habito_id
     WHERE t.usuario_id = $1 AND t.tipo = 'habito'
     ORDER BY h.nombre ASC, t.dias ASC`,
    [req.usuarioId]
  );

  res.json({
    monedas: usuario.rows[0].monedas,
    dia_perfecto: {
      racha_actual: rachaVigente,
      racha_maxima: usuario.rows[0].racha_maxima_dia_perfecto,
      trofeos: trofeosDiaPerfecto.rows
    },
    trofeos_por_habito: trofeosPorHabito.rows
  });
});

module.exports = router;