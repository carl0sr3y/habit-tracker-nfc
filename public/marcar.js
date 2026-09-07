const CLAVE_OFFLINE = 'escaneos_pendientes';

function leerCola() {
  try { return JSON.parse(localStorage.getItem(CLAVE_OFFLINE)) || []; }
  catch { return []; }
}
function guardarCola(cola) {
  localStorage.setItem(CLAVE_OFFLINE, JSON.stringify(cola));
}

async function sincronizarPendientes() {
  const cola = leerCola();
  if (cola.length === 0) return;
  try {
    const res = await fetch('/api/scan/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ escaneos: cola })
    });
    if (res.ok) guardarCola([]);
  } catch {
    // sigue sin internet, se reintenta la proxima vez
  }
}

function mostrarResultado({ icono, titulo, mensaje, cumplidoId }) {
  document.getElementById('icono').textContent = icono;
  document.getElementById('titulo').textContent = titulo;
  document.getElementById('mensaje').textContent = mensaje;
  const btnDeshacer = document.getElementById('btn-deshacer');
  if (cumplidoId) {
    btnDeshacer.classList.remove('oculto');
    btnDeshacer.onclick = async () => {
      await fetch(`/api/scan/deshacer/${cumplidoId}`, { method: 'DELETE' });
      mostrarResultado({ icono: '↩️', titulo: 'Deshecho', mensaje: 'El cumplido fue eliminado.' });
    };
  } else {
    btnDeshacer.classList.add('oculto');
  }
}

// TODO fase 3: aqui se disparara la animacion segun habito.efecto_visual (estrellas/ondas/luciernagas)
function dispararEfectoVisual(efecto) {
  console.log('Efecto pendiente de implementar en fase 3:', efecto);
}

document.getElementById('btn-volver').addEventListener('click', () => {
  window.location.href = '/';
});

(async function procesar() {
  const params = new URLSearchParams(window.location.search);
  const tag = params.get('tag');

  if (!tag) {
    mostrarResultado({ icono: '⚠️', titulo: 'Tag invalido', mensaje: 'Esta URL no trae un identificador de habito.' });
    return;
  }

  if (!navigator.onLine) {
    const cola = leerCola();
    cola.push({ tagId: tag, fecha: new Date().toISOString().slice(0, 10) });
    guardarCola(cola);
    mostrarResultado({
      icono: '📴',
      titulo: 'Sin conexion',
      mensaje: 'Se guardo el cumplido en tu telefono. Se sincronizara cuando vuelvas a tener internet.'
    });
    return;
  }

  await sincronizarPendientes();

  try {
    const res = await fetch(`/api/scan/${tag}`);
    const data = await res.json();

    if (!res.ok) {
      if (data.error === 'fuera_de_horario') {
        mostrarResultado({ icono: '🕒', titulo: 'Fuera de horario', mensaje: data.mensaje });
      } else {
        mostrarResultado({ icono: '❓', titulo: 'No reconocido', mensaje: data.error || 'Chip no valido' });
      }
      return;
    }

    if (data.nuevo) {
      dispararEfectoVisual(data.habito.efecto_visual);
      mostrarResultado({
        icono: '✅',
        titulo: `¡${data.habito.nombre} cumplido!`,
        mensaje: data.bonus_dia_perfecto ? '+1 moneda, y +3 de bonus por dia perfecto 🎉' : '+1 moneda',
        cumplidoId: data.cumplido_id
      });
    } else {
      mostrarResultado({
        icono: 'ℹ️',
        titulo: `${data.habito.nombre} ya se cumplio hoy`,
        mensaje: 'Si fue un escaneo por error, puedes deshacerlo desde el detalle del habito en la app. Regresando...'
      });
      setTimeout(() => { window.location.href = '/'; }, 2500);
    }
  } catch (err) {
    mostrarResultado({ icono: '⚠️', titulo: 'Error de conexion', mensaje: 'No se pudo contactar al servidor.' });
  }
})();