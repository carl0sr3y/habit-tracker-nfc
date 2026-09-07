const API = '/api';
let esRegistro = false;
let habitoEditandoId = null;

// --- Utilidades ---
function mostrar(vistaId) {
  ['vista-auth', 'vista-dashboard', 'vista-form', 'vista-detalle'].forEach(id => {
    document.getElementById(id).classList.toggle('oculto', id !== vistaId);
  });
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red');
  return data;
}

// --- Auth ---
document.getElementById('auth-cambiar').addEventListener('click', () => {
  esRegistro = !esRegistro;
  document.getElementById('auth-titulo').textContent = esRegistro ? 'Crear cuenta' : 'Iniciar sesion';
  document.getElementById('auth-submit').textContent = esRegistro ? 'Crear cuenta' : 'Entrar';
  document.getElementById('auth-cambiar').textContent = esRegistro ? 'Ya tengo cuenta' : 'Crear una cuenta nueva';
});

document.getElementById('auth-submit').addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorEl = document.getElementById('auth-error');
  errorEl.classList.add('oculto');
  try {
    await api(esRegistro ? '/auth/registro' : '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    await cargarDashboard();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('oculto');
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await api('/auth/logout', { method: 'POST' });
  mostrar('vista-auth');
});

// --- Dashboard ---
async function cargarDashboard() {
  const { habitos } = await api('/habitos');
  const yo = await api('/auth/yo');
  document.getElementById('monedas-total').textContent = yo.usuario.monedas;

  const lista = document.getElementById('lista-habitos');
  lista.innerHTML = '';
  if (habitos.length === 0) {
    lista.innerHTML = '<p style="color:var(--texto-tenue)">Aun no tienes habitos. Toca el boton + para crear uno.</p>';
  }
  habitos.forEach(h => {
    const div = document.createElement('div');
    div.className = 'tarjeta habito-card' + (h.cumplido_hoy ? ' cumplido' : '');
    div.style.setProperty('--color', h.color);
    div.innerHTML = `
      <div>
        <strong>${h.nombre}</strong><br>
        <small style="color:var(--texto-tenue)">${h.modo === 'nfc' ? '📡 NFC' : '✋ Manual'}</small>
      </div>
      <span class="estado">${h.cumplido_hoy ? 'Cumplido hoy ✔' : 'Pendiente'}</span>
    `;
    div.addEventListener('click', () => verDetalle(h.id));
    lista.appendChild(div);

    if (h.modo === 'manual' && !h.cumplido_hoy) {
      const btn = document.createElement('button');
      btn.textContent = `Marcar "${h.nombre}" como cumplido`;
      btn.style.marginBottom = '12px';
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await api(`/scan/manual/${h.id}`, { method: 'POST' });
          cargarDashboard();
        } catch (err) {
          alert(err.message);
        }
      });
      lista.appendChild(btn);
    }
  });

  mostrar('vista-dashboard');
}

// --- Formulario crear/editar habito ---
document.getElementById('btn-nuevo').addEventListener('click', () => abrirFormulario(null));
document.getElementById('form-cancelar').addEventListener('click', () => cargarDashboard());

document.getElementById('form-tiene-horario').addEventListener('change', (e) => {
  document.getElementById('form-horario-campos').classList.toggle('oculto', !e.target.checked);
});

function abrirFormulario(habito) {
  habitoEditandoId = habito ? habito.id : null;
  document.getElementById('form-titulo').textContent = habito ? 'Editar habito' : 'Nuevo habito';
  document.getElementById('form-nombre').value = habito ? habito.nombre : '';
  document.getElementById('form-color').value = habito ? habito.color : '#4f46e5';
  document.getElementById('form-descripcion').value = habito ? (habito.descripcion || '') : '';
  document.getElementById('form-modo').value = habito ? habito.modo : 'nfc';
  document.getElementById('form-modo').disabled = !!habito;
  const tieneHorario = habito && habito.hora_inicio && habito.hora_fin;
  document.getElementById('form-tiene-horario').checked = !!tieneHorario;
  document.getElementById('form-horario-campos').classList.toggle('oculto', !tieneHorario);
  document.getElementById('form-hora-inicio').value = habito ? (habito.hora_inicio || '') : '';
  document.getElementById('form-hora-fin').value = habito ? (habito.hora_fin || '') : '';
  document.getElementById('form-efecto').value = habito ? habito.efecto_visual : 'estrellas';
  document.getElementById('form-error').classList.add('oculto');
  mostrar('vista-form');
}

