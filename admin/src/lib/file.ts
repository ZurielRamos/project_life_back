/** Convierte un File a un data URI (data:image/...;base64,...). */
export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error("Error al leer el archivo"))
    reader.readAsDataURL(file)
  })
}
