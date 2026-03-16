import { PlayerMyCourses } from "@/components/players/player-my-courses"

export const metadata = {
  title: "Mis Cursos",
  description: "Tus programas y academias activos",
}

export default function PlayerMyCoursesPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 py-8">
        <PlayerMyCourses />
      </div>
    </main>
  )
}
