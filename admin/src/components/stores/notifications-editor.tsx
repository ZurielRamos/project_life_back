import { useEffect, useId, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldCheck,
  Undo2,
} from "lucide-react"

import { ApiError } from "@/lib/api"
import {
  getNotifications,
  sendTestEmail,
  sendTestWhatsapp,
  updateNotifications,
} from "@/lib/stores-api"
import type { NotificationsView } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  Card,
  FieldRow,
  FieldShell,
  NumberField,
  SwitchField,
  TextField,
} from "./site/fields"
import { SiteEditorContext } from "./site/site-context"

/** Borrador editable: igual que la vista, más los secretos escritos/borrados. */
interface Draft {
  smtp: {
    enabled: boolean
    host: string
    port: number
    secure: boolean
    username: string
    fromName: string
    fromEmail: string
    password: string
    clearPassword: boolean
  }
  whatsapp: {
    enabled: boolean
    apiUrl: string
    accountSlug: string
    channelId: string
    templateName: string
    languageCode: string
    apiToken: string
    clearApiToken: boolean
  }
}

function toDraft(view: NotificationsView): Draft {
  const { smtp, whatsapp } = view
  return {
    smtp: {
      enabled: smtp.enabled,
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      username: smtp.username,
      fromName: smtp.fromName,
      fromEmail: smtp.fromEmail,
      password: "",
      clearPassword: false,
    },
    whatsapp: {
      enabled: whatsapp.enabled,
      apiUrl: whatsapp.apiUrl,
      accountSlug: whatsapp.accountSlug,
      channelId: whatsapp.channelId,
      templateName: whatsapp.templateName,
      languageCode: whatsapp.languageCode,
      apiToken: "",
      clearApiToken: false,
    },
  }
}

/** Endpoint que usará la API de WhatsApp, calculado como lo hace el servidor. */
function endpointPreview(apiUrl: string, slug: string): string | null {
  const base = apiUrl.trim().replace(/\/+$/, "")
  const account = slug.trim()
  return base && account
    ? `${base}/api/v1/${account}/whatsapp/auth-template`
    : null
}

// ---------------------------------------------------------------------------
// Campo de secreto
// ---------------------------------------------------------------------------

interface SecretFieldProps {
  label: string
  /** Ya hay un valor guardado en el servidor (no se puede leer). */
  saved: boolean
  value: string
  cleared: boolean
  onChange: (value: string) => void
  onClear: (cleared: boolean) => void
  placeholder?: string
  hint?: string
}

/**
 * Los secretos guardados no se muestran nunca: solo se indica que existen y
 * se puede reemplazarlos o quitarlos. Dejarlos intactos conserva el valor.
 */
function SecretField({
  label,
  saved,
  value,
  cleared,
  onChange,
  onClear,
  placeholder,
  hint,
}: SecretFieldProps) {
  const id = useId()
  const [editing, setEditing] = useState(false)
  const showInput = !saved || editing || value !== ""

  return (
    <FieldShell label={label} htmlFor={id} hint={hint}>
      {cleared ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-dashed bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          <span>Se borrará al guardar.</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onClear(false)}
          >
            <Undo2 className="size-4" />
            Deshacer
          </Button>
        </div>
      ) : showInput ? (
        <div className="flex items-center gap-2">
          <Input
            id={id}
            type="password"
            autoComplete="new-password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={saved ? "Escribe el valor nuevo" : placeholder}
            maxLength={500}
          />
          {saved && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange("")
                setEditing(false)
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div
            id={id}
            className="flex h-9 flex-1 items-center gap-2 rounded-md border bg-neutral-50 px-3 text-sm text-neutral-500"
          >
            <KeyRound className="size-4 text-emerald-600" aria-hidden="true" />
            <span className="tracking-widest">••••••••••</span>
            <span className="text-xs text-neutral-400">guardado</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            Cambiar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onClear(true)}
          >
            Quitar
          </Button>
        </div>
      )}
    </FieldShell>
  )
}

