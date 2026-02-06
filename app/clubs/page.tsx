import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ClubsList } from "@/components/clubs/clubs-list"

export default function ClubsPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <ClubsList />
      <Footer />
    </main>
  )
}
