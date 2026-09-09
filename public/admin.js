let claveAdmin = null;

async function apiAdmin(path, options = {}) {
  const res = await fetch('/api/admin' + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': claveAdmin, ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red');
  return data;
}

function archivoABase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById('clave-entrar').addEventListener('click', async () => {
  const clave = document.getElementById('clave-input').value;
  const errorEl = document.getElementById('clave-error');
  errorEl.classList.add('oculto');
  claveAdmin = clave;
  try {
    await apiAdmin('/pinturas'); // se usa solo para validar que la clave es correcta
    document.getElementById('vista-clave').classList.add('oculto');
    document.getElementById('vista-admin').classList.remove('oculto');
    cargarLista();
  } catch (err) {
    claveAdmin = null;
    errorEl.textContent = err.message;
    errorEl.classList.remove('oculto');
  }
});

const NOMBRE_MARCO = { bronce: '🥉 Bronce', plata: '🥈 Plata', oro: '🥇 Oro' };

async function cargarLista() {
  const { pinturas } = await apiAdmin('/pinturas');
  const listaEl = document.getElementById('admin-lista');
  listaEl.innerHTML = pinturas.length === 0
    ? '<p style="color:var(--texto-tenue)">Aun no hay pinturas cargadas</p>'
    : pinturas.map(p => `
        <div class="tarjeta" style="display:flex; gap:12px; align-items:center;">
          <img src="${p.imagen_url}" alt="${p.nombre}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;">
          <div style="flex:1;">
            <strong>${p.nombre}</strong><br>
            <small style="color:var(--texto-tenue)">${NOMBRE_MARCO[p.marco]} — 🪙 ${p.precio}</small>
          </div>
          <button class="peligro btn-borrar" data-id="${p.id}">Borrar</button>
        </div>
      `).join('');

  listaEl.querySelectorAll('.btn-borrar').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('¿Borrar esta pintura de la tienda?')) {
        await apiAdmin(`/pinturas/${btn.dataset.id}`, { method: 'DELETE' });
        cargarLista();
      }
    });
  });
}

document.getElementById('admin-guardar').addEventListener('click', async () => {
  const errorEl = document.getElementById('admin-error');
  errorEl.classList.add('oculto');
  const archivo = document.getElementById('admin-imagen').files[0];
  if (!archivo) {
    errorEl.textContent = 'Selecciona una imagen';
    errorEl.classList.remove('oculto');
    return;
  }
  try {
    const imagenBase64 = await archivoABase64(archivo);
    await apiAdmin('/pinturas', {
      method: 'POST',
      body: JSON.stringify({
        nombre: document.getElementById('admin-nombre').value.trim(),
        imagen_url: imagenBase64,
        precio: parseInt(document.getElementById('admin-precio').value, 10),
        marco: document.getElementById('admin-marco').value
      })
    });
    document.getElementById('admin-nombre').value = '';
    document.getElementById('admin-imagen').value = '';
    cargarLista();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('oculto');
  }
});
