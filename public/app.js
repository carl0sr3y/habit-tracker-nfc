const API = '/api';
let esRegistro = false;
let habitoEditandoId = null;

// --- Utilidades ---
function mostrar(vistaId) {
  ['vista-auth', 'vista-dashboard', 'vista-form', 'vista-detalle', 'vista-perfil', 'vista-tienda', 'vista-estadisticas'].forEach(id => {
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

document.getElementById('btn-perfil').addEventListener('click', cargarPerfil);
document.getElementById('perfil-volver').addEventListener('click', () => cargarDashboard());

document.getElementById('btn-estadisticas').addEventListener('click', cargarEstadisticas);
document.getElementById('estadisticas-volver').addEventListener('click', () => cargarDashboard());

document.getElementById('btn-tienda').addEventListener('click', cargarTienda);
document.getElementById('tienda-volver').addEventListener('click', () => cargarDashboard());

let datosEstadisticas = null; // { fecha: [{habito_id, nombre, color}] }
let mesActual = new Date();
mesActual.setDate(1);

async function cargarEstadisticas() {
  const data = await api('/estadisticas');
  datosEstadisticas = {};
  data.dias.forEach(d => { datosEstadisticas[d.fecha] = d.habitos; });

  dibujarMapaCalor();
  mesActual = new Date();
  mesActual.setDate(1);
  dibujarCalendario();

  mostrar('vista-estadisticas');
}

function intensidadColor(cantidad) {
  if (cantidad === 0) return 'var(--bg-card)';
  if (cantidad === 1) return 'rgba(79,70,229,0.35)';
  if (cantidad === 2) return 'rgba(79,70,229,0.6)';
  if (cantidad === 3) return 'rgba(79,70,229,0.85)';
  return 'rgba(79,70,229,1)';
}

function dibujarMapaCalor() {
  const contenedor = document.getElementById('mapa-calor');
  contenedor.innerHTML = '';
  const hoy = new Date();
  const dias = [];
  for (let i = 370; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    dias.push(d);
  }
  dias.forEach(d => {
    const fechaStr = d.toISOString().slice(0, 10);
    const cantidad = (datosEstadisticas[fechaStr] || []).length;
    const celda = document.createElement('div');
    celda.style.width = '11px';
    celda.style.height = '11px';
    celda.style.borderRadius = '2px';
    celda.style.background = intensidadColor(cantidad);
    celda.title = `${fechaStr}: ${cantidad} habito(s) cumplido(s)`;
    contenedor.appendChild(celda);
  });
}

const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const NOMBRES_DIA = ['D','L','M','M','J','V','S'];

document.getElementById('cal-mes-anterior').addEventListener('click', () => {
  mesActual.setMonth(mesActual.getMonth() - 1);
  dibujarCalendario();
});
document.getElementById('cal-mes-siguiente').addEventListener('click', () => {
  mesActual.setMonth(mesActual.getMonth() + 1);
  dibujarCalendario();
});

function dibujarCalendario() {
  document.getElementById('cal-titulo-mes').textContent =
    `${NOMBRES_MES[mesActual.getMonth()]} ${mesActual.getFullYear()}`;

  const grid = document.getElementById('calendario-grid');
  grid.innerHTML = '';

  NOMBRES_DIA.forEach(nombre => {
    const cab = document.createElement('div');
    cab.textContent = nombre;
    cab.style.textAlign = 'center';
    cab.style.fontSize = '12px';
    cab.style.color = 'var(--texto-tenue)';
    grid.appendChild(cab);
  });

  const primerDiaSemana = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1).getDay();
  const diasEnMes = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0).getDate();

  for (let i = 0; i < primerDiaSemana; i++) {
    grid.appendChild(document.createElement('div'));
  }

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const fechaObj = new Date(mesActual.getFullYear(), mesActual.getMonth(), dia);
    const fechaStr = fechaObj.toISOString().slice(0, 10);
    const habitos = datosEstadisticas[fechaStr] || [];

    const celda = document.createElement('div');
    celda.style.textAlign = 'center';
    celda.style.padding = '6px 0';
    celda.style.borderRadius = '8px';
    celda.style.cursor = 'pointer';
    celda.style.background = habitos.length ? 'rgba(79,70,229,0.25)' : 'transparent';
    celda.innerHTML = `<div style="font-size:13px;">${dia}</div>` +
      (habitos.length ? `<div style="font-size:10px;">${'●'.repeat(Math.min(habitos.length, 4))}</div>` : '');
    celda.addEventListener('click', () => mostrarDetalleDia(fechaStr, habitos));
    grid.appendChild(celda);
  }
}

