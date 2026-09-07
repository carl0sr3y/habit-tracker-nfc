-- Esquema inicial: usuarios, habitos, cumplidos

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  monedas INTEGER NOT NULL DEFAULT 0,
  ultimo_bonus_dia_perfecto DATE, -- evita dar el bonus de 3 monedas mas de una vez por dia
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habitos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#4f46e5',
  descripcion TEXT,
  modo TEXT NOT NULL DEFAULT 'nfc' CHECK (modo IN ('nfc', 'manual')),
  tag_nfc_id TEXT, -- identificador único que viaja en la URL del chip (solo si modo = nfc)
  hora_inicio TIME, -- NULL = sin restricción de horario
  hora_fin TIME,
  efecto_visual TEXT NOT NULL DEFAULT 'estrellas' CHECK (efecto_visual IN ('estrellas', 'ondas', 'luciernagas')),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_habitos_tag_nfc ON habitos(tag_nfc_id) WHERE tag_nfc_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS cumplidos (
  id SERIAL PRIMARY KEY,
  habito_id INTEGER NOT NULL REFERENCES habitos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL, -- solo el día, para la regla de "un cumplido por día"
  marcado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  activo BOOLEAN NOT NULL DEFAULT true, -- false = deshecho por el usuario
  sincronizado_offline BOOLEAN NOT NULL DEFAULT false
);

-- Solo puede existir UN cumplido activo por hábito por día
CREATE UNIQUE INDEX IF NOT EXISTS idx_un_cumplido_por_dia
  ON cumplidos(habito_id, fecha)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_cumplidos_habito ON cumplidos(habito_id);
