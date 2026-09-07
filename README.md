# Habit Tracker NFC — Fase 1 (nucleo funcional)

Que incluye esta fase:
- Login/registro de usuarios (multi-cuenta)
- Crear/editar/borrar habitos (nombre, color, descripcion, horario opcional, modo NFC o manual, efecto elegido)
- Marcar cumplido via URL de chip NFC o boton manual
- Anti-duplicado (un cumplido por dia por habito) y boton de deshacer
- Monedas: +1 por habito, +3 de bonus por dia perfecto
- Sincronizacion de escaneos guardados sin internet

Lo que falta (fases siguientes, ya definidas pero no implementadas aun):
- Trofeos por rachas (7/15/30/100 dias)
- Animaciones reales de los 3 efectos visuales (por ahora solo hay un `console.log` marcado con TODO en `public/marcar.js`)
- Tienda (pinturas + temas) y panel de desarrollador
- Calendario y mapa de calor de estadisticas

## Como probarlo en tu computadora

1. Instala las dependencias:
   ```
   npm install
   ```
2. Copia `.env.example` a `.env` y ajusta `DATABASE_URL` (puedes usar un Postgres local o uno de Railway) y `JWT_SECRET`.
3. Crea las tablas:
   ```
   npm run db:init
   ```
4. Arranca el servidor:
   ```
   npm start
   ```
5. Abre `http://localhost:3000` en tu navegador.

## Como subirlo a Railway

1. Crea un proyecto nuevo en Railway y sube este codigo (por GitHub, o con `railway up` desde la CLI).
2. Agrega un servicio de **PostgreSQL** dentro del mismo proyecto — Railway crea automaticamente la variable `DATABASE_URL` y la comparte con tu app.
3. En las variables de entorno de tu servicio, agrega `JWT_SECRET` con un valor largo y aleatorio.
4. Railway va a correr `npm start` automaticamente. La primera vez, necesitas correr `npm run db:init` una sola vez para crear las tablas — puedes hacerlo desde la terminal de Railway (`railway run npm run db:init`) o agregandolo temporalmente como comando de build.
5. Una vez desplegado, Railway te da una URL publica (algo como `https://tuapp.up.railway.app`) — esa es la que usaras para armar las URLs de tus chips NFC.

## Como grabar un chip NFC

1. Crea el habito en la app en modo "Chip NFC".
2. Entra al detalle del habito — ahi te muestro la URL exacta que debes grabar, algo como:
   ```
   https://tuapp.up.railway.app/marcar.html?tag=a1b2c3d4e5f6
   ```
3. Usa una app como "NFC Tools" (Android/iOS) para grabar esa URL como un registro NDEF de tipo URL en tu chip fisico.
4. Pega el chip en tu objeto (el libro, etc.) y listo — al acercar el telefono, se abrira esa pagina y marcara el cumplido.

## Estructura del proyecto

```
habit-tracker/
├── server.js              # Servidor Express principal
├── db/
│   ├── schema.sql          # Tablas de la base de datos
│   ├── pool.js              # Conexion a Postgres
│   └── init.js               # Script para crear las tablas
├── middleware/
│   └── auth.js              # Verifica la sesion (JWT en cookie)
├── routes/
│   ├── auth.js               # Registro / login / logout
│   ├── habitos.js            # CRUD de habitos
│   └── scan.js                # Marcar cumplido, deshacer, sync offline
└── public/
    ├── index.html            # Dashboard + formulario de habitos
    ├── app.js
    ├── marcar.html            # Pagina que abre el chip NFC
    ├── marcar.js
    └── styles.css
```
