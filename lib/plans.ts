export const PLAN_IDS = ["free", "starter", "pro", "enterprise"] as const
export type PlanId = (typeof PLAN_IDS)[number]

export const FEATURES = [
  "multi_user",
  "advanced_reports",
  "custom_branding",
  "api_access",
  "priority_support",
  "bulk_import",
  "audit_log",
] as const
export type FeatureId = (typeof FEATURES)[number]

export interface PlanDefinition {
  id: PlanId
  label: string
  features: readonly FeatureId[]
  limits: {
    maxTeamMembers: number // -1 = unlimited
  }
}

export const PLAN_FEATURES: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    label: "Gratis",
    features: [],
    limits: { maxTeamMembers: 1 },
  },
  starter: {
    id: "starter",
    label: "Starter",
    features: ["multi_user", "bulk_import"],
    limits: { maxTeamMembers: 5 },
  },
  pro: {
    id: "pro",
    label: "Pro",
    features: [
      "multi_user",
      "advanced_reports",
      "custom_branding",
      "bulk_import",
      "audit_log",
    ],
    limits: { maxTeamMembers: 20 },
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    features: [
      "multi_user",
      "advanced_reports",
      "custom_branding",
      "api_access",
      "priority_support",
      "bulk_import",
      "audit_log",
    ],
    limits: { maxTeamMembers: -1 },
  },
}

/** Check whether a plan includes a specific feature */
export function planHasFeature(plan: PlanId, feature: FeatureId): boolean {
  const def = PLAN_FEATURES[plan]
  if (!def) return false
  return def.features.includes(feature)
}

/** Get the minimum plan required for a feature */
export function minimumPlanFor(feature: FeatureId): PlanId {
  for (const id of PLAN_IDS) {
    if (PLAN_FEATURES[id].features.includes(feature)) return id
  }
  return "enterprise"
}

/** Human-readable label for a feature */
export const FEATURE_LABELS: Record<FeatureId, string> = {
  multi_user: "Múltiples usuarios",
  advanced_reports: "Reportes avanzados",
  custom_branding: "Marca personalizada",
  api_access: "Acceso a API",
  priority_support: "Soporte prioritario",
  bulk_import: "Importación masiva",
  audit_log: "Registro de auditoría",
}
