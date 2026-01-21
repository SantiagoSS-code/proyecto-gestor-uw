import { PricingSection } from "@/components/pricing-section"
import { FeaturesB2BSection } from "@/components/features-b2b-section"
import { TestimonialsB2BSection } from "@/components/testimonials-b2b-section"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background pt-16">
      <Header />
      {/* B2B Section - For Clubs */}
      <PricingSection />
      <FeaturesB2BSection />
      <TestimonialsB2BSection />
      <Footer />
    </main>
  )
}
