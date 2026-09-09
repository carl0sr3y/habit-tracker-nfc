require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const habitosRoutes = require('./routes/habitos');
const scanRoutes = require('./routes/scan');
const perfilRoutes = require('./routes/perfil');
const tiendaRoutes = require('./routes/tienda');
const adminRoutes = require('./routes/admin');
const estadisticasRoutes = require('./routes/estadisticas');

const app = express();

app.use(express.json({ limit: '8mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/habitos', habitosRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/tienda', tiendaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/estadisticas', estadisticasRoutes);

// Cualquier ruta no reconocida por la API sirve el index (SPA sencilla)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
