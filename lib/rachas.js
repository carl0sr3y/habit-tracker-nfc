// Funciones compartidas para calcular rachas (a partir de una lista de fechas)
// y para otorgar trofeos automaticamente cuando se alcanza un umbral.

const UMBRALES_TROFEOS = [7, 15, 30, 100];

// Dado un arreglo de fechas 'YYYY-MM-DD' en orden ASCENDENTE, calcula:
// - rachaActual: dias consecutivos que terminan en la ULTIMA fecha del arreglo
// - rachaMaxima: la racha mas larga que aparece en todo el historial
function calcularRachas(fechasAsc) {
  let rachaMaxima = 0;
  let corridaActual = 0;
  let prev = null;

  for (const f of fechasAsc) {
    const d = new Date(f + 'T00:00:00Z');
    if (prev) {
      const diffDias = Math.round((d - prev) / 86400000);
      corridaActual = diffDias === 1 ? corridaActual + 1 : 1;
    } else {
      corridaActual = 1;
    }
    if (corridaActual > rachaMaxima) rachaMaxima = corridaActual;
    prev = d;
  }

  return { rachaActual: corridaActual, rachaMaxima };
}

// Otorga un trofeo de habito individual si la racha actual alcanza algun umbral
// y ese trofeo todavia no existia. Debe correr dentro de una transaccion (client).
async function otorgarTrofeosHabito(client, usuarioId, habitoId, rachaActual) {
  for (const dias of UMBRALES_TROFEOS) {
    if (rachaActual < dias) continue;
    await client.query(
      `INSERT INTO trofeos (usuario_id, tipo, habito_id, dias)
       SELECT $1, 'habito', $2, $3
       WHERE NOT EXISTS (
         SELECT 1 FROM trofeos WHERE habito_id = $2 AND dias = $3 AND tipo = 'habito'
       )`,
      [usuarioId, habitoId, dias]
    );
  }
}

// Igual que arriba, pero para el trofeo de "dia perfecto" (no ligado a un habito)
async function otorgarTrofeosDiaPerfecto(client, usuarioId, rachaActual) {
  for (const dias of [7, 15, 30]) { // el legendario de dia perfecto es 30, no 100
    if (rachaActual < dias) continue;
    await client.query(
      `INSERT INTO trofeos (usuario_id, tipo, habito_id, dias)
       SELECT $1, 'dia_perfecto', NULL, $2
       WHERE NOT EXISTS (
         SELECT 1 FROM trofeos WHERE usuario_id = $1 AND dias = $2 AND tipo = 'dia_perfecto'
       )`,
      [usuarioId, dias]
    );
  }
}

module.exports = { UMBRALES_TROFEOS, calcularRachas, otorgarTrofeosHabito, otorgarTrofeosDiaPerfecto };
