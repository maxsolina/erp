-- ============================================================
-- Permisos por Lista de Precios (Sección 1.2 de la especificación)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.listas_precios_permisos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_precios_id  INTEGER NOT NULL REFERENCES public.listas_precios(id) ON DELETE CASCADE,
  -- Puede ser por usuario específico o por rol
  usuario_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rol               TEXT CHECK (rol IN ('admin', 'vendedor', 'supervisor', 'mayorista')),
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_permiso_usuario_o_rol
    CHECK (usuario_id IS NOT NULL OR rol IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_listas_precios_permisos_lista
  ON public.listas_precios_permisos (lista_precios_id, activo);

CREATE INDEX IF NOT EXISTS idx_listas_precios_permisos_usuario
  ON public.listas_precios_permisos (usuario_id, activo)
  WHERE usuario_id IS NOT NULL;

COMMENT ON TABLE public.listas_precios_permisos IS
  'Control de acceso por lista de precios. Un usuario solo ve listas donde tiene permiso explícito.';
