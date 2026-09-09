const API = '/api';
let esRegistro = false;
let habitoEditandoId = null;

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

// --- Navegacion (perfil / tienda / estadisticas) ---
document.getElementById('btn-perfil').addEventListener('click', cargarPerfil);
document.getElementById('perfil-volver').addEventListener('click', () => cargarDashboard());

document.getElementById('btn-tienda').addEventListener('click', cargarTienda);

document.getElementById('btn-estadisticas').addEventListener('click', cargarEstadisticas);
document.getElementById('estadisticas-volver').addEventListener('click', () => cargarDashboard());

// --- Dashboard ---
async function cargarDashboard() {
  const { habitos } = await api('/habitos');
  const yo = await api('/auth/yo');
  document.getElementById('monedas-total').textContent = yo.usuario.monedas;
  window.aplicarTema(yo.usuario.tema_activo);

  const lista = document.getElementById('lista-habitos');
  lista.innerHTML = '';
  if (habitos.length === 0) {
    lista.innerHTML = '<p class="vacio">Aun no tienes habitos. Toca + para crear uno.</p>';
  }
  habitos.forEach(h => {
    const fila = document.createElement('div');
    fila.className = 'fila';
    fila.innerHTML = `
      <span class="fila-punto" style="--punto-color:${h.color}"></span>
      <div class="fila-texto">
        <div class="fila-titulo">${h.nombre}</div>
        <div class="fila-sub">${h.modo === 'nfc' ? 'NFC' : 'Manual'}</div>
      </div>
      <span class="fila-estado ${h.cumplido_hoy ? 'cumplido' : ''}">${h.cumplido_hoy ? 'Cumplido ✔' : 'Pendiente'}</span>
    `;
    fila.addEventListener('click', () => verDetalle(h.id));

    if (h.modo === 'manual' && !h.cumplido_hoy) {
      const btn = document.createElement('button');
      btn.className = 'secundario fila-accion';
      btn.textContent = 'Marcar';
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await api(`/scan/manual/${h.id}`, { method: 'POST' });
          cargarDashboard();
        } catch (err) {
          alert(err.message);
        }
      });
      fila.appendChild(btn);
    }

    lista.appendChild(fila);
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
  document.getElementById('form-color').value = habito ? habito.color : '#2dd4bf';
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
const NOMBRE_TROFEO_HABITO = { 7: '7 dias', 15: '15 dias', 30: '30 dias', 100: '100 dias · legendario' };

async function verDetalle(id) {
  const { habito, historial, cumplido_hoy_id, racha_actual, racha_maxima, trofeos } = await api(`/habitos/${id}`);
  document.getElementById('detalle-nombre').textContent = habito.nombre;
  document.getElementById('detalle-descripcion').textContent = habito.descripcion || '';
  document.getElementById('detalle-tag').textContent = habito.tag_nfc_id || '(modo manual)';
  document.getElementById('detalle-racha-actual').textContent = racha_actual;
  document.getElementById('detalle-racha-maxima').textContent = racha_maxima;

  const trofeosEl = document.getElementById('detalle-trofeos');
  trofeosEl.innerHTML = trofeos.length
    ? trofeos.map(t => `<span class="insignia">${NOMBRE_TROFEO_HABITO[t.dias]}</span>`).join('')
    : '';

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
    ? historial.map(h => `<div class="fila" style="cursor:default;">${h.fecha}</div>`).join('')
    : '<p class="vacio">Aun no hay cumplidos registrados</p>';

  document.getElementById('detalle-editar').onclick = () => abrirFormulario(habito);
  document.getElementById('detalle-borrar').onclick = async () => {
    if (confirm('¿Borrar este habito? Esta accion no se puede deshacer.')) {
      await api(`/habitos/${id}`, { method: 'DELETE' });
      cargarDashboard();
    }
  };

  mostrar('vista-detalle');
}

// --- Perfil y trofeos ---
const NOMBRE_TROFEO_DIA_PERFECTO = { 7: '7 dias perfectos', 15: '15 dias perfectos', 30: '30 dias perfectos · legendario' };

