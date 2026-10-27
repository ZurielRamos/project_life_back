// Catálogo de técnicas de impresión y estampado para áreas de impresión.
// El `value` es lo que se persiste; el `label` lo que se muestra.

export interface PrintTechnique {
  value: string
  label: string
}

export const PRINT_TECHNIQUES: PrintTechnique[] = [
  { value: "DTG", label: "DTG (impresión directa a prenda)" },
  { value: "DTF", label: "DTF (transfer film)" },
  { value: "Serigrafía", label: "Serigrafía (screen printing)" },
  { value: "Sublimación", label: "Sublimación" },
  { value: "Vinilo textil", label: "Vinilo textil (HTV)" },
  { value: "Bordado", label: "Bordado" },
  { value: "Transfer", label: "Transfer térmico" },
  { value: "Estampado en puff", label: "Estampado en puff (alto relieve)" },
  { value: "Flock", label: "Flock (aterciopelado)" },
  { value: "Foil", label: "Foil (metalizado)" },
  { value: "Tampografía", label: "Tampografía" },
  { value: "Láser", label: "Grabado láser" },
]
