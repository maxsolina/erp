-- =====================================================
-- MÓDULO COMPRAS: Tablas principales
-- =====================================================

-- PROVEEDORES
CREATE TABLE IF NOT EXISTS public.proveedores (
  id                SERIAL PRIMARY KEY,
  codigo            TEXT NOT NULL UNIQUE,
  razon_social      TEXT NOT NULL,
  nombre_fantasia   TEXT,
  cuit              TEXT,
  categoria         TEXT NOT NULL DEFAULT 'privado' CHECK (categoria IN ('publico', 'privado')),
  tipo              TEXT NOT NULL DEFAULT 'nacional' CHECK (tipo IN ('nacional', 'internacional', 'despachante')),
  email             TEXT,
  telefono          TEXT,
  direccion         TEXT,
  ciudad            TEXT,
  pais              TEXT DEFAULT 'Argentina',
  condicion_pago    TEXT,
  moneda_habitual   TEXT NOT NULL DEFAULT 'ARS' CHECK (moneda_habitual IN ('ARS', 'USD')),
  saldo             NUMERIC(15,2) NOT NULL DEFAULT 0,
  estado            TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ÓRDENES DE COMPRA
CREATE TABLE IF NOT EXISTS public.ordenes_compra (
  id                SERIAL PRIMARY KEY,
  numero            TEXT NOT NULL UNIQUE,
  fecha             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proveedor_id      INTEGER NOT NULL REFERENCES public.proveedores(id),
  proveedor_nombre  TEXT NOT NULL,
  estado            TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','confirmada','parcial','completa')),
  moneda            TEXT NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS','USD')),
  items             JSONB NOT NULL DEFAULT '[]',
  subtotal          NUMERIC(15,2) NOT NULL DEFAULT 0,
  total             NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RECEPCIONES
CREATE TABLE IF NOT EXISTS public.recepciones (
  id                    SERIAL PRIMARY KEY,
  numero                TEXT NOT NULL UNIQUE,
  fecha                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  orden_compra_id       INTEGER REFERENCES public.ordenes_compra(id),
  orden_compra_numero   TEXT,
  proveedor_id          INTEGER NOT NULL REFERENCES public.proveedores(id),
  proveedor_nombre      TEXT NOT NULL,
  estado                TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','confirmada')),
  legajo_id             INTEGER,
  despacho_id           INTEGER,
  items                 JSONB NOT NULL DEFAULT '[]',
  total                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FACTURAS DE COMPRA
CREATE TABLE IF NOT EXISTS public.facturas_compra (
  id                  SERIAL PRIMARY KEY,
  numero              TEXT NOT NULL,
  tipo                TEXT NOT NULL DEFAULT 'A' CHECK (tipo IN ('A','B','C')),
  fecha               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_vencimiento   TIMESTAMPTZ,
  proveedor_id        INTEGER NOT NULL REFERENCES public.proveedores(id),
  proveedor_nombre    TEXT NOT NULL,
  recepcion_id        INTEGER REFERENCES public.recepciones(id),
  estado              TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','pagada','vencida')),
  subtotal            NUMERIC(15,2) NOT NULL DEFAULT 0,
  iva                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  total               NUMERIC(15,2) NOT NULL DEFAULT 0,
  saldo               NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ÓRDENES DE PAGO
CREATE TABLE IF NOT EXISTS public.ordenes_pago (
  id                SERIAL PRIMARY KEY,
  numero            TEXT NOT NULL UNIQUE,
  fecha             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proveedor_id      INTEGER NOT NULL REFERENCES public.proveedores(id),
  proveedor_nombre  TEXT NOT NULL,
  estado            TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','emitida','pagada')),
  facturas          JSONB NOT NULL DEFAULT '[]',
  monto             NUMERIC(15,2) NOT NULL DEFAULT 0,
  forma_pago        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTAS DE CRÉDITO DE COMPRA
CREATE TABLE IF NOT EXISTS public.notas_credito_compra (
  id                  SERIAL PRIMARY KEY,
  numero              TEXT NOT NULL,
  tipo                TEXT NOT NULL DEFAULT 'A' CHECK (tipo IN ('A','B','C')),
  fecha               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proveedor_id        INTEGER NOT NULL REFERENCES public.proveedores(id),
  proveedor_nombre    TEXT NOT NULL,
  factura_compra_id   INTEGER REFERENCES public.facturas_compra(id),
  factura_numero      TEXT,
  motivo              TEXT,
  estado              TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aplicada','cancelada')),
  subtotal            NUMERIC(15,2) NOT NULL DEFAULT 0,
  iva                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  total               NUMERIC(15,2) NOT NULL DEFAULT 0,
  items               JSONB NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTAS DE DÉBITO DE COMPRA
CREATE TABLE IF NOT EXISTS public.notas_debito_compra (
  id                  SERIAL PRIMARY KEY,
  numero              TEXT NOT NULL,
  tipo                TEXT NOT NULL DEFAULT 'A' CHECK (tipo IN ('A','B','C')),
  fecha               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proveedor_id        INTEGER NOT NULL REFERENCES public.proveedores(id),
  proveedor_nombre    TEXT NOT NULL,
  factura_compra_id   INTEGER REFERENCES public.facturas_compra(id),
  factura_numero      TEXT,
  motivo              TEXT,
  estado              TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aplicada','cancelada')),
  subtotal            NUMERIC(15,2) NOT NULL DEFAULT 0,
  iva                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  total               NUMERIC(15,2) NOT NULL DEFAULT 0,
  items               JSONB NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- RLS: habilitar y permitir acceso anónimo (mismo patrón que el resto del proyecto)
-- =====================================================
ALTER TABLE public.proveedores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_compra        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recepciones           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas_compra       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_pago          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_credito_compra  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_debito_compra   ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (misma convención que las otras tablas del proyecto)
CREATE POLICY "allow_all_proveedores"          ON public.proveedores          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_ordenes_compra"       ON public.ordenes_compra       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_recepciones"          ON public.recepciones          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_facturas_compra"      ON public.facturas_compra      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_ordenes_pago"         ON public.ordenes_pago         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_notas_credito_compra" ON public.notas_credito_compra FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_notas_debito_compra"  ON public.notas_debito_compra  FOR ALL USING (true) WITH CHECK (true);
