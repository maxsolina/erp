// Formatters compartidos por todos los módulos extraídos.
// Definir uno canónico evita la divergencia que tuvimos cuando cada
// components/<modulo>/_shared.ts traía su propia copia.

export function formatCurrency(amount: number, currency: string = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount ?? 0)
}

export function formatDate(iso: string) {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString("es-AR")
}
