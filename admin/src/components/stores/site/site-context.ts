import { createContext } from "react"

/** Datos compartidos por todos los campos del editor del sitio. */
export interface SiteEditorContextValue {
  storeId: string
  /** Páginas creadas en la tienda (para sugerirlas como destino de enlaces). */
  pageSlugs: { slug: string; title: string }[]
  readOnly: boolean
  /** Slug de la tienda (para consultar su catálogo público). */
  storeSlug?: string
  /** Productos y diseños publicados en la tienda. */
  storeProductIds?: string[]
  storeDesignIds?: string[]
}

export const SiteEditorContext = createContext<SiteEditorContextValue>({
  storeId: "",
  pageSlugs: [],
  readOnly: false,
})
