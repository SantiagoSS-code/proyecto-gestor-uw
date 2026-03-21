import { Suspense } from "react"
import CourtsTabsClient from "./courts-tabs-client"
import { PermissionGate } from "@/components/dashboard/permission-gate"

export default function CourtsPage() {
	return (
		<PermissionGate module="courts">
			<Suspense fallback={null}>
				<CourtsTabsClient />
			</Suspense>
		</PermissionGate>
	)
}
