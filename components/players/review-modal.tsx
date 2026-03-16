"use client"

import { useState } from "react"
import { Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

const RATING_LABELS = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"]

export interface ReviewBooking {
  id: string          // compound bookingId: "centerId__docId"
  clubId: string
  clubName: string
  date: string        // "YYYY-MM-DD"
  startTime: string   // "HH:MM"
  endTime: string     // "HH:MM"
}

interface ReviewModalProps {
  booking: ReviewBooking
  userName: string
  token: string
  onSubmitted: () => void
  onSkip: () => void
  getToken?: () => Promise<string>
}

function formatDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export function ReviewModal({ booking, userName, token, onSubmitted, onSkip, getToken }: ReviewModalProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayRating = hovered || rating

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Por favor, seleccioná una puntuación antes de enviar.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const idToken = getToken ? await getToken() : token
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bookingId: booking.id,
          rating,
          comment: comment.trim(),
          userName,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Error al enviar la puntuación")
      }
      onSubmitted()
    } catch (e: any) {
      setError(e.message || "Error al enviar. Intentá de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <button
          onClick={onSkip}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <DialogHeader>
          <DialogTitle className="text-lg">¿Cómo estuvo tu experiencia?</DialogTitle>
          <DialogDescription className="text-sm text-slate-500 mt-1">
            Jugaste en <span className="font-semibold text-slate-700">{booking.clubName}</span>
            {" "}el {formatDate(booking.date)} · {booking.startTime}–{booking.endTime}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Stars */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-3">Tu puntuación <span className="text-red-500">*</span></p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="transition-transform hover:scale-110 focus:outline-none"
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => { setRating(star); setError(null) }}
                  aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= displayRating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-slate-100 text-slate-200"
                    }`}
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <p className="text-xs font-medium text-amber-600 mt-1.5">
                {RATING_LABELS[displayRating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Comentario <span className="text-slate-400 font-normal">(opcional)</span>
            </p>
            <textarea
              placeholder="¿Qué te pareció la cancha, las instalaciones, el trato del personal?"
              value={comment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
              className="w-full resize-none text-sm rounded-md border border-slate-200 bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 min-h-[80px]"
              rows={3}
              maxLength={500}
            />
            <p className="text-right text-xs text-slate-400 mt-1">{comment.length}/500</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onSkip}
              disabled={submitting}
            >
              Ahora no
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
            >
              {submitting ? "Enviando..." : "Enviar puntuación"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
