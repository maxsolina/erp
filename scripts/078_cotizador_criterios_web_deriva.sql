-- ============================================================
-- 078 · Flag por criterio: en web, derivar a atención presencial
--
-- Reemplaza la lógica de categoría.accion='whatsapp' por un flag
-- a nivel de criterio individual. Más granular: dentro de la misma
-- categoría podés tener opciones "normales" y opciones que derivan.
--
-- En el ERP no cambia nada: el operador siempre ve dropdown.
-- En la web (fase futura): si el cliente selecciona una opción
-- con web_deriva_atencion=true, en lugar de aplicar el descuento
-- se muestra el aviso de derivación a WhatsApp.
-- ============================================================

ALTER TABLE public.cotizador_criterios
  ADD COLUMN IF NOT EXISTS web_deriva_atencion BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.cotizador_criterios.web_deriva_atencion IS
  'Si TRUE, el cotizador web muestra aviso de derivación en lugar de aplicar descuento. ERP siempre aplica descuento.';
