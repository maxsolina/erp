-- Agrega columnas para registrar los datos del equipo al confirmar la recepción física en toma de equipos

ALTER TABLE public.recepciones_toma
  ADD COLUMN IF NOT EXISTS imei          TEXT,
  ADD COLUMN IF NOT EXISTS color         TEXT,
  ADD COLUMN IF NOT EXISTS bateria_pct   INTEGER,
  ADD COLUMN IF NOT EXISTS outlet        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ubicacion_id  INTEGER REFERENCES ubicaciones(id);

-- Agrega producto_id a tomas_equipo para poder ingresar el equipo al stock al confirmar la recepción
ALTER TABLE public.tomas_equipo
  ADD COLUMN IF NOT EXISTS producto_id INTEGER REFERENCES productos(id);
