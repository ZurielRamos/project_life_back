import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Images, Loader2, Package, Palette, Plus, Ruler } from "lucide-react"

import { ApiError } from "@/lib/api"
import { listProducts } from "@/lib/products-api"
import type { ProductSummary } from "@/types/api"
import { AppHeader } from "@/components/app-header"
import { Button } from "@/components/ui/button"
import { CreateProductDialog } from "@/components/products/create-product-dialog"

export function ProductsPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<ProductSummary[]>([])
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
      <AppHeader
        title="Productos"
        description="Gestiona tus productos y sus sesiones de fotos."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nuevo producto
          </Button>
        }
      />

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
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                className="flex flex-col overflow-hidden rounded-xl border bg-white transition-colors hover:border-neutral-300"
              >
                {/* Portada: primer mockup de la primera sesión. */}
                <div className="flex aspect-square items-center justify-center bg-neutral-100">
                  {product.coverThumbnailUrl ? (
                    <img
                      src={product.coverThumbnailUrl}
                      alt={product.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Images className="size-8 text-neutral-300" />
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1 p-2.5">
                  <h3 className="line-clamp-2 text-sm font-medium text-neutral-900">
                    {product.name}
                  </h3>

                  {/* Contadores: sesiones, colores y tallas. */}
                  <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1 text-[11px] text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Images className="size-3" />
                      {product.sessionCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Palette className="size-3" />
                      {product.colorCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Ruler className="size-3" />
                      {product.sizeCount}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
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
