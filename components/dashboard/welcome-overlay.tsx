"use client"

import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { VoydLogo } from "@/components/ui/voyd-logo"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const STORAGE_KEY = (uid: string) => `clubos_welcome_shown_${uid}`

export function WelcomeOverlay() {
  const { user, loading } = useAuth()
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  // Ref prevents double-fire from React 18 Strict Mode
  const startedRef = useRef(false)

  useEffect(() => {
    if (loading || !user) return
    if (startedRef.current) return
    startedRef.current = true

    const key = STORAGE_KEY(user.uid)
    if (localStorage.getItem(key)) return

    localStorage.setItem(key, "1")
    setVisible(true)
  }, [loading, user])

  // Auto-dismiss only after overlay becomes visible
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(dismiss, 3600)
    return () => clearTimeout(t)
  }, [visible])

  const dismiss = () => {
    setLeaving(true)
    setTimeout(() => setVisible(false), 600)
  }

  if (!visible) return null

  return (
    <div
      onClick={dismiss}
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center cursor-pointer select-none bg-[#080808]",
        "transition-opacity duration-500",
        leaving ? "opacity-0 pointer-events-none" : "opacity-100",
      )}
    >
      {/* Radial glow — pure CSS animation, no JS state needed */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(34,197,94,0.13) 0%, transparent 70%)",
          animation: "wFadeIn 0.8s ease-out both",
        }}
      />

      {/* Particles */}
      <Particles />

      <div className="relative flex flex-col items-center gap-8 text-center px-6">
        {/* Logo */}
        <div style={{ animation: "wSlideUp 0.6s ease-out 0.1s both" }}>
          <VoydLogo className="h-12 brightness-0 invert" />
        </div>

        {/* Icon badge */}
        <div
          className="flex items-center justify-center w-20 h-20 rounded-2xl border border-green-500/30 bg-green-500/10"
          style={{ animation: "wPop 0.5s ease-out 0.25s both" }}
        >
          <Sparkles className="w-9 h-9 text-green-400" />
        </div>

        {/* Headline */}
        <div className="space-y-2" style={{ animation: "wSlideUp 0.6s ease-out 0.4s both" }}>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            ¡Bienvenido a ClubOS!
          </h1>
          <p className="text-zinc-400 text-base max-w-sm">
            Tu cuenta está activa. Vamos a configurar tu club en unos simples pasos.
          </p>
        </div>

        {/* Progress bar + hint */}
        <div
          className="flex flex-col items-center gap-3"
          style={{ animation: "wSlideUp 0.6s ease-out 0.6s both" }}
        >
          <div className="w-40 h-0.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full"
              style={{ animation: "wProgress 3s linear 0.65s both" }}
            />
          </div>
          <p className="text-xs text-zinc-600">Tocá en cualquier lugar para continuar</p>
        </div>
      </div>

      <style>{`
        @keyframes wFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes wSlideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wPop {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes wProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes wParticle {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0); }
          30%  { opacity: 0.6; }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(1); }
        }
      `}</style>
    </div>
  )
}

/* ── Particles ──────────────────────────────────────────────────────────── */
const PARTICLE_CONFIG = [
  { x: -120, y: -90,  size: 5, delay: 0.3,  round: true  },
  { x:  130, y: -80,  size: 4, delay: 0.45, round: false },
  { x: -150, y:  20,  size: 4, delay: 0.6,  round: true  },
  { x:  155, y:  30,  size: 5, delay: 0.4,  round: false },
  { x:  -60, y:  120, size: 4, delay: 0.55, round: true  },
  { x:   65, y:  125, size: 5, delay: 0.35, round: false },
  { x:    0, y: -140, size: 4, delay: 0.5,  round: true  },
  { x: -100, y:  95,  size: 3, delay: 0.65, round: false },
  { x:  105, y: -40,  size: 3, delay: 0.42, round: true  },
  { x:   40, y: -130, size: 4, delay: 0.58, round: false },
  { x:  -45, y: -110, size: 3, delay: 0.48, round: true  },
  { x:  160, y: -10,  size: 3, delay: 0.62, round: false },
]

function Particles() {
  return (
    <>
      {PARTICLE_CONFIG.map((p, i) => (
        <span
          key={i}
          className={cn("fixed top-1/2 left-1/2 bg-green-400", p.round ? "rounded-full" : "rounded-sm rotate-45")}
          style={{
            width: p.size,
            height: p.size,
            // CSS custom properties so the keyframe can use them
            ["--tx" as any]: `calc(-50% + ${p.x}px)`,
            ["--ty" as any]: `calc(-50% + ${p.y}px)`,
            animation: `wParticle 1.1s ease-out ${p.delay}s both`,
          }}
        />
      ))}
    </>
  )
}
