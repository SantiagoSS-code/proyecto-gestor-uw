"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Calendar, Clock, Search, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const backgroundImages = [
  "/images/padel-gestor.jpg",
  "/images/futbol-gestor.jpg",
]

function getTodayDate() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function roundToStep(date: Date, stepMinutes: number) {
  const rounded = new Date(date)
  const minutes = rounded.getMinutes()
  const remainder = minutes % stepMinutes
  const delta = remainder >= stepMinutes / 2 ? stepMinutes - remainder : -remainder
  rounded.setMinutes(minutes + delta, 0, 0)
  return rounded
}

function getTimePlusHours(hours: number, stepMinutes = 30) {
  const now = new Date()
  now.setHours(now.getHours() + hours)
  const rounded = roundToStep(now, stepMinutes)
  const h = String(rounded.getHours()).padStart(2, "0")
  const m = String(rounded.getMinutes()).padStart(2, "0")
  return `${h}:${m}`
}

function buildTimeOptions(stepMinutes = 30) {
  const options: string[] = []
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += stepMinutes) {
      const hh = String(h).padStart(2, "0")
      const mm = String(m).padStart(2, "0")
      options.push(`${hh}:${mm}`)
    }
  }
  return options
}

export function HeroSection() {
  const router = useRouter()
  const [location, setLocation] = useState("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState<string>(() => getTimePlusHours(3))
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const timeOptions = useMemo(() => buildTimeOptions(30), [])

  useEffect(() => {
    setDate(getTodayDate())
  }, [])

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (location.trim()) params.set("query", location.trim())
    if (date) params.set("date", format(date, "yyyy-MM-dd"))
    if (time) params.set("time", time)
    router.push(`/centros?${params.toString()}`)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length)
    }, 5000) // Change image every 5 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative min-h-[100svh] md:min-h-[85vh] flex flex-col pt-16 overflow-hidden">
      <div className="absolute inset-0 z-0">
        {backgroundImages.map((src, index) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentImageIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={src || "/placeholder.svg"}
              alt={`Sports background ${index + 1}`}
              className="w-full h-full object-cover object-center md:object-center"
              style={{
                objectPosition: index === 0 ? "70% center" : "50% 60%",
              }}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background md:from-background/80 md:via-background/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 md:py-20">
        <div className="inline-flex items-center gap-2 bg-secondary/90 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2 mb-6 md:mb-8">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">Impulsado por IA</span>
        </div>

        <div className="text-center max-w-5xl mx-auto mb-8 md:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-semibold text-foreground leading-[1] md:leading-[0.95] tracking-tight">
            La nueva generacion
            <br />
            <span className="text-primary">de reservas.</span>
          </h1>
        </div>

        <div className="w-full max-w-3xl mx-auto">
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-2 shadow-2xl shadow-black/20">
            <form
              className="flex flex-col md:flex-row gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                handleSearch()
              }}
            >
              {/* Location Field */}
              <div className="flex-1 h-12 px-4 rounded-xl bg-secondary/50 group hover:bg-secondary transition-colors flex items-center">
                <div className="flex items-center gap-3 w-full">
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                  <input
                    type="text"
                    placeholder="¿Dónde quieres jugar?"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full h-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm leading-none"
                  />
                </div>
              </div>

              {/* Date Field */}
              <div className="flex-1 h-12 px-4 rounded-xl bg-secondary/50 group hover:bg-secondary transition-colors flex items-center">
                <div className="flex items-center gap-3 w-full">
                  <Calendar className="w-5 h-5 text-primary shrink-0" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-full w-full justify-start px-0 py-0 text-left text-sm font-normal leading-none text-foreground"
                      >
                        {date ? (
                          format(date, "PPP", { locale: es })
                        ) : (
                          <span className="text-muted-foreground">Seleccionar fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <CalendarPicker
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Time Field */}
              <div className="flex-1 h-12 px-4 rounded-xl bg-secondary/50 group hover:bg-secondary transition-colors flex items-center">
                <div className="flex items-center gap-3 w-full">
                  <Clock className="w-5 h-5 text-primary shrink-0" />
                  <Select value={time} onValueChange={setTime}>
                    <SelectTrigger className="w-full bg-transparent border-0 px-0 py-0 h-full shadow-none">
                      <SelectValue className="text-sm leading-none" placeholder={time || "Seleccionar hora"} />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Button */}
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6 rounded-xl flex items-center gap-2"
              >
                <Search className="w-5 h-5" />
                <span className="font-medium">Buscar</span>
              </Button>
            </form>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-16 mt-10 md:mt-16">
          <div className="text-center">
            <p className="text-2xl md:text-4xl font-semibold text-foreground">4M+</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Jugadores</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-4xl font-semibold text-foreground">10K+</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Centros</p>
          </div>
          <div className="text-center">
            <p className="text-2xl md:text-4xl font-semibold text-foreground">98%</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Precision</p>
          </div>
        </div>
      </div>
    </section>
  )
}
