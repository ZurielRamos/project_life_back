import {
  FileText,
  Home,
  Megaphone,
  MessageSquare,
  PanelBottom,
  PanelTop,
  Plug,
  type LucideIcon,
} from "lucide-react"

import type { SiteConfig } from "@/types/api"

/** Subsecciones del grupo «Sitio web» del menú lateral de la tienda. */
export type SiteSectionId =
  | "announcement"
  | "header"
  | "footer"
  | "home"
  | "contactPage"
  | "pages"
  | "integrations"

interface SiteSectionMeta {
  id: SiteSectionId
  label: string
  description: string
  icon: LucideIcon
  /** Clave de SiteConfig que guarda esta subsección. */
  key: keyof SiteConfig
}

export const SITE_SECTIONS: SiteSectionMeta[] = [
  {
    id: "announcement",
    label: "Anuncio",
    description: "Barra de avisos sobre el encabezado.",
    icon: Megaphone,
    key: "announcement",
  },
  {
    id: "header",
    label: "Encabezado",
    description: "Menú de navegación del sitio.",
    icon: PanelTop,
    key: "header",
  },
  {
    id: "footer",
    label: "Pie de página",
    description: "Columnas de enlaces, enlaces legales y textos finales.",
    icon: PanelBottom,
    key: "footer",
  },
  {
    id: "home",
    label: "Inicio",
    description: "Secciones de la página principal.",
    icon: Home,
    key: "home",
  },
  {
    id: "contactPage",
    label: "Contacto",
    description: "Página de contacto, horario, mapa y preguntas frecuentes.",
    icon: MessageSquare,
    key: "contact",
  },
  {
    id: "pages",
    label: "Páginas",
    description: "Páginas informativas: envíos, devoluciones, políticas…",
    icon: FileText,
    key: "pages",
  },
  {
    id: "integrations",
    label: "Integraciones",
    description: "Analítica, píxeles y verificación del sitio.",
    icon: Plug,
    key: "integrations",
  },
]
