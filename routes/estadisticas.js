const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Devuelve, para el ultimo año, que habitos se cumplieron cada dia.
// El frontend arma tanto el mapa de calor como el calendario a partir de esto mismo.
router.get('/', async (req, res) => {
  const result = await pool.query(
    `SELECT c.fecha, h.id AS habito_id, h.nombre, h.color
     FROM cumplidos c
     JOIN habitos h ON h.id = c.habito_id
     WHERE h.usuario_id = $1 AND c.activo = true
       AND c.fecha >= (CURRENT_DATE - INTERVAL '370 days')
     ORDER BY c.fecha ASC`,
    [req.usuarioId]
  );

  const porDia = {};
  result.rows.forEach(r => {
    const fecha = r.fecha.toISOString().slice(0, 10);
    if (!porDia[fecha]) porDia[fecha] = [];
    porDia[fecha].push({ habito_id: r.habito_id, nombre: r.nombre, color: r.color });
  });

  const totalHabitos = await pool.query(
    'SELECT COUNT(*)::int AS total FROM habitos WHERE usuario_id = $1 AND activo = true',
    [req.usuarioId]
  );

  res.json({
    dias: Object.entries(porDia).map(([fecha, habitos]) => ({ fecha, habitos })),
    total_habitos_activos: totalHabitos.rows[0].total
  });
});

module.exports = router;
