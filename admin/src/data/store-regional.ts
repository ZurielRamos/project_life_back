import type { ComboboxOption } from "@/components/ui/combobox"

/** Monedas disponibles para una tienda (código ISO 4217 + nombre). */
export const CURRENCY_OPTIONS: ComboboxOption[] = [
  { value: "USD", label: "USD · Dólar estadounidense" },
  { value: "EUR", label: "EUR · Euro" },
  { value: "COP", label: "COP · Peso colombiano" },
  { value: "MXN", label: "MXN · Peso mexicano" },
  { value: "ARS", label: "ARS · Peso argentino" },
  { value: "CLP", label: "CLP · Peso chileno" },
  { value: "PEN", label: "PEN · Sol peruano" },
  { value: "BRL", label: "BRL · Real brasileño" },
  { value: "UYU", label: "UYU · Peso uruguayo" },
  { value: "PYG", label: "PYG · Guaraní paraguayo" },
  { value: "BOB", label: "BOB · Boliviano" },
  { value: "VES", label: "VES · Bolívar venezolano" },
  { value: "CRC", label: "CRC · Colón costarricense" },
  { value: "GTQ", label: "GTQ · Quetzal guatemalteco" },
  { value: "HNL", label: "HNL · Lempira hondureño" },
  { value: "NIO", label: "NIO · Córdoba nicaragüense" },
  { value: "PAB", label: "PAB · Balboa panameño" },
  { value: "DOP", label: "DOP · Peso dominicano" },
  { value: "GBP", label: "GBP · Libra esterlina" },
  { value: "CAD", label: "CAD · Dólar canadiense" },
  { value: "CHF", label: "CHF · Franco suizo" },
]

/**
 * Idiomas del sitio (código BCP 47). Define el atributo lang, el formato de
 * números y fechas, y el idioma que declara la tienda a redes sociales.
 */
export const LANGUAGE_OPTIONS: ComboboxOption[] = [
  { value: "es", label: "Español" },
  { value: "es-CO", label: "Español (Colombia)" },
  { value: "es-MX", label: "Español (México)" },
  { value: "es-AR", label: "Español (Argentina)" },
  { value: "es-CL", label: "Español (Chile)" },
  { value: "es-PE", label: "Español (Perú)" },
  { value: "es-ES", label: "Español (España)" },
  { value: "en", label: "Inglés" },
  { value: "en-US", label: "Inglés (Estados Unidos)" },
  { value: "pt", label: "Portugués" },
  { value: "pt-BR", label: "Portugués (Brasil)" },
  { value: "fr", label: "Francés" },
  { value: "it", label: "Italiano" },
  { value: "de", label: "Alemán" },
]

/**
 * Agrega el valor actual a la lista si no está (p. ej. una moneda o idioma
 * guardado antes de existir el selector), para no perderlo ni mostrarlo vacío.
 */
export function withCurrentOption(
  options: ComboboxOption[],
  current: string
): ComboboxOption[] {
  if (!current || options.some((o) => o.value === current)) return options
  return [{ value: current, label: `${current} (valor actual)` }, ...options]
}
