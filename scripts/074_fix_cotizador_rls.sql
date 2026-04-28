-- ============================================================
-- Fix: las policies y seeds del 073 no se aplicaron en el editor SQL
-- de Supabase (script multi-statement). Desactivamos RLS para
-- alinearlo con el patrón existente (productos, listas_precios, etc.
-- también tienen RLS desactivado — la auth real la hace el proxy.ts).
-- ============================================================

ALTER TABLE public.cotizador_categorias  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizador_modelos     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizador_criterios   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizador_exclusiones DISABLE ROW LEVEL SECURITY;
