/**
 * Título de la pestaña y del SEO de una tienda. Debe coincidir con el que arma
 * el sitio (front/src/lib/title.ts): título SEO propio si existe; si no,
 * «Título | Eslogan».
 */
export interface StoreTitleParts {
  seoTitle?: string | null
  title?: string | null
  name: string
  tagline?: string | null
}

export function composeStoreTitle(parts: StoreTitleParts): string {
  const seo = parts.seoTitle?.trim()
  if (seo) return seo
  const base = parts.title?.trim() || parts.name.trim()
  const slogan = parts.tagline?.trim()
  if (!slogan || base.toLowerCase().includes(slogan.toLowerCase())) return base
  return `${base} | ${slogan}`
}