async function cargarPerfil() {
  const data = await api('/perfil');
  document.getElementById('perfil-monedas').textContent = data.monedas;
  document.getElementById('perfil-racha-actual').textContent = data.dia_perfecto.racha_actual;
  document.getElementById('perfil-racha-maxima').textContent = data.dia_perfecto.racha_maxima;

  const trofeosDP = document.getElementById('perfil-trofeos-dia-perfecto');
  trofeosDP.innerHTML = data.dia_perfecto.trofeos.length
    ? data.dia_perfecto.trofeos.map(t => `<span class="insignia">${NOMBRE_TROFEO_DIA_PERFECTO[t.dias]}</span>`).join('')
    : '<p class="vacio">Aun no hay trofeos de dia perfecto</p>';

  const trofeosHabito = document.getElementById('perfil-trofeos-habito');
  if (data.trofeos_por_habito.length === 0) {
    trofeosHabito.innerHTML = '<p class="vacio">Aun no hay trofeos por habito</p>';
  } else {
    const porHabito = {};
    data.trofeos_por_habito.forEach(t => {
      if (!porHabito[t.habito_id]) porHabito[t.habito_id] = { nombre: t.habito_nombre, color: t.habito_color, trofeos: [] };
      porHabito[t.habito_id].trofeos.push(t.dias);
    });
    trofeosHabito.innerHTML = Object.values(porHabito).map(h => `
      <div class="tarjeta">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <span class="fila-punto" style="--punto-color:${h.color}"></span>
          <strong>${h.nombre}</strong>
        </div>
        ${h.trofeos.map(d => `<span class="insignia">${NOMBRE_TROFEO_HABITO[d]}</span>`).join('')}
      </div>
    `).join('');
  }

  mostrar('vista-perfil');
}

// --- Tienda ---
const NOMBRE_MARCO = { bronce: 'Bronce', plata: 'Plata', oro: 'Oro' };
const COLOR_MARCO = { bronce: '#cd7f32', plata: '#c0c0c0', oro: '#d4af37' };
const NOMBRE_NIVEL_TEMA = { comun: 'Comun', epico: 'Epico', legendario: 'Legendario' };

async function cargarTienda() {
  const data = await api('/tienda');
  document.getElementById('tienda-monedas').textContent = (await api('/auth/yo')).usuario.monedas;

  const pinturasEl = document.getElementById('tienda-pinturas');
  pinturasEl.innerHTML = data.pinturas.length === 0
    ? '<p class="vacio">Aun no hay pinturas en la tienda</p>'
    : data.pinturas.map(p => `
        <div class="fila" style="cursor:default;">
          <img src="${p.imagen_url}" alt="${p.nombre}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:2px solid ${COLOR_MARCO[p.marco]};">
          <div class="fila-texto">
            <div class="fila-titulo">${p.nombre}</div>
            <div class="fila-sub">${NOMBRE_MARCO[p.marco]} · 🪙 ${p.precio}</div>
          </div>
          ${p.comprada
            ? '<span class="fila-estado cumplido">Adquirida</span>'
            : `<button data-id="${p.id}" class="secundario fila-accion btn-comprar-pintura">Comprar</button>`}
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
    <div class="fila" style="cursor:default;">
      <div class="fila-texto">
        <div class="fila-titulo">${t.nombre}</div>
        <div class="fila-sub">${NOMBRE_NIVEL_TEMA[t.nivel]} · 🪙 ${t.precio}</div>
      </div>
      <button class="ghost btn-previsualizar-tema" data-clave="${t.clave}" style="padding:4px 8px;">Ver</button>
      ${t.activo
        ? '<span class="fila-estado cumplido">Activo</span>'
        : t.comprado
          ? `<button data-clave="${t.clave}" class="secundario fila-accion btn-activar-tema">Activar</button>`
          : `<button data-id="${t.id}" class="secundario fila-accion btn-comprar-tema">Comprar</button>`}
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

  document.getElementById('tienda-volver').onclick = () => {
    window.aplicarTema(temaActivoActual);
    cargarDashboard();
  };

  mostrar('vista-tienda');
}

// --- Estadisticas: mapa de calor + calendario ---
let datosEstadisticas = null;
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
  if (cantidad === 0) return 'var(--bg)';
  if (cantidad === 1) return 'rgba(45,212,191,0.35)';
  if (cantidad === 2) return 'rgba(45,212,191,0.6)';
  if (cantidad === 3) return 'rgba(45,212,191,0.85)';
  return 'rgba(45,212,191,1)';
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
    cab.style.fontSize = '11px';
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
    celda.style.background = habitos.length ? 'var(--acento-tenue)' : 'transparent';
    celda.innerHTML = `<div style="font-size:13px;">${dia}</div>` +
      (habitos.length ? `<div style="font-size:9px; color:var(--acento);">${'●'.repeat(Math.min(habitos.length, 4))}</div>` : '');
    celda.addEventListener('click', () => mostrarDetalleDia(fechaStr, habitos));
    grid.appendChild(celda);
  }
}

function mostrarDetalleDia(fechaStr, habitos) {
  const detalle = document.getElementById('calendario-detalle');
  detalle.innerHTML = `<strong>${fechaStr}</strong><br><div style="margin-top:6px;">` + (
    habitos.length
      ? habitos.map(h => `<span class="insignia">${h.nombre}</span>`).join('')
      : '<span style="color:var(--texto-tenue)">Ningun habito cumplido este dia</span>'
  ) + '</div>';
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
