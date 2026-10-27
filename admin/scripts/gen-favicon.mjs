// Genera favicon.ico (+ PNGs) a partir de src/assets/logo.svg.
// Uso: node scripts/gen-favicon.mjs
import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"
import sharp from "sharp"
import pngToIco from "png-to-ico"

const root = path.dirname(fileURLToPath(import.meta.url)) + "/.."
const logoPath = path.join(root, "src/assets/logo.svg")
const publicDir = path.join(root, "public")

const svg = await readFile(logoPath)

/** Rasteriza el SVG a un PNG cuadrado de `size`px, con margen del 12%. */
async function renderPng(size) {
  const pad = Math.round(size * 0.12)
  const inner = size - pad * 2
  const logo = await sharp(svg, { density: 384 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo, top: pad, left: pad }])
    .png()
    .toBuffer()
}

// ICO multi-resolución (16, 32, 48).
const icoSizes = [16, 32, 48]
const icoBuffers = await Promise.all(icoSizes.map(renderPng))
const ico = await pngToIco(icoBuffers)
await writeFile(path.join(publicDir, "favicon.ico"), ico)

// PNGs sueltos útiles.
await writeFile(path.join(publicDir, "favicon-32.png"), await renderPng(32))
await writeFile(
  path.join(publicDir, "apple-touch-icon.png"),
  await renderPng(180)
)

// Favicon vectorial = el propio logo.
await writeFile(path.join(publicDir, "favicon.svg"), svg)

console.log("favicon.ico, favicon-32.png, apple-touch-icon.png, favicon.svg generados en public/")
