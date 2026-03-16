import { PlayerCoursesDiscovery } from "@/components/players/player-courses-discovery"

export const metadata = {
  title: "Cursos y Programas",
  description: "Explorá los cursos y academias disponibles",
}

export default function PlayerCoursesPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 py-8">
        <PlayerCoursesDiscovery />
      </div>
    </main>
  )
}
