import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Images, Loader2, Package, Plus } from "lucide-react"

import { ApiError } from "@/lib/api"
import { listProducts } from "@/lib/products-api"
import type { Product } from "@/types/api"
import { Button } from "@/components/ui/button"
import { CreateProductDialog } from "@/components/products/create-product-dialog"

export function ProductsPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listProducts()
      setProducts(data)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los productos."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Productos</h1>
          <p className="text-sm text-neutral-500">
            Gestiona tus productos y sus sesiones de fotos.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Nuevo producto
        </Button>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-neutral-400" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
        >
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-neutral-500">
          <Package className="size-10 text-neutral-300" />
          <p className="text-sm">Aún no hay productos.</p>
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Crear el primero
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const sessionCount = product.photoSessions?.length ?? 0
            return (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="flex flex-col gap-2 rounded-2xl border bg-white p-4 transition-colors hover:border-neutral-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-neutral-900">
                    {product.name}
                  </h3>
                  <Package className="size-5 shrink-0 text-neutral-300" />
                </div>
                {product.description && (
                  <p className="line-clamp-2 text-sm text-neutral-500">
                    {product.description}
                  </p>
                )}
                <div className="mt-auto flex items-center gap-1.5 pt-2 text-xs text-neutral-500">
                  <Images className="size-3.5" />
                  {sessionCount}{" "}
                  {sessionCount === 1 ? "sesión" : "sesiones"} de fotos
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <CreateProductDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(product) => navigate(`/products/${product.id}`)}
      />
    </div>
  )
}
