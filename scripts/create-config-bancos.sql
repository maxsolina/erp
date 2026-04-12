-- ============================================================================
-- Configuración de Bancos: tabla bancos, chequeras, tipos_movimiento_bancario
-- + ALTER en cuentas_bancarias y conceptos_registro_caja
-- Módulo Finanzas → Configuración
-- Prerequisito: cuentas_bancarias, conceptos_registro_caja, tipos_prestamo
-- ============================================================================

-- ─── Maestro de Bancos ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bancos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  direccion VARCHAR(200),
  telefono VARCHAR(50),
  email VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed bancos argentinos principales (BCRA)
INSERT INTO bancos (codigo, nombre) VALUES
  ('007', 'Banco De Galicia Y Buenos Aires S.A.'),
  ('011', 'Banco De La Nacion Argentina'),
  ('014', 'Banco De La Provincia De Buenos Aires'),
  ('017', 'Bbva Banco Frances S.A.'),
  ('020', 'Banco De La Provincia De Cordoba S.A.'),
  ('027', 'Banco Supervielle S.A.'),
  ('029', 'Banco De La Ciudad De Buenos Aires'),
  ('034', 'Banco Patagonia S.A.'),
  ('044', 'Banco Hipotecario S.A.'),
  ('045', 'Banco San Juan S.A.'),
  ('060', 'Banco Del Tucuman S.A.'),
  ('065', 'Banco Municipal De Rosario'),
  ('072', 'Banco Santander Rio S.A.'),
  ('083', 'Banco Del Chubut S.A.'),
  ('086', 'Banco De Santa Cruz S.A.'),
  ('093', 'Banco De La Pampa Sociedad De Economía M'),
  ('094', 'Banco De Corrientes S.A.'),
  ('097', 'Banco Provincia Del Neuquén Sociedad Anó'),
  ('143', 'Brubank S.A.U.'),
  ('147', 'Banco B.I. Creditanstalt Sociedad Anonim'),
  ('150', 'Hsbc Bank Argentina S.A.'),
  ('158', 'Banco Bice S.A.'),
  ('165', 'Banco Icbc Argentina S.A.'),
  ('191', 'Banco Credicoop Cooperativo Limitado'),
  ('198', 'Banco De Valores S.A.'),
  ('247', 'Banco Roela S.A.'),
  ('254', 'Banco Mariva S.A.'),
  ('259', 'Banco Itau Argentina S.A.'),
  ('262', 'Bank Of America, National Association'),
  ('266', 'Bco. Cma S.A.'),
  ('268', 'Banco Mas Ventas S.A.'),
  ('269', 'Banco Julio Sociedad Anonima'),
  ('277', 'Biodiversidad Sociedad De Garantia Recip'),
  ('281', 'Banco Comafi Sociedad Anonima'),
  ('285', 'Banco Macro S.A.'),
  ('287', 'Banco Del Sol S.A.'),
  ('289', 'Nuevo Banco Del Chaco S.A.'),
  ('294', 'Banco De Formosa S.A.'),
  ('295', 'Banco Columbia S.A.'),
  ('299', 'Banco Comafi Sociedad Anonima'),
  ('300', 'Banco Coinag S.A.'),
  ('301', 'Banco Municipal De Corrientes'),
  ('305', 'Mercado Pago S.A.'),
  ('309', 'Naranja X'),
  ('310', 'Ualá'),
  ('311', 'Prex'),
  ('315', 'Banco De Formosa S.A.'),
  ('319', 'Banco Cmf S.A.'),
  ('321', 'Banco Meridian S.A.'),
  ('322', 'Banco Masventas S.A.'),
  ('330', 'Banco Hipotecario S.A.'),
  ('331', 'Banco Cetelem Argentina S.A.'),
  ('332', 'Banco De Servicios Financieros S.A.'),
  ('336', 'Banco Bradesco Argentina S.A.'),
  ('339', 'Banco De Servicios Y Transacciones S.A.'),
  ('340', 'Bacs Banco De Credito Y Securitizacion S'),
  ('341', 'Banco Dino S.A.'),
  ('384', 'Wilobank S.A.'),
  ('386', 'Nuevo Banco De Santa Fe Sociedad Anonima'),
  ('389', 'Banco Columbia S.A.'),
  ('406', 'Banco Bica S.A.'),
  ('408', 'Banco Coinag S.A.'),
  ('413', 'Banco Del Sol S.A.'),
  ('415', 'Nuevo Banco Del Chaco S.A.'),
  ('431', 'Banco Coinag S.A.'),
  ('432', 'Banco De Comercio S.A.'),
  ('435', 'Banco Bica S.A.')
