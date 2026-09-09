// Modulo de efectos visuales. Se usa tanto en marcar.html (al cumplir de verdad)
// como en index.html (para previsualizar el efecto al crear/editar un habito).
//
// Uso: dispararEfectoVisual('estrellas' | 'ondas' | 'luciernagas', '#4f46e5')

(function () {
  const DURACION_MS = 2800;

  function inyectarEstilosUnaVez() {
    if (document.getElementById('efectos-visuales-css')) return;
    const style = document.createElement('style');
    style.id = 'efectos-visuales-css';
    style.textContent = `
      .efecto-overlay {
        position: fixed; inset: 0; z-index: 9999;
        pointer-events: none; overflow: hidden;
      }
      .efecto-dim {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0);
        animation: efecto-dim-fade ${DURACION_MS}ms ease-in-out forwards;
      }
      @keyframes efecto-dim-fade {
        0% { background: rgba(0,0,0,0); }
        15% { background: rgba(0,0,0,0.45); }
        80% { background: rgba(0,0,0,0.45); }
        100% { background: rgba(0,0,0,0); }
      }

      /* --- Estrellas --- */
      .estrella {
        position: absolute; border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 0 6px 1px rgba(255,255,255,0.8);
        animation: estrella-parpadeo 1.4s ease-in-out infinite;
      }
      @keyframes estrella-parpadeo {
        0%, 100% { opacity: 0.25; }
        50% { opacity: 1; }
      }
      .estrella-fugaz {
        position: absolute;
        width: 120px; height: 2px;
        background: linear-gradient(90deg, rgba(255,255,255,0), #ffffff);
        border-radius: 2px;
        opacity: 0;
        animation: fugaz-cruzar ${DURACION_MS}ms ease-out forwards;
      }
      @keyframes fugaz-cruzar {
        0% { opacity: 0; transform: translate(0,0) rotate(-25deg); }
        10% { opacity: 1; }
        55% { opacity: 1; transform: translate(220px, 140px) rotate(-25deg); }
        65% { opacity: 0; }
        100% { opacity: 0; }
      }

      /* --- Ondas de luz --- */
      .onda {
        position: absolute; top: 50%; left: 50%;
        width: 20px; height: 20px;
        border: 3px solid var(--onda-color, #4f46e5);
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0);
        opacity: 0.9;
        animation: onda-expandir 1.8s ease-out forwards;
      }
      @keyframes onda-expandir {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 0.9; }
        100% { transform: translate(-50%, -50%) scale(22); opacity: 0; }
      }

      /* --- Luciernagas --- */
      .luciernaga {
        position: absolute; bottom: -5%;
        width: 6px; height: 6px; border-radius: 50%;
        background: radial-gradient(circle, #fff7c2 0%, #ffcf5c 60%, rgba(255,207,92,0) 100%);
        box-shadow: 0 0 8px 2px rgba(255, 207, 92, 0.7);
        opacity: 0;
        animation: luciernaga-subir linear forwards;
      }
      @keyframes luciernaga-subir {
        0% { opacity: 0; transform: translate(0, 0); }
        15% { opacity: 1; }
        85% { opacity: 1; }
        100% { opacity: 0; transform: translate(var(--drift, 20px), -115vh); }
      }
    `;
    document.head.appendChild(style);
  }

  function crearOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'efecto-overlay';
    const dim = document.createElement('div');
    dim.className = 'efecto-dim';
    overlay.appendChild(dim);
    document.body.appendChild(overlay);
    return overlay;
  }

  function efectoEstrellas(overlay) {
    const n = 35;
    for (let i = 0; i < n; i++) {
      const e = document.createElement('div');
      e.className = 'estrella';
      const tam = 2 + Math.random() * 3;
      e.style.width = tam + 'px';
      e.style.height = tam + 'px';
      e.style.top = Math.random() * 100 + '%';
      e.style.left = Math.random() * 100 + '%';
      e.style.animationDelay = (Math.random() * 1.4) + 's';
      overlay.appendChild(e);
    }
    const fugaz = document.createElement('div');
    fugaz.className = 'estrella-fugaz';
    fugaz.style.top = (10 + Math.random() * 20) + '%';
    fugaz.style.left = (5 + Math.random() * 15) + '%';
    overlay.appendChild(fugaz);
  }

  function efectoOndas(overlay, color) {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const o = document.createElement('div');
      o.className = 'onda';
      o.style.setProperty('--onda-color', color || '#4f46e5');
      o.style.animationDelay = (i * 0.35) + 's';
      overlay.appendChild(o);
    }
  }

  function efectoLuciernagas(overlay) {
    const n = 22;
    for (let i = 0; i < n; i++) {
      const l = document.createElement('div');
      l.className = 'luciernaga';
      l.style.left = Math.random() * 100 + '%';
      l.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
      l.style.animationDuration = (2 + Math.random() * 1.2) + 's';
      l.style.animationDelay = (Math.random() * 0.6) + 's';
      overlay.appendChild(l);
    }
  }

  window.dispararEfectoVisual = function (efecto, color) {
    inyectarEstilosUnaVez();
    const overlay = crearOverlay();

    if (efecto === 'ondas') efectoOndas(overlay, color);
    else if (efecto === 'luciernagas') efectoLuciernagas(overlay);
    else efectoEstrellas(overlay); // 'estrellas' es el default

    setTimeout(() => overlay.remove(), DURACION_MS + 200);
  };
})();
