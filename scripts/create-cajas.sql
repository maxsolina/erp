-- ============================================================================
-- Configuración de Cajas — Módulo Finanzas
-- ============================================================================

-- Tabla de Cajas (contenedor físico donde se guarda el dinero)
CREATE TABLE IF NOT EXISTS cajas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(20),
  sucursal VARCHAR(50) NOT NULL,
  cierre_diario_obligatorio BOOLEAN DEFAULT true,
  no_valida_cierre_sabados BOOLEAN DEFAULT false,
  no_valida_cierre_domingos BOOLEAN DEFAULT false,
  no_valida_cierre_feriados BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Valores (diarios contables dentro de cada caja)
CREATE TABLE IF NOT EXISTS caja_valores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caja_id UUID REFERENCES cajas(id) ON DELETE CASCADE,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('efectivo', 'banco_cheques')),
  moneda VARCHAR(10) DEFAULT 'ARS',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Usuarios habilitados por caja
CREATE TABLE IF NOT EXISTS caja_usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caja_id UUID REFERENCES cajas(id) ON DELETE CASCADE,
  usuario_id UUID,
  usuario_nombre VARCHAR(100),
  es_cobrador BOOLEAN DEFAULT false,
  es_vendedor BOOLEAN DEFAULT false,
  para_transferencias BOOLEAN DEFAULT false
);

-- Tabla de Bancos habilitados por caja
CREATE TABLE IF NOT EXISTS caja_bancos_permitidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caja_id UUID REFERENCES cajas(id) ON DELETE CASCADE,
  banco_nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(20),
  tipo VARCHAR(30) DEFAULT 'banco_cheques',
  moneda VARCHAR(10) DEFAULT 'ARS'
);

-- Datos iniciales (seed)
INSERT INTO cajas (nombre, codigo, sucursal, cierre_diario_obligatorio) VALUES
  ('CC- Caja fuerte', 'CF', 'Casa Central', true),
  ('CC- Recepcion', 'REC', 'Casa Central', true),
  ('CC- Adm', 'ADM', 'Casa Central', true),
  ('CC- Transferencias', 'TRF', 'Casa Central', false),
  ('PN- Caja fuerte', 'PNCF', 'Puerto Norte', true),
  ('PN- Invitados', 'PNINV', 'Puerto Norte', true),
  ('CS- Caja fuerte', 'CSCF', 'Casilda', true),
  ('CS- Recepcion', 'CSREC', 'Casilda', true);

-- Valores iniciales para CC- Caja fuerte
INSERT INTO caja_valores (caja_id, codigo, nombre, tipo, moneda)
SELECT id, 'CHCCF', 'Cheques de Terceros - CC Caja fuerte', 'banco_cheques', 'ARS'
FROM cajas WHERE nombre = 'CC- Caja fuerte';

INSERT INTO caja_valores (caja_id, codigo, nombre, tipo, moneda)
SELECT id, 'EFE00-CF', 'Efectivo - CF', 'efectivo', 'ARS'
FROM cajas WHERE nombre = 'CC- Caja fuerte';

INSERT INTO caja_valores (caja_id, codigo, nombre, tipo, moneda)
SELECT id, 'USDCF', 'Dólares - CF', 'efectivo', 'USD'
FROM cajas WHERE nombre = 'CC- Caja fuerte';
