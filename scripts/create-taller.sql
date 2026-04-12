-- ============================================================================
-- Módulo Taller — Tablas, funciones, índices y RLS
-- Cell Home ERP — Spec v2.0
-- Prerequisito: sucursales, clientes, productos, facturas, notas_venta,
--               ordenes_compra, recibos, remitos, extractos_caja
-- ============================================================================

-- ─── 1. Áreas de Reparación ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_areas_reparacion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. Categorías de Reparación ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_categorias_reparacion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  area_id UUID NOT NULL REFERENCES taller_areas_reparacion(id),
  orden_asignacion INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taller_cat_rep_area ON taller_categorias_reparacion(area_id);

-- ─── 3. Tipos de OT ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_tipos_ot (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  codigo TEXT NOT NULL UNIQUE,
  area_id UUID NOT NULL REFERENCES taller_areas_reparacion(id),
  tipo_tecnico TEXT NOT NULL DEFAULT 'ambos'
    CHECK (tipo_tecnico IN ('propio', 'tercero', 'ambos')),
  es_garantia_compra BOOLEAN DEFAULT false,
  es_garantia_reparacion BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taller_tipos_ot_area ON taller_tipos_ot(area_id);

-- ─── 4. Equipos ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_equipos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  area_id UUID NOT NULL REFERENCES taller_areas_reparacion(id),
  dias_garantia_compra INTEGER DEFAULT 0,
  dias_garantia_reparacion INTEGER DEFAULT 30,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taller_equipos_area ON taller_equipos(area_id);

-- ─── 5. Fallas ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_fallas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  area_id UUID NOT NULL REFERENCES taller_areas_reparacion(id),
  categoria_id UUID NOT NULL REFERENCES taller_categorias_reparacion(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taller_fallas_area ON taller_fallas(area_id);
CREATE INDEX IF NOT EXISTS idx_taller_fallas_cat ON taller_fallas(categoria_id);

-- ─── 6. Turnos de Técnicos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_turnos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  hora_entrada TIME NOT NULL,
  hora_salida TIME NOT NULL,
  trabaja_sabado BOOLEAN DEFAULT false,
  trabaja_domingo BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 7. Técnicos ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_tecnicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('propio', 'tercero')),
  area_id UUID NOT NULL REFERENCES taller_areas_reparacion(id),
  categoria_principal_id UUID REFERENCES taller_categorias_reparacion(id),
  complejidad_tope INTEGER,
  turno_id UUID NOT NULL REFERENCES taller_turnos(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taller_tecnicos_area ON taller_tecnicos(area_id);
CREATE INDEX IF NOT EXISTS idx_taller_tecnicos_turno ON taller_tecnicos(turno_id);

-- Categorías secundarias de técnicos (tabla intermedia)
CREATE TABLE IF NOT EXISTS taller_tecnico_categorias_secundarias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tecnico_id UUID NOT NULL REFERENCES taller_tecnicos(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES taller_categorias_reparacion(id),
  UNIQUE (tecnico_id, categoria_id)
);

-- ─── 8. Ausencias de Técnicos ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_tecnico_ausencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tecnico_id UUID NOT NULL REFERENCES taller_tecnicos(id) ON DELETE CASCADE,
  fecha_desde DATE NOT NULL,
  fecha_hasta DATE NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taller_ausencias_tecnico ON taller_tecnico_ausencias(tecnico_id);

-- ─── 9. Fallas por Equipos ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_fallas_por_equipo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipo_id UUID NOT NULL REFERENCES taller_equipos(id),
  falla_id UUID NOT NULL REFERENCES taller_fallas(id),
  categoria_id UUID REFERENCES taller_categorias_reparacion(id),
  complejidad_principal INTEGER NOT NULL DEFAULT 1,
  complejidad_secundaria INTEGER NOT NULL DEFAULT 1,
  tiempo_reparacion_principal INTEGER DEFAULT 0,
  tiempo_reparacion_secundaria INTEGER DEFAULT 0,
  puntaje_base INTEGER DEFAULT 50 CHECK (puntaje_base BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taller_fe_equipo ON taller_fallas_por_equipo(equipo_id);
CREATE INDEX IF NOT EXISTS idx_taller_fe_falla ON taller_fallas_por_equipo(falla_id);

-- Repuestos de fallas por equipo
CREATE TABLE IF NOT EXISTS taller_fallas_por_equipo_repuestos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  falla_equipo_id UUID NOT NULL REFERENCES taller_fallas_por_equipo(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL,
  cantidad DECIMAL(10,2) DEFAULT 1
);

-- ─── 10. Feriados ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_feriados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 11. Controles / Checklist ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_controles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  area_id UUID NOT NULL REFERENCES taller_areas_reparacion(id),
  categoria_id UUID REFERENCES taller_categorias_reparacion(id),
  disponible_recepcion BOOLEAN DEFAULT false,
  obs_recepcion_visible BOOLEAN DEFAULT false,
  obs_recepcion_requerida BOOLEAN DEFAULT false,
  disponible_calidad BOOLEAN DEFAULT false,
  obs_calidad_visible BOOLEAN DEFAULT false,
  obs_calidad_requerida BOOLEAN DEFAULT false,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taller_controles_area ON taller_controles(area_id);

-- ─── 12. Motivos de Cierre ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_motivos_cierre (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 13. Órdenes de Trabajo ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_ordenes_trabajo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  sucursal_id UUID,
  area_id UUID NOT NULL REFERENCES taller_areas_reparacion(id),
  tipo_ot_id UUID NOT NULL REFERENCES taller_tipos_ot(id),
  tipo_tecnico TEXT CHECK (tipo_tecnico IN ('propio', 'tercero', 'ambos')),
  cliente_id UUID NOT NULL,
  categoria_cliente TEXT CHECK (categoria_cliente IN ('publico', 'mayorista')),
  celular_contacto TEXT NOT NULL,
  factura_origen_id UUID,
  ot_origen_id UUID REFERENCES taller_ordenes_trabajo(id),
  equipo_id UUID NOT NULL REFERENCES taller_equipos(id),
  falla_principal_id UUID NOT NULL REFERENCES taller_fallas(id),
  categoria_reparacion_id UUID REFERENCES taller_categorias_reparacion(id),
  tecnico_id UUID REFERENCES taller_tecnicos(id),
  estado TEXT NOT NULL DEFAULT 'borrador'
    CHECK (estado IN (
      'borrador', 'sin_asignar', 'asignada', 'asignada_en_proceso',
      'control_calidad', 'facturado', 'a_entregar', 'entregado',
      're_presupuestacion', 'falta_repuestos', 'cancelada'
    )),
  fecha_creacion TIMESTAMPTZ DEFAULT now(),
  fecha_asignacion TIMESTAMPTZ,
  fecha_inicio_proceso TIMESTAMPTZ,
  fecha_control_calidad TIMESTAMPTZ,
  fecha_facturado TIMESTAMPTZ,
  fecha_entregado TIMESTAMPTZ,
  imei TEXT,
  serial_number TEXT,
  codigo_desbloqueo TEXT,
  ingresa_apagado BOOLEAN DEFAULT false,
  ingresa_mojado BOOLEAN DEFAULT false,
  deja_cargador BOOLEAN DEFAULT false,
  requerido_mkt BOOLEAN DEFAULT false,
  retrabajo BOOLEAN DEFAULT false,
  presupuesto_estimado DECIMAL(15,2),
  descripcion TEXT,
  dias_garantia_reparacion INTEGER,
  tiempo_reparacion_teorico INTEGER,
  tiempo_reparacion_real INTEGER,
  puntaje DECIMAL(10,2),
  motivo_cierre_id UUID REFERENCES taller_motivos_cierre(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taller_ot_estado ON taller_ordenes_trabajo(estado);
CREATE INDEX IF NOT EXISTS idx_taller_ot_tecnico ON taller_ordenes_trabajo(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_taller_ot_cliente ON taller_ordenes_trabajo(cliente_id);
CREATE INDEX IF NOT EXISTS idx_taller_ot_area ON taller_ordenes_trabajo(area_id);
CREATE INDEX IF NOT EXISTS idx_taller_ot_equipo ON taller_ordenes_trabajo(equipo_id);
CREATE INDEX IF NOT EXISTS idx_taller_ot_fecha ON taller_ordenes_trabajo(fecha_creacion);

-- Fallas secundarias de la OT
CREATE TABLE IF NOT EXISTS taller_ot_fallas_secundarias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ot_id UUID NOT NULL REFERENCES taller_ordenes_trabajo(id) ON DELETE CASCADE,
  falla_id UUID NOT NULL REFERENCES taller_fallas(id),
  UNIQUE (ot_id, falla_id)
);

-- ─── 14. Repuestos y Servicios de la OT ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_ot_repuestos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ot_id UUID NOT NULL REFERENCES taller_ordenes_trabajo(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL,
  producto_nombre TEXT,
  cantidad DECIMAL(10,2) DEFAULT 1,
  unidad TEXT DEFAULT 'un',
  precio_unitario DECIMAL(15,2) DEFAULT 0,
  descuento_pct DECIMAL(5,2) DEFAULT 0,
  subtotal DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_taller_ot_rep_ot ON taller_ot_repuestos(ot_id);

-- ─── 15. Controles de la OT ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_ot_controles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ot_id UUID NOT NULL REFERENCES taller_ordenes_trabajo(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('inicial', 'final')),
  historico BOOLEAN DEFAULT false,
  completado BOOLEAN DEFAULT false,
  observaciones_generales TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taller_ot_ctrl_ot ON taller_ot_controles(ot_id);

-- Items del control
CREATE TABLE IF NOT EXISTS taller_ot_control_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  control_id UUID NOT NULL REFERENCES taller_ot_controles(id) ON DELETE CASCADE,
  control_maestro_id UUID REFERENCES taller_controles(id),
  nombre TEXT NOT NULL,
  obs_inicial TEXT,
  check_inicial BOOLEAN DEFAULT false,
  obs_final TEXT,
  check_final BOOLEAN DEFAULT false
);

-- ─── 16. Historial de la OT ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_ot_historial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ot_id UUID NOT NULL REFERENCES taller_ordenes_trabajo(id) ON DELETE CASCADE,
  fecha TIMESTAMPTZ DEFAULT now(),
  usuario TEXT,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  campo_modificado TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  nota TEXT
);

CREATE INDEX IF NOT EXISTS idx_taller_ot_hist_ot ON taller_ot_historial(ot_id);

-- ─── 17. Impresoras ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_impresoras (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sucursal_id UUID,
  nombre_impresora TEXT NOT NULL,
  driver TEXT,
  estado TEXT DEFAULT 'offline'
    CHECK (estado IN ('idle', 'printing', 'offline')),
  ultima_conexion TIMESTAMPTZ,
  es_default_entrega_individual BOOLEAN DEFAULT false,
  es_default_entrega_grupal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 18. Cola de Impresión ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS taller_cola_impresion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ot_id UUID REFERENCES taller_ordenes_trabajo(id),
  tipo_documento TEXT,
  impresora_id UUID REFERENCES taller_impresoras(id),
  pdf_url TEXT,
  estado TEXT DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'imprimiendo', 'completado', 'error')),
  error_mensaje TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_taller_cola_estado ON taller_cola_impresion(estado);

-- ─── Secuencia y función para número de OT ──────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS taller_ot_seq START 1;

CREATE OR REPLACE FUNCTION generar_numero_ot()
RETURNS TEXT AS $$
DECLARE v_year TEXT; v_numero INTEGER;
BEGIN
  v_year := EXTRACT(YEAR FROM now())::TEXT;
  v_numero := nextval('taller_ot_seq');
  RETURN 'OT-' || v_year || '-' || LPAD(v_numero::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIONES DE NEGOCIO
-- ============================================================================

-- ─── Calcular minutos laborales entre dos timestamps ────────────────────────
-- Excluye: fuera de turno, sábados/domingos (si no trabaja), feriados, ausencias
CREATE OR REPLACE FUNCTION taller_calcular_minutos_laborales(
  p_inicio TIMESTAMPTZ,
  p_fin TIMESTAMPTZ,
  p_tecnico_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_turno RECORD;
  v_current DATE;
  v_end_date DATE;
  v_total_min INTEGER := 0;
  v_day_start TIMESTAMPTZ;
  v_day_end TIMESTAMPTZ;
  v_work_start TIMESTAMPTZ;
  v_work_end TIMESTAMPTZ;
  v_dow INTEGER;
  v_is_holiday BOOLEAN;
  v_is_absent BOOLEAN;
BEGIN
  -- Obtener turno del técnico
  SELECT t.hora_entrada, t.hora_salida, t.trabaja_sabado, t.trabaja_domingo
  INTO v_turno
  FROM taller_tecnicos tc
  JOIN taller_turnos t ON t.id = tc.turno_id
  WHERE tc.id = p_tecnico_id;

  IF v_turno IS NULL THEN RETURN 0; END IF;

  v_current := p_inicio::DATE;
  v_end_date := p_fin::DATE;

  WHILE v_current <= v_end_date LOOP
    v_dow := EXTRACT(DOW FROM v_current); -- 0=dom, 6=sab

    -- Verificar sábado/domingo según turno
    IF (v_dow = 6 AND NOT v_turno.trabaja_sabado) OR
       (v_dow = 0 AND NOT v_turno.trabaja_domingo) THEN
      v_current := v_current + 1;
      CONTINUE;
    END IF;

    -- Verificar feriado
    SELECT EXISTS(SELECT 1 FROM taller_feriados WHERE fecha = v_current)
    INTO v_is_holiday;
    IF v_is_holiday THEN
      v_current := v_current + 1;
      CONTINUE;
    END IF;

    -- Verificar ausencia del técnico
    SELECT EXISTS(
      SELECT 1 FROM taller_tecnico_ausencias
      WHERE tecnico_id = p_tecnico_id
        AND v_current BETWEEN fecha_desde AND fecha_hasta
    ) INTO v_is_absent;
    IF v_is_absent THEN
      v_current := v_current + 1;
      CONTINUE;
    END IF;

    -- Calcular ventana laboral del día
    v_day_start := v_current + v_turno.hora_entrada;
    v_day_end := v_current + v_turno.hora_salida;

    -- Intersectar con el rango solicitado
    v_work_start := GREATEST(v_day_start, p_inicio);
    v_work_end := LEAST(v_day_end, p_fin);

    IF v_work_end > v_work_start THEN
      v_total_min := v_total_min + EXTRACT(EPOCH FROM (v_work_end - v_work_start))::INTEGER / 60;
    END IF;

    v_current := v_current + 1;
  END LOOP;

  RETURN v_total_min;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── Calcular puntaje de reparación ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION taller_calcular_puntaje(
  p_ot_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  v_ot RECORD;
  v_puntaje_base DECIMAL;
  v_cnt INTEGER;
  v_ratio DECIMAL;
  v_puntaje DECIMAL;
BEGIN
  SELECT tiempo_reparacion_teorico, tiempo_reparacion_real, retrabajo
  INTO v_ot
  FROM taller_ordenes_trabajo WHERE id = p_ot_id;

  IF v_ot IS NULL OR v_ot.tiempo_reparacion_teorico IS NULL
     OR v_ot.tiempo_reparacion_teorico = 0 THEN
    RETURN 0;
  END IF;

  -- Promedio ponderado de puntaje_base de todas las fallas de la OT
  SELECT COALESCE(AVG(fe.puntaje_base), 50), COUNT(*)
  INTO v_puntaje_base, v_cnt
  FROM taller_fallas_por_equipo fe
  WHERE fe.equipo_id = (SELECT equipo_id FROM taller_ordenes_trabajo WHERE id = p_ot_id)
    AND (
      fe.falla_id = (SELECT falla_principal_id FROM taller_ordenes_trabajo WHERE id = p_ot_id)
      OR fe.falla_id IN (SELECT falla_id FROM taller_ot_fallas_secundarias WHERE ot_id = p_ot_id)
    );

  IF v_cnt = 0 THEN v_puntaje_base := 50; END IF;

  -- Ratio tiempo_real / tiempo_teorico
  v_ratio := v_ot.tiempo_reparacion_real::DECIMAL / v_ot.tiempo_reparacion_teorico;

  -- Ajuste por tiempo
  IF v_ratio <= 0.5 THEN
    v_puntaje := v_puntaje_base * 1.5;
  ELSIF v_ratio <= 1.0 THEN
    v_puntaje := v_puntaje_base * 1.25;
  ELSIF v_ratio <= 1.5 THEN
    v_puntaje := v_puntaje_base * 0.5;
  ELSE
    v_puntaje := 0;
  END IF;

  -- Penalización por retrabajo
  IF v_ot.retrabajo THEN
    v_puntaje := v_puntaje / 2;
  END IF;

  RETURN ROUND(v_puntaje, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── Transición de estado transaccional ─────────────────────────────────────
CREATE OR REPLACE FUNCTION taller_transicionar_estado(
  p_ot_id UUID,
  p_nuevo_estado TEXT,
  p_usuario TEXT,
  p_nota TEXT DEFAULT NULL,
  p_motivo_cierre_id UUID DEFAULT NULL,
  p_tecnico_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_ot RECORD;
  v_estado_anterior TEXT;
  v_tiempo_real INTEGER;
  v_puntaje DECIMAL;
BEGIN
  SELECT * INTO v_ot FROM taller_ordenes_trabajo WHERE id = p_ot_id FOR UPDATE;
  IF v_ot IS NULL THEN
    RETURN json_build_object('error', 'OT no encontrada');
  END IF;

  v_estado_anterior := v_ot.estado;

  -- Validaciones específicas por transición
  IF p_nuevo_estado = 'sin_asignar' AND v_estado_anterior != 'borrador' THEN
    RETURN json_build_object('error', 'Solo se puede pasar a sin_asignar desde borrador');
  END IF;

  IF p_nuevo_estado = 'cancelada' AND p_motivo_cierre_id IS NULL THEN
    RETURN json_build_object('error', 'Se requiere motivo de cierre para cancelar');
  END IF;

  -- Campos extra según transición
  IF p_nuevo_estado = 'asignada' THEN
    UPDATE taller_ordenes_trabajo SET
      estado = p_nuevo_estado,
      tecnico_id = COALESCE(p_tecnico_id, tecnico_id),
      fecha_asignacion = now(),
      updated_at = now()
    WHERE id = p_ot_id;

  ELSIF p_nuevo_estado = 'asignada_en_proceso' THEN
    UPDATE taller_ordenes_trabajo SET
      estado = p_nuevo_estado,
      fecha_inicio_proceso = CASE
        WHEN v_estado_anterior IN ('re_presupuestacion', 'falta_repuestos') THEN now()
        ELSE COALESCE(fecha_inicio_proceso, now())
      END,
      updated_at = now()
    WHERE id = p_ot_id;

  ELSIF p_nuevo_estado = 'control_calidad' THEN
    -- Calcular tiempo real
    v_tiempo_real := taller_calcular_minutos_laborales(
      v_ot.fecha_inicio_proceso, now(), v_ot.tecnico_id
    );
    UPDATE taller_ordenes_trabajo SET
      estado = p_nuevo_estado,
      fecha_control_calidad = now(),
      tiempo_reparacion_real = v_tiempo_real,
      updated_at = now()
    WHERE id = p_ot_id;

  ELSIF p_nuevo_estado = 'facturado' THEN
    -- Calcular puntaje y copiar garantía del equipo
    v_puntaje := taller_calcular_puntaje(p_ot_id);
    UPDATE taller_ordenes_trabajo SET
      estado = p_nuevo_estado,
      fecha_facturado = now(),
      puntaje = v_puntaje,
      dias_garantia_reparacion = (
        SELECT dias_garantia_reparacion FROM taller_equipos WHERE id = v_ot.equipo_id
      ),
      updated_at = now()
    WHERE id = p_ot_id;

  ELSIF p_nuevo_estado = 'entregado' THEN
    UPDATE taller_ordenes_trabajo SET
      estado = p_nuevo_estado,
      fecha_entregado = now(),
      updated_at = now()
    WHERE id = p_ot_id;

  ELSIF p_nuevo_estado = 'cancelada' THEN
    UPDATE taller_ordenes_trabajo SET
      estado = p_nuevo_estado,
      motivo_cierre_id = p_motivo_cierre_id,
      updated_at = now()
    WHERE id = p_ot_id;

  ELSIF p_nuevo_estado IN ('re_presupuestacion', 'falta_repuestos') THEN
    -- Pausa: no toca timestamps de inicio
    UPDATE taller_ordenes_trabajo SET
      estado = p_nuevo_estado,
      updated_at = now()
    WHERE id = p_ot_id;

  ELSE
    UPDATE taller_ordenes_trabajo SET
      estado = p_nuevo_estado,
      updated_at = now()
    WHERE id = p_ot_id;
  END IF;

  -- Registrar en historial
  INSERT INTO taller_ot_historial (ot_id, usuario, estado_anterior, estado_nuevo, nota)
  VALUES (p_ot_id, p_usuario, v_estado_anterior, p_nuevo_estado, p_nota);

  RETURN json_build_object(
    'ok', true,
    'estado_anterior', v_estado_anterior,
    'estado_nuevo', p_nuevo_estado
  );
END;
$$ LANGUAGE plpgsql;

-- ─── Calcular tiempo teórico de la OT ──────────────────────────────────────
CREATE OR REPLACE FUNCTION taller_calcular_tiempo_teorico(
  p_equipo_id UUID,
  p_falla_principal_id UUID,
  p_fallas_secundarias UUID[]
) RETURNS INTEGER AS $$
DECLARE
  v_tiempo INTEGER := 0;
  v_falla UUID;
BEGIN
  -- Tiempo de falla principal
  SELECT COALESCE(tiempo_reparacion_principal, 0) INTO v_tiempo
  FROM taller_fallas_por_equipo
  WHERE equipo_id = p_equipo_id AND falla_id = p_falla_principal_id
  LIMIT 1;

  -- Tiempo de fallas secundarias
  IF p_fallas_secundarias IS NOT NULL THEN
    FOREACH v_falla IN ARRAY p_fallas_secundarias LOOP
      v_tiempo := v_tiempo + COALESCE((
        SELECT tiempo_reparacion_secundaria
        FROM taller_fallas_por_equipo
        WHERE equipo_id = p_equipo_id AND falla_id = v_falla
        LIMIT 1
      ), 0);
    END LOOP;
  END IF;

  RETURN v_tiempo;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- DATOS INICIALES (SEED)
-- ============================================================================

-- Áreas
INSERT INTO taller_areas_reparacion (codigo, nombre, orden) VALUES
  ('CEL', 'Celulares', 1),
  ('TAB', 'Tablets', 2),
  ('LAP', 'Laptops/Notebooks', 3)
ON CONFLICT (codigo) DO NOTHING;

-- Turnos
INSERT INTO taller_turnos (nombre, hora_entrada, hora_salida, trabaja_sabado) VALUES
  ('Mañana', '08:30', '13:00', true),
  ('Tarde', '13:00', '17:00', false),
  ('Completo', '08:30', '17:00', true)
ON CONFLICT DO NOTHING;

-- Motivos de cierre
INSERT INTO taller_motivos_cierre (nombre) VALUES
  ('Cliente no acepta presupuesto'),
  ('Equipo irreparable'),
  ('Cliente retiró sin reparar'),
  ('Error en carga'),
  ('Duplicada')
ON CONFLICT DO NOTHING;
