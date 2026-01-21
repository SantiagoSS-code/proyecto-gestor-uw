import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { TopClubsSection } from "@/components/top-clubs-section"
import { HowItWorksSection } from "@/components/how-it-works-section"
import { CtaSection } from "@/components/cta-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      {/* B2C Section - For Players */}
      <HeroSection />
      <TopClubsSection />
      <HowItWorksSection />
      {/* B2B CTA - For Clubs */}
      <CtaSection />
      <Footer />
    </main>
  )
}
