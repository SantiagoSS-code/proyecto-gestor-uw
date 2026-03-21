"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Bell,
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  BookOpen,
  Tag,
  ShieldAlert,
  Mail,
  MessageSquare,
  Monitor,
  RefreshCw,
  Eye,
  ChevronDown,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Channel = "whatsapp" | "email" | "system"
type Timing = "immediate" | "1h" | "3h" | "24h" | "48h"
type Recipient = "manager" | "reception" | "owner" | "all"
type NotifStatus = "sent" | "pending" | "failed"

interface CustomerNotif {
  id: string
  label: string
  description: string
  enabled: boolean
  channels: Channel[]
  timing: Timing
}

interface InternalAlert {
  id: string
  label: string
  description: string
  enabled: boolean
  recipients: Recipient[]
  channels: Channel[]
}

interface HistoryRow {
  id: string
  sentAt: string
  type: string
  recipient: string
  channel: Channel
  status: NotifStatus
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial mock data
// ─────────────────────────────────────────────────────────────────────────────

const INIT_CUSTOMER: CustomerNotif[] = [
  // Reservas
  { id: "booking_confirm",    label: "Confirmación de reserva",         description: "Se envía al confirmar un turno.",                  enabled: true,  channels: ["whatsapp", "email"], timing: "immediate" },
  { id: "booking_reminder",   label: "Recordatorio antes del turno",    description: "Recordatorio previo al inicio de la reserva.",     enabled: true,  channels: ["whatsapp"],          timing: "3h" },
  { id: "booking_cancel",     label: "Aviso de cancelación",            description: "Se envía cuando se cancela una reserva.",          enabled: true,  channels: ["whatsapp", "email"], timing: "immediate" },
  { id: "booking_reschedule", label: "Aviso de reprogramación",         description: "Se envía cuando cambia el horario de un turno.",   enabled: false, channels: ["email"],             timing: "immediate" },
  // Membresías
  { id: "member_confirm",     label: "Confirmación de membresía",       description: "Al comprar o activar una membresía.",              enabled: true,  channels: ["email"],             timing: "immediate" },
  { id: "member_expiry",      label: "Recordatorio de vencimiento",     description: "Antes de que venza la membresía.",                 enabled: true,  channels: ["whatsapp", "email"], timing: "48h" },
  { id: "member_renew",       label: "Aviso de renovación",             description: "Confirmación de renovación exitosa.",              enabled: true,  channels: ["email"],             timing: "immediate" },
  // Cursos
  { id: "course_enroll",      label: "Confirmación de inscripción",     description: "Al inscribirse en un curso o clase.",              enabled: true,  channels: ["email"],             timing: "immediate" },
  { id: "course_reminder",    label: "Recordatorio de clase",           description: "Antes de que empiece la clase.",                   enabled: true,  channels: ["whatsapp"],          timing: "1h" },
  { id: "course_cancel",      label: "Cancelación de clase",            description: "Aviso si se cancela una clase.",                   enabled: true,  channels: ["whatsapp", "email"], timing: "immediate" },
  // Promos
  { id: "promo_available",    label: "Promoción disponible",            description: "Aviso de nueva promo activa en el club.",          enabled: false, channels: ["whatsapp"],          timing: "immediate" },
  { id: "coupon_assigned",    label: "Cupón asignado",                  description: "Cuando se asigna un cupón a un cliente.",          enabled: true,  channels: ["email"],             timing: "immediate" },
]

const INIT_INTERNAL: InternalAlert[] = [
  { id: "int_new_booking",     label: "Nueva reserva creada",                description: "Al registrarse una nueva reserva.",                    enabled: true,  recipients: ["reception"],          channels: ["system"] },
  { id: "int_cancel_booking",  label: "Reserva cancelada",                   description: "Cuando un cliente cancela su turno.",                  enabled: true,  recipients: ["manager", "reception"], channels: ["system", "email"] },
  { id: "int_pending_payment", label: "Pago pendiente",                      description: "Reserva o membresía con pago sin confirmar.",          enabled: true,  recipients: ["manager"],            channels: ["system"] },
  { id: "int_member_expiry",   label: "Membresía próxima a vencer",          description: "Cliente con membresía por vencer en los próximos 7 días.", enabled: true, recipients: ["manager"],          channels: ["system", "email"] },
  { id: "int_no_quota",        label: "Clase sin cupos disponibles",         description: "Un curso o clase llegó a capacidad máxima.",           enabled: false, recipients: ["manager"],            channels: ["system"] },
  { id: "int_court_blocked",   label: "Cancha bloqueada o fuera de servicio", description: "Una cancha fue marcada como no disponible.",          enabled: true,  recipients: ["all"],                channels: ["system"] },
  { id: "int_manual_booking",  label: "Reserva creada por recepción",        description: "Reserva ingresada manualmente desde el panel.",        enabled: false, recipients: ["manager"],            channels: ["system"] },
  { id: "int_booking_edited",  label: "Cambio o edición de reserva",         description: "Una reserva fue modificada por el equipo.",            enabled: true,  recipients: ["manager"],            channels: ["system"] },
  { id: "int_high_demand",     label: "Alta demanda del día",                description: "Ocupación del día supera el 80%.",                     enabled: true,  recipients: ["manager"],            channels: ["system"] },
  { id: "int_low_demand",      label: "Baja ocupación del día",              description: "Ocupación del día por debajo del 30%.",                enabled: false, recipients: ["manager"],            channels: ["system"] },
]

const MOCK_HISTORY: HistoryRow[] = [
  { id: "h1", sentAt: "18/03 10:15", type: "Confirmación de reserva",     recipient: "Carlos Mendez",   channel: "whatsapp", status: "sent" },
  { id: "h2", sentAt: "18/03 09:50", type: "Recordatorio de clase",       recipient: "Lucía Torres",    channel: "whatsapp", status: "sent" },
  { id: "h3", sentAt: "18/03 09:20", type: "Pago pendiente",              recipient: "Manager",         channel: "system",   status: "sent" },
  { id: "h4", sentAt: "17/03 18:30", type: "Vencimiento de membresía",   recipient: "Ana López",       channel: "email",    status: "failed" },
  { id: "h5", sentAt: "17/03 17:45", type: "Reserva cancelada",           recipient: "Recepción",       channel: "system",   status: "sent" },
  { id: "h6", sentAt: "17/03 16:10", type: "Cupón asignado",              recipient: "Miguel Ruiz",     channel: "email",    status: "sent" },
  { id: "h7", sentAt: "17/03 14:00", type: "Recordatorio antes del turno", recipient: "Juan Pérez",    channel: "whatsapp", status: "pending" },
]

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

const TIMING_LABELS: Record<Timing, string> = {
  immediate: "Inmediato",
  "1h":      "1 hora antes",
  "3h":      "3 horas antes",
  "24h":     "24 horas antes",
  "48h":     "48 horas antes",
}

const CHANNEL_LABELS: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  email:    "Email",
  system:   "Sistema",
}

