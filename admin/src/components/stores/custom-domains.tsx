import { useCallback, useEffect, useState, type FormEvent } from "react"
import {
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  Lock,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ApiError } from "@/lib/api"
import {
  addStoreDomain,
  listStoreDomains,
  removeStoreDomain,
  verifyStoreDomain,
  type StoreDomain,
} from "@/lib/stores-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** Mientras haya dominios pendientes se refresca el estado cada 15 s. */
const POLL_MS = 15_000

const STATUS_UI = {
  pending: {
    label: "Pendiente de DNS",
    className: "bg-amber-50 text-amber-700",
    Icon: Clock,
  },
  active: {
    label: "Activo",
    className: "bg-emerald-50 text-emerald-700",
    Icon: CheckCircle2,
  },
  error: {
    label: "Error",
    className: "bg-red-50 text-red-700",
    Icon: XCircle,
  },
} as const

function errorMessage(err: unknown): string {
  return err instanceof ApiError || err instanceof Error
    ? err.message
    : "Ocurrió un error inesperado"
}

interface CustomDomainsProps {
  storeId: string
  canEdit: boolean
}

/** Dominios propios de la tienda: alta, registros DNS, estado y SSL. */
export function CustomDomains({ storeId, canEdit }: CustomDomainsProps) {
  const [domains, setDomains] = useState<StoreDomain[] | null>(null)
  const [hostname, setHostname] = useState("")
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setDomains(await listStoreDomains(storeId))
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [storeId])

  useEffect(() => {
    void load()
  }, [load])

  const needsPolling = domains?.some(
    (d) => d.status === "pending" || d.sslStatus === "pending"
  )
  useEffect(() => {
    if (!needsPolling) return
    const timer = setInterval(() => void load(), POLL_MS)
    return () => clearInterval(timer)
  }, [needsPolling, load])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!hostname.trim()) return
    setAdding(true)
    setError(null)
    try {
      const created = await addStoreDomain(storeId, hostname.trim())
      setDomains((prev) => [...(prev ?? []), created])
      setHostname("")
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  async function handleVerify(id: string) {
    setBusyId(id)
    setError(null)
    try {
      const updated = await verifyStoreDomain(storeId, id)
      setDomains((prev) => prev?.map((d) => (d.id === id ? updated : d)) ?? null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemove(domain: StoreDomain) {
    if (!window.confirm(`¿Quitar ${domain.hostname} de esta tienda?`)) return
    setBusyId(domain.id)
    setError(null)
    try {
      await removeStoreDomain(storeId, domain.id)
      setDomains((prev) => prev?.filter((d) => d.id !== domain.id) ?? null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-sm font-medium text-neutral-900">
          Dominios propios
        </h3>
        <p className="text-xs text-neutral-500">
          Puedes conectar varios dominios o subdominios. El certificado HTTPS se
          emite y renueva automáticamente cuando los DNS están bien.
        </p>
      </div>

      {canEdit && (
        <form onSubmit={handleAdd} className="grid gap-2">
          <Label htmlFor="new-domain">Agregar dominio</Label>
          <div className="flex max-w-lg gap-2">
            <Input
              id="new-domain"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="mitienda.com o shop.mitienda.com"
              maxLength={253}
              autoComplete="off"
              spellCheck={false}
            />
            <Button type="submit" disabled={adding || !hostname.trim()}>
              {adding && <Loader2 className="size-4 animate-spin" />}
              Agregar
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {domains === null ? (
        <p className="text-sm text-neutral-500">Cargando dominios…</p>
      ) : domains.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Esta tienda aún no tiene dominios propios.
        </p>
      ) : (
        <ul className="grid gap-3">
          {domains.map((d) => (
            <DomainCard
              key={d.id}
              domain={d}
              canEdit={canEdit}
              busy={busyId === d.id}
              onVerify={() => void handleVerify(d.id)}
              onRemove={() => void handleRemove(d)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function DomainCard({
  domain,
  canEdit,
  busy,
  onVerify,
  onRemove,
}: {
  domain: StoreDomain
  canEdit: boolean
  busy: boolean
  onVerify: () => void
  onRemove: () => void
}) {
  const ui = STATUS_UI[domain.status]
  const showRecords = domain.status !== "active"

  return (
    <li className="grid gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
          {domain.hostname}
        </code>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
            ui.className
          )}
        >
          <ui.Icon className="size-3" />
          {ui.label}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
            domain.sslStatus === "issued"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-neutral-100 text-neutral-600"
          )}
        >
          <Lock className="size-3" />
          {domain.sslStatus === "issued" ? "SSL emitido" : "SSL pendiente"}
        </span>
        {canEdit && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onVerify}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Verificar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Quitar ${domain.hostname}`}
              onClick={onRemove}
              disabled={busy}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      </div>

      {showRecords && (
        <div className="grid gap-2">
          <p className="text-xs text-neutral-500">
            Crea estos registros en el proveedor de DNS del dominio. Puede
            tardar desde unos minutos hasta 48 h en propagarse. Si usas
            Cloudflare, deja el registro en "solo DNS" (nube gris).
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Nombre</th>
                  <th className="px-3 py-2 font-medium">Valor</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {domain.dnsRecords.map((r, i) => (
                  <tr key={`${r.type}-${i}`} className="border-t">
                    <td className="px-3 py-2 font-mono">{r.type}</td>
                    <td className="px-3 py-2 font-mono">{r.name}</td>
                    <td className="px-3 py-2 font-mono break-all">{r.value}</td>
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Copiar valor ${r.type}`}
                        onClick={() => void navigator.clipboard.writeText(r.value)}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {domain.lastError && (
        <p className="text-xs text-red-600">{domain.lastError}</p>
      )}
    </li>
  )
}