function mostrarDetalleDia(fechaStr, habitos) {
  const detalle = document.getElementById('calendario-detalle');
  detalle.innerHTML = `<strong>${fechaStr}</strong><br>` + (
    habitos.length
      ? habitos.map(h => `<span class="monedas" style="margin-right:6px; border-left:3px solid ${h.color};">${h.nombre}</span>`).join('')
      : '<span style="color:var(--texto-tenue)">Ningun habito cumplido este dia</span>'
  );
}

const NOMBRE_MARCO = { bronce: '🥉', plata: '🥈', oro: '🥇' };
const NOMBRE_NIVEL_TEMA = { comun: 'Comun', epico: 'Epico', legendario: 'Legendario' };

async function cargarTienda() {
  const data = await api('/tienda');
  document.getElementById('tienda-monedas').textContent = (await api('/auth/yo')).usuario.monedas;

  const pinturasEl = document.getElementById('tienda-pinturas');
  pinturasEl.innerHTML = data.pinturas.length === 0
    ? '<p style="color:var(--texto-tenue)">Aun no hay pinturas en la tienda</p>'
    : data.pinturas.map(p => `
        <div class="tarjeta" style="display:flex; gap:12px; align-items:center;">
          <img src="${p.imagen_url}" alt="${p.nombre}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:3px solid ${p.marco === 'oro' ? '#d4af37' : p.marco === 'plata' ? '#c0c0c0' : '#cd7f32'};">
          <div style="flex:1;">
            <strong>${NOMBRE_MARCO[p.marco]} ${p.nombre}</strong><br>
            <small style="color:var(--texto-tenue)">🪙 ${p.precio}</small>
          </div>
          ${p.comprada
            ? '<span class="estado">Ya la tienes ✔</span>'
            : `<button data-id="${p.id}" class="btn-comprar-pintura">Comprar</button>`}
        </div>
      `).join('');

  pinturasEl.querySelectorAll('.btn-comprar-pintura').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api(`/tienda/comprar/pintura/${btn.dataset.id}`, { method: 'POST' });
        cargarTienda();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  const temasEl = document.getElementById('tienda-temas');
  temasEl.innerHTML = data.temas.map(t => `
    <div class="tarjeta" style="display:flex; gap:12px; align-items:center;">
      <div style="flex:1;">
        <strong>${t.nombre}</strong> <small style="color:var(--texto-tenue)">(${NOMBRE_NIVEL_TEMA[t.nivel]})</small><br>
        <small style="color:var(--texto-tenue)">🪙 ${t.precio}</small>
      </div>
      <button class="secundario btn-previsualizar-tema" data-clave="${t.clave}">👁 Ver</button>
      ${t.activo
        ? '<span class="estado">Activo ✔</span>'
        : t.comprado
          ? `<button data-clave="${t.clave}" class="btn-activar-tema">Activar</button>`
          : `<button data-id="${t.id}" class="btn-comprar-tema">Comprar</button>`}
    </div>
  `).join('');

  const temaActivoActual = (data.temas.find(t => t.activo) || {}).clave || null;

  temasEl.querySelectorAll('.btn-previsualizar-tema').forEach(btn => {
    btn.addEventListener('click', () => window.aplicarTema(btn.dataset.clave));
  });
  temasEl.querySelectorAll('.btn-comprar-tema').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api(`/tienda/comprar/tema/${btn.dataset.id}`, { method: 'POST' });
        cargarTienda();
      } catch (err) {
        alert(err.message);
      }
    });
  });
  temasEl.querySelectorAll('.btn-activar-tema').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api('/tienda/activar-tema', { method: 'POST', body: JSON.stringify({ clave: btn.dataset.clave }) });
      cargarTienda();
    });
  });

  // Al salir de la tienda sin activar nada nuevo, restaurar el tema realmente activo (por si solo estaba previsualizando)
  document.getElementById('tienda-volver').onclick = () => {
    window.aplicarTema(temaActivoActual);
    cargarDashboard();
  };

  mostrar('vista-tienda');
}

