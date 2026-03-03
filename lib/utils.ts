import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

export function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

// Recibe duración en horas decimales (ej: 1.5) y devuelve "1:30 hs"
export function formatDurationHours(durationHours: number) {
  if (!Number.isFinite(durationHours) || durationHours < 0) return "-"
  const totalMinutes = Math.round(durationHours * 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const minutesStr = minutes.toString().padStart(2, "0")
  return `${hours}:${minutesStr} hs`
}

// Formatea montos en ARS con separador de miles y 2 decimales
export function formatCurrencyARS(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value as number)) return "$0,00"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value as number)
}
