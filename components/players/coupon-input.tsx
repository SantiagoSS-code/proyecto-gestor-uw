"use client"

import { useState } from "react"
import { Ticket, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { validateCoupon, type CouponValidationResult } from "@/lib/promotions"

interface CouponInputProps {
  clubId: string
  userId: string
  sport: string
  courtId: string
  startTime: string   // "HH:MM"
  weekday: number     // 0 = Sunday
  originalAmount: number
  onApply: (result: CouponValidationResult) => void
  onRemove: () => void
  applied: CouponValidationResult | null
}

function fmtARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n)
}

export function CouponInput({
  clubId,
  userId,
  sport,
  courtId,
  startTime,
  weekday,
  originalAmount,
  onApply,
  onRemove,
  applied,
}: CouponInputProps) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async () => {
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    try {
      const result = await validateCoupon({
        clubId,
        code,
        userId,
        sport,
        courtId,
        startTime,
        weekday,
        originalAmount,
      })
      if (result.valid) {
        onApply(result)
        setCode("")
      } else {
        setError(result.error ?? "Cupón no válido.")
      }
    } catch {
      setError("No se pudo verificar el cupón.")
    } finally {
      setLoading(false)
    }
  }

  // When coupon is already applied show savings banner
  if (applied?.valid && applied.discount) {
    const d = applied.discount
    const label =
      d.type === "percentage"
        ? `${d.value}% de descuento`
        : d.type === "fixed"
        ? `${fmtARS(d.value)} de descuento`
        : `Precio especial ${fmtARS(d.value)}`

    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Cupón aplicado
              <code className="ml-2 text-xs bg-emerald-100 px-1.5 py-0.5 rounded font-mono">
                {d.code}
              </code>
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">{label}</p>
            <p className="text-xs text-emerald-700 font-medium mt-1">
              Ahorrás {fmtARS(applied.discountAmount)} 🎉
            </p>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-emerald-400 hover:text-emerald-600 transition-colors shrink-0"
          title="Quitar cupón"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null) }}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            placeholder="Tenés un cupón de descuento?"
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono placeholder:font-sans placeholder:text-slate-400"
            disabled={loading}
          />
        </div>
        <button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