const NOMBRE_TROFEO_DIA_PERFECTO = { 7: '🥉 7 dias perfectos', 15: '🥈 15 dias perfectos', 30: '🏆 30 dias perfectos (legendario)' };
const NOMBRE_TROFEO_HABITO = { 7: '🥉 7 dias', 15: '🥈 15 dias', 30: '🥇 30 dias', 100: '🏆 100 dias (legendario)' };

async function cargarPerfil() {
  const data = await api('/perfil');
  document.getElementById('perfil-monedas').textContent = data.monedas;
  document.getElementById('perfil-racha-actual').textContent = data.dia_perfecto.racha_actual;
  document.getElementById('perfil-racha-maxima').textContent = data.dia_perfecto.racha_maxima;

  const trofeosDP = document.getElementById('perfil-trofeos-dia-perfecto');
  trofeosDP.innerHTML = data.dia_perfecto.trofeos.length
    ? data.dia_perfecto.trofeos.map(t => `<span class="monedas" style="margin-right:6px;">${NOMBRE_TROFEO_DIA_PERFECTO[t.dias]}</span>`).join('')
    : '<p style="color:var(--texto-tenue)">Aun no hay trofeos de dia perfecto</p>';

  const trofeosHabito = document.getElementById('perfil-trofeos-habito');
  if (data.trofeos_por_habito.length === 0) {
    trofeosHabito.innerHTML = '<p style="color:var(--texto-tenue)">Aun no hay trofeos por habito</p>';
  } else {
    const porHabito = {};
    data.trofeos_por_habito.forEach(t => {
      if (!porHabito[t.habito_id]) porHabito[t.habito_id] = { nombre: t.habito_nombre, color: t.habito_color, trofeos: [] };
      porHabito[t.habito_id].trofeos.push(t.dias);
    });
    trofeosHabito.innerHTML = Object.values(porHabito).map(h => `
      <div class="tarjeta habito-card" style="--color:${h.color}; display:block;">
        <strong>${h.nombre}</strong><br>
        ${h.trofeos.map(d => `<span class="monedas" style="margin-right:6px;">${NOMBRE_TROFEO_HABITO[d]}</span>`).join('')}
      </div>
    `).join('');
  }

  mostrar('vista-perfil');
}

// --- Dashboard ---
async function cargarDashboard() {
  const { habitos } = await api('/habitos');
  const yo = await api('/auth/yo');
  document.getElementById('monedas-total').textContent = yo.usuario.monedas;
  window.aplicarTema(yo.usuario.tema_activo);

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

document.getElementById('form-ver-efecto').addEventListener('click', () => {
  const efecto = document.getElementById('form-efecto').value;
  const color = document.getElementById('form-color').value;
  window.dispararEfectoVisual(efecto, color);
});

function abrirFormulario(habito) {
  habitoEditandoId = habito ? habito.id : null;
  document.getElementById('form-titulo').textContent = habito ? 'Editar habito' : 'Nuevo habito';
  document.getElementById('form-nombre').value = habito ? habito.nombre : '';
  document.getElementById('form-color').value = habito ? habito.color : '#4f46e5';
  document.getElementById('form-descripcion').value = habito ? (habito.descripcion || '') : '';
  document.getElementById('form-modo').value = habito ? habito.modo : 'nfc';
  document.getElementById('form-modo').disabled = !!habito; // el modo no se cambia una vez creado
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
  const { habito, historial, cumplido_hoy_id, racha_actual, racha_maxima, trofeos } = await api(`/habitos/${id}`);
  document.getElementById('detalle-nombre').textContent = habito.nombre;
  document.getElementById('detalle-descripcion').textContent = habito.descripcion || 'Sin descripcion';
  document.getElementById('detalle-tag').textContent = habito.tag_nfc_id || '(modo manual, sin chip)';
  document.getElementById('detalle-racha-actual').textContent = racha_actual;
  document.getElementById('detalle-racha-maxima').textContent = racha_maxima;

  const NOMBRE_TROFEO = { 7: '🥉 7 dias', 15: '🥈 15 dias', 30: '🥇 30 dias', 100: '🏆 100 dias (legendario)' };
  const trofeosEl = document.getElementById('detalle-trofeos');
  trofeosEl.innerHTML = trofeos.length
    ? trofeos.map(t => `<span class="monedas" style="margin-right:6px;">${NOMBRE_TROFEO[t.dias]}</span>`).join('')
    : '<p style="color:var(--texto-tenue)">Aun no hay trofeos para este habito</p>';

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
