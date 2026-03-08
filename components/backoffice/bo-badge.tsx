import { cn } from "@/lib/utils"

type Variant =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "expired"
  | "active"
  | "disabled"
  | "published"
  | "unpublished"
  | "approved"
  | "failed"
  | "default"

const VARIANT_MAP: Record<Variant, string> = {
  confirmed:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  active:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  published:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  approved:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:     "bg-amber-50 text-amber-700 border-amber-200",
  cancelled:   "bg-red-50 text-red-600 border-red-200",
  failed:      "bg-red-50 text-red-600 border-red-200",
  disabled:    "bg-slate-100 text-slate-500 border-slate-200",
  unpublished: "bg-slate-100 text-slate-500 border-slate-200",
  expired:     "bg-slate-100 text-slate-500 border-slate-200",
  default:     "bg-slate-100 text-slate-600 border-slate-200",
}

function resolveVariant(value: string | undefined | null): Variant {
  if (!value) return "default"
  const v = value.toLowerCase()
  if (v === "confirmed") return "confirmed"
  if (v === "pending" || v === "pending_payment" || v === "pendiente") return "pending"
  if (v === "cancelled" || v === "canceled" || v === "cancelada") return "cancelled"
  if (v === "expired" || v === "expirada") return "expired"
  if (v === "active" || v === "activo") return "active"
  if (v === "disabled" || v === "suspended") return "disabled"
  if (v === "published" || v === "true") return "published"
  if (v === "unpublished" || v === "false") return "unpublished"
  if (v === "approved") return "approved"
  if (v === "failed") return "failed"
  return "default"
}

interface BoBadgeProps {
  value: string | boolean | null | undefined
  label?: string
  className?: string
}

export function BoBadge({ value, label, className }: BoBadgeProps) {
  const str = value == null ? "—" : String(value)
  const variant = resolveVariant(str)
  const display = label ?? str

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        VARIANT_MAP[variant],
        className,
      )}
    >
      {display}
    </span>
  )
}
