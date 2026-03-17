import { TournamentDetail } from "@/components/dashboard/tournaments/tournament-detail"

interface Props {
  params: Promise<{ id: string }>
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="p-6">
      <TournamentDetail tournamentId={id} />
    </div>
  )
}
