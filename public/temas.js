(function () {
  function inyectarEstilosUnaVez() {
    if (document.getElementById('temas-css')) return;
    const style = document.createElement('style');
    style.id = 'temas-css';
    style.textContent = `
      /* --- Comun: Bosque --- */
      body[data-tema="bosque"] {
        --bg: #0f1a13;
        --bg-card: #16241c;
        --borde: #234030;
      }
      body[data-tema="bosque"] button:not(.secundario):not(.peligro) { background: #16a34a; }

      /* --- Epico: Aurora Boreal --- */
      body[data-tema="aurora"] {
        --bg: #0d1024;
        --bg-card: #171b3a;
        --borde: #2c2f57;
        background-color: var(--bg);
        background-image:
          radial-gradient(circle at 15% 20%, rgba(94,234,212,0.10), transparent 40%),
          radial-gradient(circle at 85% 65%, rgba(168,85,247,0.12), transparent 45%);
      }
      body[data-tema="aurora"] button:not(.secundario):not(.peligro) {
        background: linear-gradient(135deg, #22c55e, #a855f7);
      }

      /* --- Legendario: Dorado Real --- */
      body[data-tema="dorado"] {
        --bg: #0a0a0a;
        --bg-card: #161616;
        --borde: #caa94a;
        background: linear-gradient(120deg, #0a0a0a, #1a1400, #0a0a0a);
        background-size: 400% 400%;
        animation: dorado-pan 14s ease infinite;
      }
      @keyframes dorado-pan {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      body[data-tema="dorado"] .tarjeta {
        box-shadow: 0 0 10px rgba(202,169,74,0.25);
      }
      body[data-tema="dorado"] button:not(.secundario):not(.peligro) {
        background: linear-gradient(135deg, #caa94a, #8a6d1e);
        box-shadow: 0 0 8px rgba(202,169,74,0.4);
      }
    `;
    document.head.appendChild(style);
  }

  window.aplicarTema = function (clave) {
    inyectarEstilosUnaVez();
    if (clave) {
      document.body.setAttribute('data-tema', clave);
    } else {
      document.body.removeAttribute('data-tema');
    }
  };
})();