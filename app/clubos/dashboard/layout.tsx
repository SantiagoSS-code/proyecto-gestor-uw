import { AppSidebar, MobileSidebar } from "@/components/dashboard/app-sidebar"
import { SaveFeedbackModal } from "@/components/dashboard/save-feedback-modal"
import { OnboardingProvider } from "@/lib/onboarding"
import { OnboardingBanner } from "@/components/dashboard/onboarding-banner"
import { OnboardingGate } from "@/components/dashboard/onboarding-gate"
import { WelcomeOverlay } from "@/components/dashboard/welcome-overlay"

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<OnboardingProvider>
			<WelcomeOverlay />
			<div className="flex min-h-screen bg-muted/5">
				<AppSidebar />
				<div className="flex-1 flex flex-col min-h-screen overflow-hidden">
					<SaveFeedbackModal />
					<MobileSidebar />
					<OnboardingBanner />
					<main className="flex-1 overflow-y-auto">
						<div className="container mx-auto max-w-7xl p-4 md:p-8 space-y-8">
							<OnboardingGate>
								{children}
							</OnboardingGate>
						</div>
					</main>
				</div>
			</div>
		</OnboardingProvider>
	)
}
