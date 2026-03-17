"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Calendar, Clock, Search, Sparkles, Dumbbell } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const backgroundImages = [
  "/images/padel-gestor.jpg",
  "/images/futbol-gestor.jpg",
]

const SPORT_LABELS: Record<string, string> = {
  padel: "Padel",
  tennis: "Tennis",
  futbol: "Fútbol",
  pickleball: "Pickleball",
  squash: "Squash",
}

function getTodayDate() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getNextTimeSlot(stepMinutes = 30) {
  const now = new Date()
  const minutes = now.getMinutes()
  const remainder = minutes % stepMinutes
  const minutesToAdd = remainder === 0 ? stepMinutes : stepMinutes - remainder
  const next = new Date(now)
  next.setMinutes(minutes + minutesToAdd, 0, 0)
  const h = String(next.getHours()).padStart(2, "0")
  const m = String(next.getMinutes()).padStart(2, "0")
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
  const [sport, setSport] = useState<string>("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState<string>(() => getNextTimeSlot())
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const timeOptions = useMemo(() => buildTimeOptions(30), [])

  useEffect(() => {
    setDate(getTodayDate())
  }, [])

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (location.trim()) params.set("query", location.trim())
    if (sport && sport !== "all") params.set("sport", sport)
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
          <span className="text-sm text-foreground/80">Impulsado por IA</span>
        </div>

        <div className="text-center max-w-5xl mx-auto mb-8 md:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-semibold text-foreground leading-[1] md:leading-[0.95] tracking-tight">
            La nueva generacion
            <br />
            <span className="text-primary">de reservas.</span>
          </h1>
        </div>

        <div className="w-full max-w-5xl mx-auto">
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-2 shadow-2xl shadow-black/20">
            <form
              className="flex flex-col md:flex-row md:items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                handleSearch()
              }}
            >
              {/* Location Field */}
              <div className="flex-[2] h-14 px-4 rounded-xl bg-secondary/50 group hover:bg-secondary transition-colors flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <input
                  type="text"
                  placeholder="¿Dónde quieres jugar?"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm leading-none"
                />
              </div>

              {/* Sport Field */}
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger className="flex-1 h-14 data-[size=default]:h-14 px-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors border-0 shadow-none gap-3 focus:ring-0 focus-visible:ring-0">
                  <Dumbbell className="w-5 h-5 text-primary shrink-0" />
                  <SelectValue placeholder="Deporte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los deportes</SelectItem>
                  {Object.entries(SPORT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Field */}
              <Popover>
                <PopoverTrigger asChild>
                  <div className="flex-1 h-14 px-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors flex items-center gap-3 cursor-pointer">
                    <Calendar className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm text-foreground leading-none whitespace-nowrap">
                      {date ? format(date, "d MMM yyyy", { locale: es }) : <span className="text-muted-foreground">Fecha</span>}
                    </span>
                  </div>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <CalendarPicker
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={es}
                    initialFocus
                    disabled={(d) => d < getTodayDate()}
                  />
                </PopoverContent>
              </Popover>

              {/* Time Field */}
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="flex-1 h-14 data-[size=default]:h-14 px-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors border-0 shadow-none gap-3 focus:ring-0 focus-visible:ring-0">
                  <Clock className="w-5 h-5 text-primary shrink-0" />
                  <SelectValue placeholder="Seleccionar hora" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Search Button */}
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground h-14 px-6 rounded-xl flex items-center gap-2 shrink-0"
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
