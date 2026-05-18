-- ============================================================
-- 130 · FKs a caja_valores → ON DELETE SET NULL
--
-- Hasta hoy: las tablas que referencian a caja_valores (movimientos_caja,
-- extractos_caja, transferencias_caja, ajustes_caja, etc.) tenían FK con
-- DELETE RESTRICT (el default). Eso bloqueaba borrar un banco/valor de
-- una caja en cuanto había movimientos asociados.
--
-- El problema: las tablas que registran movimientos ya guardan `valor_nombre`
-- como TEXT (denormalizado). Borrar el valor no pierde información histórica
-- — solo desconecta el FK. Los reportes que muestran "Banco X" lo siguen
-- mostrando porque leen del texto, no del JOIN.
--
-- Esta migración cambia las FKs a ON DELETE SET NULL. Después de correr:
--   - DELETE caja_bancos_permitidos cascadea a DELETE caja_valor
--   - DELETE caja_valor pone valor_id = NULL en las tablas dependientes
--   - Los movimientos históricos quedan intactos (valor_nombre text)
-- ============================================================

-- Helper: dropear y recrear un FK con la nueva acción ON DELETE
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT con.conname, cls.relname AS tabla
      FROM pg_constraint con
      JOIN pg_class cls ON cls.oid = con.conrelid
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
     WHERE con.contype = 'f'
       AND att.attname = 'valor_id'
       AND con.confrelid = 'public.caja_valores'::regclass
       AND con.confdeltype <> 'n'  -- 'n' = SET NULL; sólo tocar las que NO lo son ya
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', fk.tabla, fk.conname);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (valor_id) REFERENCES public.caja_valores(id) ON DELETE SET NULL',
      fk.tabla, fk.conname
    );
    RAISE NOTICE 'FK % en %.valor_id → ON DELETE SET NULL', fk.conname, fk.tabla;
  END LOOP;
END $$;

-- Refresh schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
