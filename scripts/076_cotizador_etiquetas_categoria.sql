-- ============================================================
-- 076 · Etiquetas predefinidas por categoría del cotizador
--
-- En lugar de texto libre en cotizador_criterios.etiqueta,
-- el operador define un master de etiquetas por categoría.
-- El criterio sigue almacenando la etiqueta como TEXT (no FK)
-- por compatibilidad con datos existentes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cotizador_etiquetas_categoria (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id  UUID NOT NULL REFERENCES public.cotizador_categorias(id) ON DELETE CASCADE,
  etiqueta      TEXT NOT NULL,
  orden         INTEGER NOT NULL DEFAULT 0,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (categoria_id, etiqueta)
);

CREATE INDEX IF NOT EXISTS idx_cotizador_etiquetas_categoria
  ON public.cotizador_etiquetas_categoria (categoria_id);

DROP TRIGGER IF EXISTS trg_cotizador_etiquetas_updated_at ON public.cotizador_etiquetas_categoria;
CREATE TRIGGER trg_cotizador_etiquetas_updated_at
  BEFORE UPDATE ON public.cotizador_etiquetas_categoria
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cotizador_etiquetas_categoria DISABLE ROW LEVEL SECURITY;

-- ── Seeds ──────────────────────────────────────────────────
-- 1. "Impecable" para cada categoría descuento/cartel_sistema
INSERT INTO public.cotizador_etiquetas_categoria (categoria_id, etiqueta, orden)
SELECT cat.id, 'Impecable', 0
FROM public.cotizador_categorias cat
WHERE cat.activo AND cat.accion IN ('descuento', 'cartel_sistema')
ON CONFLICT (categoria_id, etiqueta) DO NOTHING;

-- 2. Importar etiquetas ya existentes en cotizador_criterios (datos legacy)
INSERT INTO public.cotizador_etiquetas_categoria (categoria_id, etiqueta, orden)
SELECT DISTINCT crit.categoria_id, crit.etiqueta, 1
FROM public.cotizador_criterios crit
WHERE crit.etiqueta IS NOT NULL AND crit.etiqueta <> ''
ON CONFLICT (categoria_id, etiqueta) DO NOTHING;