const RECIPIENT_LABELS: Record<Recipient, string> = {
  manager:   "Manager",
  reception: "Recepción",
  owner:     "Dueño",
  all:       "Todo el equipo",
}

const STATUS_STYLE: Record<NotifStatus, string> = {
  sent:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50  text-amber-700  border-amber-200",
  failed:  "bg-red-50    text-red-700    border-red-200",
}
const STATUS_LABEL: Record<NotifStatus, string> = {
  sent: "Enviada", pending: "Pendiente", failed: "Fallida",
}

function ChannelIcon({ c, active }: { c: Channel; active: boolean }) {
  const base = "size-4"
  if (c === "whatsapp") return <MessageSquare className={cn(base, active ? "text-emerald-600" : "text-slate-300")} />
  if (c === "email")    return <Mail          className={cn(base, active ? "text-blue-500"    : "text-slate-300")} />
  return                       <Monitor       className={cn(base, active ? "text-violet-500"  : "text-slate-300")} />
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="size-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="size-5 text-slate-600" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer notification row
// ─────────────────────────────────────────────────────────────────────────────

function CustomerNotifRow({
  item,
  onChange,
}: {
  item: CustomerNotif
  onChange: (id: string, patch: Partial<CustomerNotif>) => void
}) {
  const toggleChannel = (c: Channel) => {
    const next = item.channels.includes(c)
      ? item.channels.filter((x) => x !== c)
      : [...item.channels, c]
    if (next.length > 0) onChange(item.id, { channels: next })
  }

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-colors",
      item.enabled ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50/50",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium", item.enabled ? "text-slate-900" : "text-slate-400")}>{item.label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
        </div>
        <Switch
          checked={item.enabled}
          onCheckedChange={(v) => onChange(item.id, { enabled: v })}
          className="flex-shrink-0 mt-0.5"
        />
      </div>

      {item.enabled && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* Channels */}
          <div className="flex items-center gap-1.5">
            {(["whatsapp", "email", "system"] as Channel[]).map((c) => (
              <button
                key={c}
                type="button"
                title={CHANNEL_LABELS[c]}
                onClick={() => toggleChannel(c)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors",
                  item.channels.includes(c)
                    ? "border-slate-300 bg-white text-slate-700"
                    : "border-slate-100 bg-transparent text-slate-300"
                )}
              >
                <ChannelIcon c={c} active={item.channels.includes(c)} />
                <span>{CHANNEL_LABELS[c]}</span>
              </button>
            ))}
          </div>
          {/* Timing */}
          <div className="ml-auto">
            <Select
              value={item.timing}
              onValueChange={(v) => onChange(item.id, { timing: v as Timing })}
            >
              <SelectTrigger className="h-7 text-xs px-2.5 min-w-[130px] border-slate-200">
                <Clock className="size-3 text-slate-400 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(TIMING_LABELS) as [Timing, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal alert row
