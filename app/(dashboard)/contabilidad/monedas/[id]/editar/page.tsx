import MonedaForm from "@/components/contabilidad/moneda-form"

export default async function EditarMonedaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <MonedaForm initialId={id} />
}
