const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'No has iniciado sesion' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = payload.usuarioId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesion invalida o expirada' });
  }
}

module.exports = { requireAuth };