// ─────────────────────────────────────────────────────────────────────────────

function InternalAlertRow({
  item,
  onChange,
}: {
  item: InternalAlert
  onChange: (id: string, patch: Partial<InternalAlert>) => void
}) {
  const toggleChannel = (c: Channel) => {
    const next = item.channels.includes(c)
      ? item.channels.filter((x) => x !== c)
      : [...item.channels, c]
    if (next.length > 0) onChange(item.id, { channels: next })
  }

  const toggleRecipient = (r: Recipient) => {
    if (r === "all") { onChange(item.id, { recipients: ["all"] }); return }
    const withoutAll = item.recipients.filter((x) => x !== "all")
    const next = withoutAll.includes(r) ? withoutAll.filter((x) => x !== r) : [...withoutAll, r]
    if (next.length > 0) onChange(item.id, { recipients: next })
  }

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-colors",
      item.enabled ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50/50",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium", item.enabled ? "text-slate-900" : "text-slate-400")}>{item.label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
        </div>
        <Switch
          checked={item.enabled}
          onCheckedChange={(v) => onChange(item.id, { enabled: v })}
          className="flex-shrink-0 mt-0.5"
        />
      </div>

      {item.enabled && (
        <div className="mt-3 flex flex-wrap gap-3 items-center">
          {/* Recipients */}
          <div className="flex flex-wrap gap-1">
            {(["manager", "reception", "owner", "all"] as Recipient[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => toggleRecipient(r)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs border transition-colors",
                  item.recipients.includes(r)
                    ? "bg-violet-50 border-violet-200 text-violet-700"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                )}
              >
                {RECIPIENT_LABELS[r]}
              </button>
            ))}
          </div>
          {/* Channels */}
          <div className="flex gap-1.5 ml-auto">
            {(["system", "email", "whatsapp"] as Channel[]).map((c) => (
              <button
                key={c}
                type="button"
                title={CHANNEL_LABELS[c]}
                onClick={() => toggleChannel(c)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors",
                  item.channels.includes(c)
                    ? "border-slate-300 bg-white text-slate-700"
                    : "border-slate-100 bg-transparent text-slate-300"
                )}
              >
                <ChannelIcon c={c} active={item.channels.includes(c)} />
                <span>{CHANNEL_LABELS[c]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible group
// ─────────────────────────────────────────────────────────────────────────────

function NotifGroup({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/60 hover:bg-slate-100/60 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Icon className="size-4 text-slate-500" />
          {title}
        </span>
        <ChevronDown className={cn("size-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="p-3 space-y-2 bg-white">{children}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function NotificacionesPage() {
  const [customer, setCustomer] = useState<CustomerNotif[]>(INIT_CUSTOMER)
  const [internal, setInternal] = useState<InternalAlert[]>(INIT_INTERNAL)
  const [saved, setSaved] = useState(false)

  const updateCustomer = (id: string, patch: Partial<CustomerNotif>) =>
    setCustomer((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const updateInternal = (id: string, patch: Partial<InternalAlert>) =>
    setInternal((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // Summary stats
  const enabledCustomer = customer.filter((x) => x.enabled).length
  const enabledInternal = internal.filter((x) => x.enabled).length
  const failedToday     = MOCK_HISTORY.filter((x) => x.status === "failed").length
  const pendingCount    = MOCK_HISTORY.filter((x) => x.status === "pending").length

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Notificaciones</h1>
          <p className="text-slate-500 mt-1.5">
            Mensajes automáticos para clientes y alertas internas del equipo del club.
          </p>
        </div>
        <Button onClick={handleSave} className="shrink-0 flex items-center gap-2">
          {saved ? <CheckCircle2 className="size-4" /> : <Send className="size-4" />}
          {saved ? "¡Guardado!" : "Guardar cambios"}
        </Button>
      </div>

      {/* ── 1. Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Enviadas hoy",            value: "24",                 sub: "+6 vs ayer",         icon: Send,        color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Notificaciones a clientes", value: `${enabledCustomer}`, sub: "configuraciones activas", icon: Bell,   color: "text-blue-600",   bg: "bg-blue-50" },
          { label: "Alertas internas activas", value: `${enabledInternal}`, sub: "para el equipo",     icon: ShieldAlert, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Fallidas o pendientes",   value: `${failedToday + pendingCount}`, sub: "últimas 24 h", icon: AlertCircle, color: "text-red-500",  bg: "bg-red-50" },
        ].map((s) => (
          <Card key={s.label} className="shadow-sm border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
                </div>
                <div className={cn("size-9 rounded-xl flex items-center justify-center flex-shrink-0", s.bg)}>
                  <s.icon className={cn("size-5", s.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── 2. Customer notifications ── */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-2">
          <SectionHeader
            icon={Users}
            title="Notificaciones automáticas a clientes"
            subtitle="Activá o desactivá cada notificación, elegí el canal y el momento de envío."
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <NotifGroup title="Reservas" icon={Calendar}>
            {customer.filter((x) => x.id.startsWith("booking")).map((item) => (
              <CustomerNotifRow key={item.id} item={item} onChange={updateCustomer} />
            ))}
          </NotifGroup>

          <NotifGroup title="Membresías" icon={Tag}>
            {customer.filter((x) => x.id.startsWith("member")).map((item) => (
              <CustomerNotifRow key={item.id} item={item} onChange={updateCustomer} />
            ))}
          </NotifGroup>

          <NotifGroup title="Cursos y clases" icon={BookOpen} defaultOpen={false}>
            {customer.filter((x) => x.id.startsWith("course")).map((item) => (
              <CustomerNotifRow key={item.id} item={item} onChange={updateCustomer} />
            ))}
          </NotifGroup>

          <NotifGroup title="Promociones y cupones" icon={Tag} defaultOpen={false}>
            {customer.filter((x) => x.id.startsWith("promo") || x.id.startsWith("coupon")).map((item) => (
              <CustomerNotifRow key={item.id} item={item} onChange={updateCustomer} />
            ))}
          </NotifGroup>
        </CardContent>
      </Card>

      {/* ── 3. Internal alerts ── */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-2">
          <SectionHeader
            icon={ShieldAlert}
            title="Alertas internas para el equipo"
            subtitle="Notificaciones para el manager, recepción y dueño del club."
          />
        </CardHeader>
        <CardContent className="space-y-2">
          {internal.map((item) => (
            <InternalAlertRow key={item.id} item={item} onChange={updateInternal} />
          ))}
        </CardContent>
      </Card>

      {/* ── 4. Channel preferences ── */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-2">
          <SectionHeader
            icon={Monitor}
            title="Estado de canales de envío"
            subtitle="Canales disponibles para enviar notificaciones."
          />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { id: "system",   icon: Monitor,       label: "Sistema (interno)", desc: "Notificaciones dentro del panel.",    active: true,  badge: "Activo" },
              { id: "email",    icon: Mail,           label: "Email",             desc: "Emails transaccionales vía SMTP.",    active: true,  badge: "Activo" },
              { id: "whatsapp", icon: MessageSquare,  label: "WhatsApp",          desc: "Mensajes vía API de WhatsApp.",       active: false, badge: "Próximamente" },
            ] as const).map((ch) => (
              <div
                key={ch.id}
                className={cn(
                  "rounded-xl border p-4 flex flex-col gap-2",
                  ch.active ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50/60 opacity-70"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "size-8 rounded-lg flex items-center justify-center",
                    ch.active ? "bg-slate-100" : "bg-slate-100"
                  )}>
                    <ch.icon className={cn("size-4", ch.active ? "text-slate-700" : "text-slate-400")} />
                  </div>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full border",
                    ch.active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  )}>
                    {ch.badge}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800">{ch.label}</p>
                <p className="text-xs text-slate-500">{ch.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 5. History ── */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <SectionHeader
              icon={Clock}
              title="Historial reciente"
              subtitle="Últimas notificaciones enviadas por el sistema."
            />
            <Button variant="outline" size="sm" className="shrink-0 mt-0.5 flex items-center gap-1.5 text-xs">
              <RefreshCw className="size-3.5" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-b-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Fecha / hora</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Destinatario</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Canal</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_HISTORY.map((row, i) => (
                  <tr key={row.id} className={cn("border-b border-slate-100 last:border-0", i % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{row.sentAt}</td>
                    <td className="px-4 py-3 text-sm text-slate-800 font-medium">{row.type}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.recipient}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <ChannelIcon c={row.channel} active />
                        {CHANNEL_LABELS[row.channel]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", STATUS_STYLE[row.status])}>
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-500">
                          <Eye className="size-3.5 mr-1" /> Ver
                        </Button>
                        {(row.status === "failed" || row.status === "pending") && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-500">
                            <RefreshCw className="size-3.5 mr-1" /> Reenviar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden divide-y divide-slate-100 px-4 pb-4">
            {MOCK_HISTORY.map((row) => (
              <div key={row.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800 truncate">{row.type}</p>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0", STATUS_STYLE[row.status])}>
                    {STATUS_LABEL[row.status]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{row.sentAt}</span>
                  <span>·</span>
                  <span>{row.recipient}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <ChannelIcon c={row.channel} active />
                    {CHANNEL_LABELS[row.channel]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
