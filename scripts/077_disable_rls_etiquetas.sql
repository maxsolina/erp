-- ============================================================
-- 077 · Fix: Supabase activa RLS por default en tablas nuevas.
-- El DISABLE del 076 pudo no aplicarse en el editor SQL.
-- ============================================================

ALTER TABLE public.cotizador_etiquetas_categoria DISABLE ROW LEVEL SECURITY;
