import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ClubDetail } from "@/components/clubs/club-detail"
import { use } from "react"

export default function ClubDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <ClubDetail slug={slug} />
      <Footer />
    </main>
  )
}
