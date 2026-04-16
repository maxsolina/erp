-- ============================================================
-- Script 020 — Agrega columna sucursal a recibos (idempotente)
-- ============================================================
ALTER TABLE recibos
  ADD COLUMN IF NOT EXISTS sucursal VARCHAR(50);