document.getElementById('form-guardar').addEventListener('click', async () => {
  const tieneHorario = document.getElementById('form-tiene-horario').checked;
  const cuerpo = {
    nombre: document.getElementById('form-nombre').value.trim(),
    color: document.getElementById('form-color').value,
    descripcion: document.getElementById('form-descripcion').value.trim(),
    modo: document.getElementById('form-modo').value,
    hora_inicio: tieneHorario ? document.getElementById('form-hora-inicio').value : null,
    hora_fin: tieneHorario ? document.getElementById('form-hora-fin').value : null,
    efecto_visual: document.getElementById('form-efecto').value
  };
  const errorEl = document.getElementById('form-error');
  errorEl.classList.add('oculto');
  try {
    if (habitoEditandoId) {
      await api(`/habitos/${habitoEditandoId}`, { method: 'PUT', body: JSON.stringify(cuerpo) });
    } else {
      await api('/habitos', { method: 'POST', body: JSON.stringify(cuerpo) });
    }
    cargarDashboard();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('oculto');
  }
});

// --- Detalle de habito ---
async function verDetalle(id) {
  const { habito, historial, cumplido_hoy_id } = await api(`/habitos/${id}`);
  document.getElementById('detalle-nombre').textContent = habito.nombre;
  document.getElementById('detalle-descripcion').textContent = habito.descripcion || 'Sin descripcion';
  document.getElementById('detalle-tag').textContent = habito.tag_nfc_id || '(modo manual, sin chip)';

  const bloqueCumplidoHoy = document.getElementById('detalle-cumplido-hoy');
  bloqueCumplidoHoy.classList.toggle('oculto', !cumplido_hoy_id);
  if (cumplido_hoy_id) {
    document.getElementById('detalle-deshacer-hoy').onclick = async () => {
      if (confirm('¿Seguro que quieres eliminar el cumplido de HOY de este habito? Perderas la moneda ganada y esta accion no se puede deshacer.')) {
        await api(`/scan/deshacer/${cumplido_hoy_id}`, { method: 'DELETE' });
        verDetalle(id);
      }
    };
  }

  const urlWrap = document.getElementById('detalle-url-wrap');
  if (habito.tag_nfc_id) {
    const url = `${window.location.origin}/marcar.html?tag=${habito.tag_nfc_id}`;
    document.getElementById('detalle-url').textContent = url;
    urlWrap.classList.remove('oculto');
  } else {
    urlWrap.classList.add('oculto');
  }

  const histEl = document.getElementById('detalle-historial');
  histEl.innerHTML = historial.length
    ? historial.map(h => `<div>${h.fecha}</div>`).join('')
    : '<p style="color:var(--texto-tenue)">Aun no hay cumplidos registrados</p>';

  document.getElementById('detalle-editar').onclick = () => abrirFormulario(habito);
  document.getElementById('detalle-borrar').onclick = async () => {
    if (confirm('¿Borrar este habito? Esta accion no se puede deshacer.')) {
      await api(`/habitos/${id}`, { method: 'DELETE' });
      cargarDashboard();
    }
  };
  document.getElementById('detalle-volver').onclick = () => cargarDashboard();

  mostrar('vista-detalle');
}

// --- Arranque ---
(async function iniciar() {
  try {
    await api('/auth/yo');
    await cargarDashboard();
  } catch {
    mostrar('vista-auth');
  }
})();