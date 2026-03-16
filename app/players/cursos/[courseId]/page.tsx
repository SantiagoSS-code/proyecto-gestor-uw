import { PlayerCourseDetail } from "@/components/players/player-course-detail"

interface Props {
  params: { courseId: string }
}

export default function PlayerCourseDetailPage({ params }: Props) {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 py-8">
        <PlayerCourseDetail courseId={params.courseId} />
      </div>
    </main>
  )
}