// ---------------------------------------------------------------------------
// Prueba de envío
// ---------------------------------------------------------------------------

interface TestRowProps {
  label: string
  placeholder: string
  type: "email" | "tel"
  buttonLabel: string
  /** Motivo por el que no se puede probar todavía (o null si se puede). */
  blockedReason: string | null
  /** Aviso informativo que no bloquea la prueba. */
  note?: string
  onSend: (value: string) => Promise<string>
}

function TestRow({
  label,
  placeholder,
  type,
  buttonLabel,
  blockedReason,
  note,
  onSend,
}: TestRowProps) {
  const id = useId()
  const [value, setValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  )

  async function handleSend() {
    setBusy(true)
    setResult(null)
    try {
      setResult({ ok: true, message: await onSend(value.trim()) })
    } catch (err) {
      setResult({
        ok: false,
        message:
          err instanceof ApiError ? err.message : "No se pudo hacer la prueba.",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-neutral-50 p-4">
      <label htmlFor={id} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="max-w-xs bg-white"
          autoComplete="off"
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy || !value.trim() || Boolean(blockedReason)}
          onClick={() => void handleSend()}
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          {buttonLabel}
        </Button>
      </div>
      {(blockedReason ?? note) && (
        <p className="text-xs text-neutral-500">{blockedReason ?? note}</p>
      )}
      {result && (
        <p
          role={result.ok ? "status" : "alert"}
          className={
            result.ok
              ? "flex items-start gap-1.5 text-xs font-medium text-emerald-700"
              : "text-destructive flex items-start gap-1.5 text-xs font-medium"
          }
        >
          {result.ok ? (
            <CheckCircle2 className="mt-px size-3.5 shrink-0" />
          ) : (
            <AlertCircle className="mt-px size-3.5 shrink-0" />
          )}
          {result.message}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

interface NotificationsEditorProps {
  storeId: string
  /** Es la sección visible. Se carga al mostrarse por primera vez. */
  active: boolean
}

/**
 * Notificaciones de la tienda: correo SMTP y WhatsApp. Se mantiene montado
 * para conservar el borrador al cambiar de sección.
 */
export function NotificationsEditor({
  storeId,
  active,
}: NotificationsEditorProps) {
  const [view, setView] = useState<NotificationsView | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const requested = useRef(false)

  async function load() {
    setLoadError(null)
    try {
      const data = await getNotifications(storeId)
      setView(data)
      setDraft(toDraft(data))
    } catch (err) {
      requested.current = false
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar la configuración."
      )
    }
  }

  useEffect(() => {
    if (!active || requested.current) return
    requested.current = true
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, storeId])

  const context = useMemo(
    () => ({ storeId, pageSlugs: [], readOnly: false }),
    [storeId]
  )

  if (!active) return null

  if (loadError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
        >
          {loadError}
        </div>
        <Button
          variant="outline"
          onClick={() => {
            requested.current = true
            void load()
          }}
        >
          Reintentar
        </Button>
      </div>
    )
  }

  if (!view || !draft) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(view))
  const { smtp, whatsapp } = draft

  const setSmtp = (patch: Partial<Draft["smtp"]>) =>
    setDraft({ ...draft, smtp: { ...smtp, ...patch } })
  const setWhatsapp = (patch: Partial<Draft["whatsapp"]>) =>
    setDraft({ ...draft, whatsapp: { ...whatsapp, ...patch } })

  const endpoint = endpointPreview(whatsapp.apiUrl, whatsapp.accountSlug)

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    setSaveError(null)
    setSavedAt(null)
    try {
      const s = draft.smtp
      const w = draft.whatsapp
      const updated = await updateNotifications(storeId, {
        smtp: {
          enabled: s.enabled,
          host: s.host,
          port: s.port,
          secure: s.secure,
          username: s.username,
          fromName: s.fromName,
          fromEmail: s.fromEmail,
          ...(s.password ? { password: s.password } : {}),
          ...(s.clearPassword ? { clearPassword: true } : {}),
        },
        whatsapp: {
          enabled: w.enabled,
          apiUrl: w.apiUrl,
          accountSlug: w.accountSlug,
          channelId: w.channelId,
          templateName: w.templateName,
          languageCode: w.languageCode,
          ...(w.apiToken ? { apiToken: w.apiToken } : {}),
          ...(w.clearApiToken ? { clearApiToken: true } : {}),
        },
      })
      setView(updated)
      setDraft(toDraft(updated))
      setSavedAt(new Date().toLocaleTimeString())
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron guardar las notificaciones."
      )
    } finally {
      setSaving(false)
    }
  }

  const unsaved = "Guarda los cambios para poder probar."
  const smtpReady = Boolean(view.smtp.host && view.smtp.fromEmail)
  const whatsappReady = Boolean(
    view.whatsapp.endpoint &&
      view.whatsapp.channelId &&
      view.whatsapp.templateName &&
      view.whatsapp.hasApiToken
  )

  return (
    <SiteEditorContext.Provider value={context}>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Notificaciones
          </h2>
          <p className="text-sm text-neutral-500">
            Correo y WhatsApp con los que esta tienda se comunica con sus
            clientes.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Las contraseñas y tokens se guardan cifrados y no se pueden volver
            a ver. Si dejas un secreto sin tocar, se conserva el que ya
            estaba guardado.
          </p>
        </div>

        {saveError && (
          <div
            role="alert"
            className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm"
          >
            {saveError}
          </div>
        )}

        <Card
          title="Correo (SMTP)"
          description="Servidor desde el que la tienda enviará correos."
        >
          <SwitchField
            label="Activar correo de la tienda"
            description="Requiere servidor, puerto y correo remitente."
            checked={smtp.enabled}
            onChange={(enabled) => setSmtp({ enabled })}
          />
          <FieldRow>
            <TextField
              label="Servidor SMTP"
              value={smtp.host}
              onChange={(host) => setSmtp({ host })}
              placeholder="smtp.tuproveedor.com"
              maxLength={253}
            />
            <NumberField
              label="Puerto"
              value={smtp.port}
              onChange={(port) =>
                // 465 usa SSL/TLS directo; el resto negocia STARTTLS.
                setSmtp({
                  port,
                  secure: port === 465 ? true : [25, 587, 2525].includes(port) ? false : smtp.secure,
                })
              }
              min={1}
              max={65535}
              hint="587 (STARTTLS), 465 (SSL/TLS), 25 o 2525."
            />
          </FieldRow>
          <SwitchField
            label="Conexión segura (SSL/TLS)"
            description="Actívalo con el puerto 465. Con 587 déjalo apagado: la conexión se cifra por STARTTLS."
            checked={smtp.secure}
            onChange={(secure) => setSmtp({ secure })}
          />
          <FieldRow>
            <TextField
              label="Usuario"
              value={smtp.username}
              onChange={(username) => setSmtp({ username })}
              placeholder="usuario@tudominio.com"
              maxLength={255}
              hint="Déjalo vacío si el servidor no pide autenticación."
            />
            <SecretField
              label="Contraseña"
              saved={view.smtp.hasPassword}
              value={smtp.password}
              cleared={smtp.clearPassword}
              onChange={(password) => setSmtp({ password })}
              onClear={(clearPassword) =>
                setSmtp({ clearPassword, password: "" })
              }
            />
          </FieldRow>
          <FieldRow>
            <TextField
              label="Nombre del remitente"
              value={smtp.fromName}
              onChange={(fromName) => setSmtp({ fromName })}
              placeholder="Mi tienda"
              maxLength={100}
            />
            <TextField
              label="Correo remitente"
              value={smtp.fromEmail}
              onChange={(fromEmail) => setSmtp({ fromEmail })}
              placeholder="ventas@tudominio.com"
              maxLength={254}
            />
          </FieldRow>
          <TestRow
            label="Enviar un correo de prueba"
            type="email"
            placeholder="tu@correo.com"
            buttonLabel="Enviar prueba"
            blockedReason={
              dirty ? unsaved : smtpReady ? null : "Guarda primero el servidor y el remitente."
            }
            onSend={async (to) => (await sendTestEmail(storeId, to)).message}
          />
        </Card>

        <Card
          title="WhatsApp"
          description="Credenciales de la API de WhatsApp para enviar el código de verificación a los clientes de esta tienda."
        >
          <SwitchField
            label="Usar WhatsApp propio de la tienda"
            description="Si lo desactivas, se usan las credenciales generales de la plataforma."
            checked={whatsapp.enabled}
            onChange={(enabled) => setWhatsapp({ enabled })}
          />
          <FieldRow>
            <TextField
              label="URL de la API"
              value={whatsapp.apiUrl}
              onChange={(apiUrl) => setWhatsapp({ apiUrl })}
              placeholder="https://smarter.strategee.us"
              maxLength={300}
              hint="Dirección base, sin la ruta. Debe empezar por https://"
            />
            <TextField
              label="Slug de la cuenta"
              value={whatsapp.accountSlug}
              onChange={(accountSlug) => setWhatsapp({ accountSlug })}
              placeholder="mi-cuenta"
              maxLength={60}
              hint="El identificador de tu cuenta en la API."
            />
          </FieldRow>
          {endpoint && (
            <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs break-all text-neutral-600">
              Endpoint: <code className="text-neutral-900">{endpoint}</code>
            </p>
          )}
          <FieldRow>
            <TextField
              label="ID del canal"
              value={whatsapp.channelId}
              onChange={(channelId) => setWhatsapp({ channelId })}
              maxLength={100}
              hint="El canal (inbox) desde el que se envía."
            />
            <TextField
              label="Nombre de la plantilla de autenticación"
              value={whatsapp.templateName}
              onChange={(templateName) => setWhatsapp({ templateName })}
              placeholder="autenticacion"
              maxLength={100}
            />
          </FieldRow>
          <FieldRow>
            <TextField
              label="Idioma de la plantilla"
              value={whatsapp.languageCode}
              onChange={(languageCode) => setWhatsapp({ languageCode })}
              placeholder="es"
              maxLength={10}
              hint="El código con el que se aprobó la plantilla (es, es_CO, en_US…)."
            />
            <SecretField
              label="Token de la API"
              saved={view.whatsapp.hasApiToken}
              value={whatsapp.apiToken}
              cleared={whatsapp.clearApiToken}
              onChange={(apiToken) => setWhatsapp({ apiToken })}
              onClear={(clearApiToken) =>
                setWhatsapp({ clearApiToken, apiToken: "" })
              }
            />
          </FieldRow>
          <TestRow
            label="Enviar un mensaje de prueba"
            type="tel"
            placeholder="+57 300 123 4567"
            buttonLabel="Enviar prueba"
            blockedReason={
              dirty
                ? unsaved
                : whatsappReady
                  ? null
                  : "Guarda primero la URL, la cuenta, el canal, la plantilla y el token."
            }
            note="Se enviará la plantilla de autenticación con un código de ejemplo (123456)."
            onSend={async (phone) =>
              (await sendTestWhatsapp(storeId, phone)).message
            }
          />
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={saving || !dirty}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Guardar sección
          </Button>
          {dirty && !saving && (
            <span className="text-xs text-neutral-500">Cambios sin guardar</span>
          )}
          {savedAt && !dirty && (
            <span className="text-xs text-neutral-500">
              Guardado · {savedAt}
            </span>
          )}
        </div>
      </div>
    </SiteEditorContext.Provider>
  )
}
