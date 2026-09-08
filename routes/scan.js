const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { calcularRachas, otorgarTrofeosHabito, otorgarTrofeosDiaPerfecto } = require('../lib/rachas');

const router = express.Router();

function dentroDeHorario(habito, ahora) {
  if (!habito.hora_inicio || !habito.hora_fin) return true;
  const horaActual = ahora.toTimeString().slice(0, 8);
  return horaActual >= habito.hora_inicio && horaActual <= habito.hora_fin;
}

async function marcarCumplido(habito, fecha) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const yaExiste = await client.query(
      'SELECT id FROM cumplidos WHERE habito_id = $1 AND fecha = $2 AND activo = true',
      [habito.id, fecha]
    );
    if (yaExiste.rows[0]) {
      await client.query('ROLLBACK');
      return { nuevo: false, cumplido_id: yaExiste.rows[0].id };
    }

    const insert = await client.query(
      `INSERT INTO cumplidos (habito_id, fecha) VALUES ($1, $2) RETURNING id`,
      [habito.id, fecha]
    );
    const cumplidoId = insert.rows[0].id;

    await client.query('UPDATE usuarios SET monedas = monedas + 1 WHERE id = $1', [habito.usuario_id]);

    const fechasHabito = await client.query(
      `SELECT fecha FROM cumplidos WHERE habito_id = $1 AND activo = true ORDER BY fecha ASC`,
      [habito.id]
    );
    const { rachaActual: rachaHabito, rachaMaxima: rachaMaximaHabito } = calcularRachas(
      fechasHabito.rows.map(r => r.fecha.toISOString().slice(0, 10))
    );
    await client.query(
      'UPDATE habitos SET racha_maxima = GREATEST(racha_maxima, $2) WHERE id = $1',
      [habito.id, rachaMaximaHabito]
    );
    await otorgarTrofeosHabito(client, habito.usuario_id, habito.id, rachaHabito);

    const pendientes = await client.query(
      `SELECT h.id FROM habitos h
       WHERE h.usuario_id = $1 AND h.activo = true
       AND NOT EXISTS (
         SELECT 1 FROM cumplidos c WHERE c.habito_id = h.id AND c.fecha = $2 AND c.activo = true
       )`,
      [habito.usuario_id, fecha]
    );
    let bonusOtorgado = false;
    let rachaDiaPerfecto = null;
    if (pendientes.rows.length === 0) {
      const usuarioActual = await client.query(
        'SELECT ultimo_bonus_dia_perfecto FROM usuarios WHERE id = $1',
        [habito.usuario_id]
      );
      const yaTuvoBonusHoy = usuarioActual.rows[0].ultimo_bonus_dia_perfecto &&
        usuarioActual.rows[0].ultimo_bonus_dia_perfecto.toISOString().slice(0, 10) === fecha;
      if (!yaTuvoBonusHoy) {
        await client.query(
          'UPDATE usuarios SET monedas = monedas + 3, ultimo_bonus_dia_perfecto = $2 WHERE id = $1',
          [habito.usuario_id, fecha]
        );
        bonusOtorgado = true;

        await client.query(
          `INSERT INTO dias_perfectos (usuario_id, fecha) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [habito.usuario_id, fecha]
        );
        const fechasPerfectos = await client.query(
          `SELECT fecha FROM dias_perfectos WHERE usuario_id = $1 ORDER BY fecha ASC`,
          [habito.usuario_id]
        );
        const { rachaActual: rp, rachaMaxima: rpMax } = calcularRachas(
          fechasPerfectos.rows.map(r => r.fecha.toISOString().slice(0, 10))
        );
        rachaDiaPerfecto = rp;
        await client.query(
          'UPDATE usuarios SET racha_maxima_dia_perfecto = GREATEST(racha_maxima_dia_perfecto, $2) WHERE id = $1',
          [habito.usuario_id, rpMax]
        );
        await otorgarTrofeosDiaPerfecto(client, habito.usuario_id, rp);
      }
    }

    await client.query('COMMIT');
    return {
      nuevo: true,
      cumplido_id: cumplidoId,
      bonus_dia_perfecto: bonusOtorgado,
      racha_habito: rachaHabito,
      racha_dia_perfecto: rachaDiaPerfecto
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

router.get('/:tagId', async (req, res) => {
  const { tagId } = req.params;
  const ahora = new Date();
  const fecha = ahora.toISOString().slice(0, 10);

  const habitoResult = await pool.query(
    `SELECT * FROM habitos WHERE tag_nfc_id = $1 AND modo = 'nfc' AND activo = true`,
    [tagId]
  );
  const habito = habitoResult.rows[0];
  if (!habito) {
    return res.status(404).json({ error: 'Chip NFC no reconocido' });
  }

  if (!dentroDeHorario(habito, ahora)) {
    return res.status(422).json({
      error: 'fuera_de_horario',
      mensaje: `Este habito solo se puede marcar entre ${habito.hora_inicio} y ${habito.hora_fin}`,
      habito: { id: habito.id, nombre: habito.nombre, color: habito.color }
    });
  }

  try {
    const resultado = await marcarCumplido(habito, fecha);
    res.json({
      ...resultado,
      habito: { id: habito.id, nombre: habito.nombre, color: habito.color, efecto_visual: habito.efecto_visual }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error marcando el cumplido' });
  }
});

router.post('/manual/:habitoId', requireAuth, async (req, res) => {
  const { habitoId } = req.params;
  const ahora = new Date();
  const fecha = ahora.toISOString().slice(0, 10);

  const habitoResult = await pool.query(
    `SELECT * FROM habitos WHERE id = $1 AND usuario_id = $2 AND modo = 'manual' AND activo = true`,
    [habitoId, req.usuarioId]
  );
  const habito = habitoResult.rows[0];
  if (!habito) return res.status(404).json({ error: 'Habito no encontrado' });

  if (!dentroDeHorario(habito, ahora)) {
    return res.status(422).json({
      error: 'fuera_de_horario',
      mensaje: `Este habito solo se puede marcar entre ${habito.hora_inicio} y ${habito.hora_fin}`
    });
  }

  try {
    const resultado = await marcarCumplido(habito, fecha);
    res.json({ ...resultado, habito: { id: habito.id, nombre: habito.nombre, color: habito.color, efecto_visual: habito.efecto_visual } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error marcando el cumplido' });
  }
});

router.delete('/deshacer/:cumplidoId', async (req, res) => {
  const { cumplidoId } = req.params;
  const cumplidoResult = await pool.query(
    `SELECT c.*, h.usuario_id FROM cumplidos c
     JOIN habitos h ON h.id = c.habito_id
     WHERE c.id = $1 AND c.activo = true`,
    [cumplidoId]
  );
  const cumplido = cumplidoResult.rows[0];
  if (!cumplido) return res.status(404).json({ error: 'Cumplido no encontrado' });

  await pool.query('UPDATE cumplidos SET activo = false WHERE id = $1', [cumplidoId]);
  await pool.query('UPDATE usuarios SET monedas = GREATEST(monedas - 1, 0) WHERE id = $1', [cumplido.usuario_id]);

  res.json({ ok: true });
});

router.post('/sync', async (req, res) => {
  const { escaneos } = req.body;
  if (!Array.isArray(escaneos)) {
    return res.status(400).json({ error: 'Formato invalido' });
  }
  const resultados = [];
  for (const item of escaneos) {
    const habitoResult = await pool.query(
      `SELECT * FROM habitos WHERE tag_nfc_id = $1 AND modo = 'nfc' AND activo = true`,
      [item.tagId]
    );
    const habito = habitoResult.rows[0];
    if (!habito) {
      resultados.push({ tagId: item.tagId, ok: false, error: 'Chip no reconocido' });
      continue;
    }
    try {
      const resultado = await marcarCumplido(habito, item.fecha);
      resultados.push({ tagId: item.tagId, ok: true, ...resultado });
    } catch (err) {
      resultados.push({ tagId: item.tagId, ok: false, error: 'Error al sincronizar' });
    }
  }
  res.json({ resultados });
});

module.exports = router;