-- Esquema inicial: usuarios, habitos, cumplidos

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  monedas INTEGER NOT NULL DEFAULT 0,
  ultimo_bonus_dia_perfecto DATE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habitos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#4f46e5',
  descripcion TEXT,
  modo TEXT NOT NULL DEFAULT 'nfc' CHECK (modo IN ('nfc', 'manual')),
  tag_nfc_id TEXT,
  hora_inicio TIME,
  hora_fin TIME,
  efecto_visual TEXT NOT NULL DEFAULT 'estrellas' CHECK (efecto_visual IN ('estrellas', 'ondas', 'luciernagas')),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_habitos_tag_nfc ON habitos(tag_nfc_id) WHERE tag_nfc_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS cumplidos (
  id SERIAL PRIMARY KEY,
  habito_id INTEGER NOT NULL REFERENCES habitos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  marcado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  activo BOOLEAN NOT NULL DEFAULT true,
  sincronizado_offline BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_un_cumplido_por_dia
  ON cumplidos(habito_id, fecha)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_cumplidos_habito ON cumplidos(habito_id);

-- ===== Fase 2: rachas y trofeos =====

ALTER TABLE habitos ADD COLUMN IF NOT EXISTS racha_maxima INTEGER NOT NULL DEFAULT 0;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS racha_maxima_dia_perfecto INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS dias_perfectos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  UNIQUE(usuario_id, fecha)
);

CREATE TABLE IF NOT EXISTS trofeos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('habito', 'dia_perfecto')),
  habito_id INTEGER REFERENCES habitos(id) ON DELETE CASCADE,
  dias INTEGER NOT NULL CHECK (dias IN (7, 15, 30, 100)),
  ganado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trofeo_habito_unico
  ON trofeos(habito_id, dias) WHERE tipo = 'habito';

CREATE UNIQUE INDEX IF NOT EXISTS idx_trofeo_dia_perfecto_unico
  ON trofeos(usuario_id, dias) WHERE tipo = 'dia_perfecto';

-- ===== Fase 4: tienda (pinturas + temas) y panel de desarrollador =====

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tema_activo TEXT;

CREATE TABLE IF NOT EXISTS pinturas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  imagen_url TEXT NOT NULL,
  precio INTEGER NOT NULL CHECK (precio > 0),
  marco TEXT NOT NULL CHECK (marco IN ('bronce', 'plata', 'oro')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS temas (
  id SERIAL PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  nivel TEXT NOT NULL CHECK (nivel IN ('comun', 'epico', 'legendario')),
  precio INTEGER NOT NULL CHECK (precio > 0)
);

INSERT INTO temas (clave, nombre, nivel, precio) VALUES
  ('bosque', 'Bosque', 'comun', 20),
  ('aurora', 'Aurora Boreal', 'epico', 50),
  ('dorado', 'Dorado Real', 'legendario', 120)
ON CONFLICT (clave) DO NOTHING;

CREATE TABLE IF NOT EXISTS compras_pinturas (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pintura_id INTEGER NOT NULL REFERENCES pinturas(id) ON DELETE CASCADE,
  comprado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, pintura_id)
);

CREATE TABLE IF NOT EXISTS compras_temas (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tema_id INTEGER NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
  comprado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, tema_id)
);