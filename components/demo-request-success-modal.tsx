"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar, PlayCircle, Check } from "lucide-react"
import Link from "next/link"

const CALENDLY_URL = "https://calendly.com/santiagonsanchez/30min"
const DEMO_VIDEO_URL = "https://www.loom.com/share/TU_VIDEO"

interface DemoRequestSuccessModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DemoRequestSuccessModal({ isOpen, onClose }: DemoRequestSuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center p-6 sm:p-8 overflow-hidden">
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Animated Checkmark with multiple rings */}
          <div className="relative flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-green-100 dark:bg-green-900/20 animate-in zoom-in duration-500" />
            <div className="absolute inset-0 rounded-full bg-green-200 dark:bg-green-900/40 animate-ping opacity-20 duration-1000 delay-300" />
            <div className="absolute inset-2 rounded-full bg-green-100 dark:bg-green-900/30 animate-pulse duration-1000" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-green-500 dark:bg-green-600 shadow-lg animate-in zoom-in-50 spin-in-12 duration-700 delay-150">
              <Check className="h-8 w-8 text-white animate-in fade-in zoom-in duration-500 delay-500" strokeWidth={4} />
            </div>
          </div>
          
          <DialogHeader className="space-y-2 text-center animate-in slide-in-from-bottom-4 fade-in duration-700 delay-300 fill-mode-backwards">
            <DialogTitle className="text-3xl font-bold tracking-tight text-foreground">
              ¡Formulario enviado!
            </DialogTitle>
            <DialogDescription className="text-lg text-foreground text-center">
              Tu demo está en camino.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm text-foreground text-center animate-in slide-in-from-bottom-4 fade-in duration-700 delay-500 fill-mode-backwards">
            <p className="text-base">
              En breve te vamos a contactar por WhatsApp para configurar tu club.
            </p>
            <p className="font-medium text-foreground text-base">
              Mientras tanto podés:
            </p>
          </div>

          <div className="flex flex-col w-full gap-3 pt-2 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-700 fill-mode-backwards">
            <Button asChild className="w-full h-12 text-base text-white transition-transform hover:scale-[1.02] active:scale-[0.98]" size="lg">
              <Link href={CALENDLY_URL} target="_blank" rel="noopener noreferrer">
                <Calendar className="mr-2 h-5 w-5" />
                Agendar llamada ahora
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-12 text-base transition-transform hover:scale-[1.02] active:scale-[0.98]" size="lg">
              <Link href={DEMO_VIDEO_URL} target="_blank" rel="noopener noreferrer">
                <PlayCircle className="mr-2 h-5 w-5" />
                Ver cómo funciona Courtly
              </Link>
            </Button>
          </div>

          <Button 
            variant="ghost" 
            onClick={onClose} 
            className="w-full mt-2 text-muted-foreground hover:text-foreground animate-in fade-in duration-700 delay-1000 fill-mode-backwards"
          >
            Listo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
