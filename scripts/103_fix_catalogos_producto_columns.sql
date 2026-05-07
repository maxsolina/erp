-- ============================================================
-- 103 · Asegura tablas + columnas + UNIQUE constraint + seed
--      de categorias_producto, marcas_producto, colores_producto.
--
-- Idempotente y robusto ante schemas parciales.
--
-- Resuelve los siguientes errores:
--   - "Could not find the 'activa' column ... in the schema cache"
--     (la columna no existía → ADD COLUMN IF NOT EXISTS)
--   - "relation 'public.marcas_producto' does not exist"
--     (la tabla no existía → CREATE TABLE IF NOT EXISTS)
--   - "no unique or exclusion constraint matching ON CONFLICT"
--     (faltaba UNIQUE(nombre) en una tabla pre-existente →
--      ADD CONSTRAINT envuelto en DO/EXCEPTION)
-- ============================================================

-- ── categorias_producto ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categorias_producto (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  activa     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.categorias_producto
  ADD COLUMN IF NOT EXISTS activa BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.categorias_producto
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── marcas_producto ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marcas_producto (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  activa     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.marcas_producto
  ADD COLUMN IF NOT EXISTS activa BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.marcas_producto
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── colores_producto ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.colores_producto (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  hex        TEXT,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.colores_producto
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.colores_producto
  ADD COLUMN IF NOT EXISTS hex TEXT;
ALTER TABLE public.colores_producto
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── Limpiar duplicados antes de agregar UNIQUE ──────────────
-- Elimina filas con nombre repetido (deja la primera por id).
DELETE FROM public.categorias_producto a USING public.categorias_producto b
  WHERE a.id > b.id AND a.nombre = b.nombre;
DELETE FROM public.marcas_producto a USING public.marcas_producto b
  WHERE a.id > b.id AND a.nombre = b.nombre;
DELETE FROM public.colores_producto a USING public.colores_producto b
  WHERE a.id > b.id AND a.nombre = b.nombre;

-- ── UNIQUE constraints (idempotente vía exception handling) ─
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.categorias_producto
      ADD CONSTRAINT categorias_producto_nombre_key UNIQUE (nombre);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.marcas_producto
      ADD CONSTRAINT marcas_producto_nombre_key UNIQUE (nombre);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.colores_producto
      ADD CONSTRAINT colores_producto_nombre_key UNIQUE (nombre);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ── RLS y políticas ─────────────────────────────────────────
ALTER TABLE public.categorias_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas_producto     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colores_producto    ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['categorias_producto','marcas_producto','colores_producto'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = tbl AND policyname = 'allow_all_authenticated'
    ) THEN
      EXECUTE format(
        'CREATE POLICY allow_all_authenticated ON %I FOR ALL USING (auth.role() = ''authenticated'')',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ── Seed inicial ────────────────────────────────────────────
INSERT INTO public.categorias_producto (nombre) VALUES
  ('Celulares'), ('Accesorios'), ('Repuestos'), ('Servicios'),
  ('Usados'), ('Tablets'), ('Laptops'), ('Audio'), ('Fundas y Protectores')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.marcas_producto (nombre) VALUES
  ('Apple'), ('Samsung'), ('Motorola'), ('Xiaomi'), ('Huawei'),
  ('LG'), ('Sony'), ('OnePlus'), ('Genérica')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.colores_producto (nombre) VALUES
  ('Negro'), ('Blanco'), ('Azul'), ('Rojo'), ('Verde'),
  ('Oro'), ('Plata'), ('Rosa'), ('Violeta'), ('Transparente'), ('Gris')
ON CONFLICT (nombre) DO NOTHING;

-- ── Reload del cache de PostgREST ───────────────────────────
NOTIFY pgrst, 'reload schema';
