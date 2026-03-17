import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { TournamentPublicPage } from "@/components/tournaments/tournament-public-page"
import { use } from "react"

interface Props {
  params: Promise<{ slug: string; tournamentSlug: string }>
}

export default function TournamentPage({ params }: Props) {
  const { slug, tournamentSlug } = use(params)
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <TournamentPublicPage clubSlug={slug} tournamentSlug={tournamentSlug} />
      <Footer />
    </main>
  )
}
