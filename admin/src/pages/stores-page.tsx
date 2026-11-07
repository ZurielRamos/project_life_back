import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Globe, Loader2, Package, Palette, Plus, Store as StoreIcon } from "lucide-react"

import { ApiError } from "@/lib/api"
import { getStoresConfig, listStores } from "@/lib/stores-api"
import { useAuth } from "@/hooks/use-auth"
import type { Store, StoreSummary } from "@/types/api"
import { AppHeader } from "@/components/app-header"
import { CreateStoreDialog } from "@/components/stores/create-store-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function StoresPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canCreate = user?.permissions.includes("stores:create") ?? false

  const [stores, setStores] = useState<StoreSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [baseDomain, setBaseDomain] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [list, config] = await Promise.all([
        listStores(),
        getStoresConfig().catch(() => ({ baseDomain: null })),
      ])
      setStores(list)
      setBaseDomain(config.baseDomain)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar las tiendas."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Tras crear, se lleva al usuario a configurar la tienda.
  function onCreated(store: Store) {
    navigate(`/stores/${store.id}`)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
      <AppHeader
        title="Tiendas"
        description="Ecommerce configurables con su propio dominio, información y catálogo."
        actions={
          canCreate && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              Nueva tienda
            </Button>
          )
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
      ) : stores.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <StoreIcon className="size-8 text-neutral-300" />
          <p className="text-sm text-neutral-500">Aún no hay tiendas.</p>
          {canCreate && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              Crear la primera tienda
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stores.map((store) => (
            <Link
              key={store.id}
              to={`/stores/${store.id}`}
              className="flex flex-col gap-4 rounded-2xl border bg-white p-5 transition-colors hover:border-neutral-400"
            >
              <div className="flex items-center gap-3">
                {store.logoUrl ? (
                  <img
                    src={store.logoUrl}
                    alt=""
                    className="size-11 rounded-xl border object-contain"
                  />
                ) : (
                  <div
                    className="flex size-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500"
                    style={
                      store.primaryColor
                        ? { backgroundColor: store.primaryColor, color: "#fff" }
                        : undefined
                    }
                  >
                    <StoreIcon className="size-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-neutral-900">
                    {store.name}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {store.title ?? (store.publicUrl?.replace("https://", "") ?? store.name)}
                  </p>
                </div>
                <Badge variant={store.isActive ? "secondary" : "outline"}>
                  {store.isActive ? "Activa" : "Inactiva"}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                <Globe className="size-4 shrink-0 text-neutral-400" />
                <span className="truncate">
                  {store.publicUrl?.replace("https://", "") ?? "Sin dominio"}
                </span>
              </div>

              <div className="flex gap-4 text-xs text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <Package className="size-3.5" />
                  {store.productCount} productos
                </span>
                <span className="flex items-center gap-1.5">
                  <Palette className="size-3.5" />
                  {store.designCount} diseños
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateStoreDialog
        baseDomain={baseDomain}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={onCreated}
      />
    </div>
  )
}