ON CONFLICT (codigo) DO NOTHING;

-- ─── Agregar banco_id a cuentas_bancarias ───────────────────────────────────
ALTER TABLE cuentas_bancarias
  ADD COLUMN IF NOT EXISTS banco_id UUID REFERENCES bancos(id),
  ADD COLUMN IF NOT EXISTS disponible_facturas_credito BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS direccion_propietario VARCHAR(200);

-- ─── Chequeras ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chequeras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cuenta_bancaria_id UUID REFERENCES cuentas_bancarias(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) DEFAULT 'diferidos'
    CHECK (tipo IN ('diferidos', 'corrientes')),
  desde_numero INTEGER DEFAULT 0,
  hasta_numero INTEGER DEFAULT 9999999,
  proximo_numero INTEGER DEFAULT 1,
  estado VARCHAR(20) DEFAULT 'en_uso'
    CHECK (estado IN ('en_uso', 'agotada', 'anulada')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Tipos de Movimiento Bancario ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tipos_movimiento_bancario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  codigo_causal VARCHAR(10) NOT NULL UNIQUE,
  emite_cheques_diferidos BOOLEAN DEFAULT false,
  emite_cheques_corrientes BOOLEAN DEFAULT false,
  disponible_en_pagos BOOLEAN DEFAULT false,
  disponible_en_cobros BOOLEAN DEFAULT false,
  disponible_en_finanzas BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true
);

INSERT INTO tipos_movimiento_bancario
  (nombre, codigo_causal, emite_cheques_diferidos, emite_cheques_corrientes,
   disponible_en_pagos, disponible_en_cobros, disponible_en_finanzas) VALUES
  ('Transferencia', 'TR', false, false, true, true, true),
  ('Cheque Diferido', 'CHQD', true, false, true, false, true),
  ('Cheque Corriente', 'CHQC', false, true, true, false, true),
  ('Extracción', 'EX', false, false, false, false, true),
  ('Depósito', 'DEP', false, false, true, true, true),
  ('Débito Bancario', 'DB', false, false, true, false, true),
  ('Débito Automático', 'DA', false, false, true, true, true),
  ('Transferencia entre Cuentas Propias', 'TP', false, false, false, false, true),
  ('Acreditación de Tarjeta', 'TT', false, false, false, false, true),
  ('Extracción con Cheque', 'ECC', true, false, false, false, true)
ON CONFLICT (codigo_causal) DO NOTHING;

-- ─── Agregar columnas faltantes a conceptos_registro_caja ───────────────────
ALTER TABLE conceptos_registro_caja
  ADD COLUMN IF NOT EXISTS visible_en_ajuste_cajas BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS visible_en_ajuste_banco BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS visible_en_transferencias BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS visible_en_cancelaciones BOOLEAN DEFAULT false;

-- Actualizar flags de visibilidad en conceptos existentes
UPDATE conceptos_registro_caja SET visible_en_ajuste_cajas = true
WHERE codigo IN ('DifCaja', 'PRO', 'PrestObt', 'DevVta', 'CV');

UPDATE conceptos_registro_caja SET visible_en_caja = true
WHERE codigo IN ('COM', 'GASLB', 'CADE', 'GASLIM', 'INSPEGTOR',
                 'RETSOCMS', 'GASOFIC', 'COMVENT', 'SUPER', 'DifCaja',
                 'TaxisCadetes', 'PARACLIENTES');

UPDATE conceptos_registro_caja SET visible_en_banco = true
WHERE codigo IN ('RETSOCMS', 'GtosVs', 'GtosTras', 'ViajCom',
                 'COMBANC', 'PrestObt', 'Cupones', 'GASTFINAN');

UPDATE conceptos_registro_caja SET visible_en_transferencias = true
WHERE codigo = 'TRANSF';

-- Agregar campos adicionales a tipos_prestamo (para modal completo)
ALTER TABLE tipos_prestamo
  ADD COLUMN IF NOT EXISTS concepto_liquidacion VARCHAR(200);

-- ─── Índices ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bancos_activo ON bancos(activo);
CREATE INDEX IF NOT EXISTS idx_chequeras_cuenta ON chequeras(cuenta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_tipos_mov_bancario_activo ON tipos_movimiento_bancario(activo);
