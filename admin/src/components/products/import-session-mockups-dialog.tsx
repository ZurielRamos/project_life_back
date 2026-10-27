import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Images, Loader2, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import {
  importSessionMockups,
  listRemoteSudomockMockups,
} from "@/lib/products-api"
import type {
  PhotoSession,
  RemoteSudomockMockup,
  SudomockAccount,
} from "@/types/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ImportSessionMockupsDialogProps {
  productId: string
  sessionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: (session: PhotoSession) => void
}

/** Clave única de una plantilla: cuenta + uuid. */
function keyOf(item: { accountId: string; uuid: string }): string {
  return `${item.accountId}::${item.uuid}`
}

const ALL_ACCOUNTS = "all"

export function ImportSessionMockupsDialog({
  productId,
  sessionId,
  open,
  onOpenChange,
  onImported,
}: ImportSessionMockupsDialogProps) {
  const [items, setItems] = useState<RemoteSudomockMockup[]>([])
  const [accounts, setAccounts] = useState<SudomockAccount[]>([])
  const [accountFilter, setAccountFilter] = useState<string>(ALL_ACCOUNTS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  // Guardamos los items seleccionados por su clave cuenta::uuid.
  const [selected, setSelected] = useState<Map<string, RemoteSudomockMockup>>(
    new Map()
  )
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (name: string, accountId: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await listRemoteSudomockMockups({
        name: name || undefined,
        accountId: accountId === ALL_ACCOUNTS ? undefined : accountId,
      })
      setItems(result.mockups)
      setAccounts(result.accounts)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar el catálogo de SudoMock."
      setError(message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void load(search, accountFilter)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [open, search, accountFilter, load])

  useEffect(() => {
    if (!open) {
      setSearch("")
      setAccountFilter(ALL_ACCOUNTS)
      setSelected(new Map())
      setError(null)
    }
  }, [open])

  function toggle(item: RemoteSudomockMockup) {
    setSelected((prev) => {
      const next = new Map(prev)
      const key = keyOf(item)
      if (next.has(key)) next.delete(key)
      else next.set(key, item)
      return next
    })
  }

  const showAccountBadge = accounts.length > 1

  async function handleImport() {
    if (selected.size === 0) return
    setSaving(true)
    setError(null)

    // Agrupa los uuids seleccionados por cuenta e importa por cuenta.
    const byAccount = new Map<string, string[]>()
    for (const item of selected.values()) {
      const list = byAccount.get(item.accountId) ?? []
      list.push(item.uuid)
      byAccount.set(item.accountId, list)
    }

    try {
      let latest: PhotoSession | null = null
      for (const [accountId, sudomockUuids] of byAccount) {
        latest = await importSessionMockups(productId, sessionId, {
          sudomockUuids,
          accountId,
        })
      }
      if (latest) onImported(latest)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "No se pudieron importar las plantillas."
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar mockups</DialogTitle>
          <DialogDescription>
            Selecciona plantillas de SudoMock para añadirlas a esta sesión.
          </DialogDescription>
        </DialogHeader>

        {/* Búsqueda + filtro de cuenta */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar plantilla por nombre..."
              className="pl-9"
            />
          </div>
          {accounts.length > 1 && (
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Cuenta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ACCOUNTS}>Todas las cuentas</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {error}
          </div>
        )}

        <div className="max-h-[45vh] overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="text-muted-foreground size-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 text-sm">
              <Images className="size-8 text-neutral-300" />
              No se encontraron plantillas.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item) => {
                const isSelected = selected.has(keyOf(item))
                return (
                  <button
                    type="button"
                    key={keyOf(item)}
                    onClick={() => toggle(item)}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-xl border bg-white text-left transition-colors",
                      isSelected
                        ? "border-neutral-900 ring-2 ring-neutral-900"
                        : "hover:border-neutral-300"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute right-2 top-2 z-10 flex size-5 items-center justify-center rounded-full bg-neutral-900 text-white">
                        <Check className="size-3" />
                      </span>
                    )}
                    {showAccountBadge && (
                      <span className="absolute left-2 top-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white">
                        {item.accountId}
                      </span>
                    )}
                    <div className="flex aspect-[4/3] items-center justify-center bg-neutral-100">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <Images className="size-8 text-neutral-300" />
                      )}
                    </div>
                    <p
                      title={item.name}
                      className="truncate p-2.5 text-xs font-medium text-neutral-900"
                    >
                      {item.name}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={saving || selected.size === 0}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Importar
            {selected.size > 0 ? ` (${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
