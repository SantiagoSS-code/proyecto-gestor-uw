// ─────────────────────────────────────────────────────────────
//  Club Permissions — roles, modules, and permission config
// ─────────────────────────────────────────────────────────────

export type RoleId = "owner" | "manager" | "reception" | "trainer"

export type ModuleId =
  | "dashboard"
  | "reservations"
  | "courts"
  | "clients"
  | "courses"
  | "trainers"
  | "promotions"
  | "memberships"
  | "tournaments"
  | "finances"
  | "reports"
  | "settings"
  | "team"

export type PermissionLevel = "view" | "create" | "edit" | "manage"

export type ModulePermissions = Partial<Record<PermissionLevel, boolean>>
export type RolePermissions = Record<ModuleId, ModulePermissions>

// ── Module metadata ─────────────────────────────────────────
export const MODULES: { id: ModuleId; label: string; href: string }[] = [
  { id: "dashboard",    label: "Panel",          href: "/clubos/dashboard" },
  { id: "reservations", label: "Reservas",       href: "/clubos/dashboard/reservas" },
  { id: "courts",       label: "Canchas",        href: "/clubos/dashboard/courts" },
  { id: "clients",      label: "Clientes",       href: "/clubos/dashboard/customers" },
  { id: "courses",      label: "Cursos",         href: "/clubos/dashboard/cursos" },
  { id: "trainers",     label: "Entrenadores",   href: "/clubos/dashboard/trainers" },
  { id: "promotions",   label: "Promociones",    href: "/clubos/dashboard/promotions" },
  { id: "memberships",  label: "Membresías",     href: "/clubos/dashboard/memberships" },
  { id: "tournaments",  label: "Torneos",        href: "/clubos/dashboard/tournaments" },
  { id: "finances",     label: "Finanzas",       href: "/clubos/dashboard/finanzas" },
  { id: "reports",      label: "Reportes",       href: "/clubos/dashboard/reportes" },
  { id: "settings",     label: "Configuración",  href: "/clubos/dashboard/settings" },
  { id: "team",         label: "Equipo",         href: "/clubos/dashboard/settings/team" },
]

// ── Role metadata ────────────────────────────────────────────
export const ROLES: { id: RoleId; label: string; description: string; color: string }[] = [
  {
    id: "owner",
    label: "Dueño",
    description: "Acceso total al sistema, configuración, cobros, equipo y reportes.",
    color: "bg-violet-100 text-violet-800",
  },
  {
    id: "manager",
    label: "Manager",
    description: "Operación diaria del club: reservas, canchas, clientes y reportes operativos.",
    color: "bg-blue-100 text-blue-800",
  },
  {
    id: "reception",
    label: "Recepción",
    description: "Gestión de reservas y clientes, sin acceso a configuración sensible.",
    color: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "trainer",
    label: "Entrenador",
    description: "Acceso limitado a cursos, clases y sus alumnos.",
    color: "bg-amber-100 text-amber-800",
  },
]

const ALL: ModulePermissions = { view: true, create: true, edit: true, manage: true }
const VIEW_ONLY: ModulePermissions = { view: true }
const VIEW_EDIT: ModulePermissions = { view: true, create: true, edit: true }
const NONE: ModulePermissions = {}

// ── Default permissions per role ─────────────────────────────
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleId, RolePermissions> = {
  owner: {
    dashboard:    ALL,
    reservations: ALL,
    courts:       ALL,
    clients:      ALL,
    courses:      ALL,
    trainers:     ALL,
    promotions:   ALL,
    memberships:  ALL,
    tournaments:  ALL,
    finances:     ALL,
    reports:      ALL,
    settings:     ALL,
    team:         ALL,
  },
  manager: {
    dashboard:    VIEW_ONLY,
    reservations: ALL,
    courts:       VIEW_EDIT,
    clients:      VIEW_EDIT,
    courses:      VIEW_EDIT,
    trainers:     VIEW_EDIT,
    promotions:   VIEW_EDIT,
    memberships:  VIEW_EDIT,
    tournaments:  VIEW_EDIT,
    finances:     VIEW_ONLY,
    reports:      VIEW_ONLY,
    settings:     NONE,
    team:         NONE,
  },
  reception: {
    dashboard:    VIEW_ONLY,
    reservations: VIEW_EDIT,
    courts:       VIEW_ONLY,
    clients:      VIEW_EDIT,
    courses:      VIEW_ONLY,
    trainers:     NONE,
    promotions:   VIEW_ONLY,
    memberships:  VIEW_ONLY,
    tournaments:  NONE,
    finances:     NONE,
    reports:      NONE,
    settings:     NONE,
    team:         NONE,
  },
  trainer: {
    dashboard:    VIEW_ONLY,
    reservations: NONE,
    courts:       NONE,
    clients:      VIEW_ONLY,
    courses:      VIEW_EDIT,
    trainers:     VIEW_ONLY,
    promotions:   NONE,
    memberships:  NONE,
    tournaments:  NONE,
    finances:     NONE,
    reports:      NONE,
    settings:     NONE,
    team:         NONE,
  },
}

// ── TeamMember type (stored in Firestore) ────────────────────
export type TeamMemberStatus = "active" | "pending"

export interface TeamMember {
  id: string
  name: string
  email: string
  role: RoleId
  status: TeamMemberStatus
  createdAt: string
  /** Custom permission overrides — if absent, uses DEFAULT_ROLE_PERMISSIONS */
  customPermissions?: RolePermissions
}

// ── Helper: resolve effective permissions for a member ───────
export function resolvePermissions(member: Pick<TeamMember, "role" | "customPermissions">): RolePermissions {
  return member.customPermissions ?? DEFAULT_ROLE_PERMISSIONS[member.role]
}

/** Returns true if the given role has at least "view" on a module */
export function canView(permissions: RolePermissions, module: ModuleId): boolean {
  return permissions[module]?.view === true
}

export function canCreate(permissions: RolePermissions, module: ModuleId): boolean {
  return permissions[module]?.create === true
}

export function canEdit(permissions: RolePermissions, module: ModuleId): boolean {
  return permissions[module]?.edit === true
}

export function canManage(permissions: RolePermissions, module: ModuleId): boolean {
  return permissions[module]?.manage === true
}

import { planHasFeature, type PlanId, type FeatureId } from "@/lib/plans"

/**
 * Server-side check: does the center's plan include the given feature?
 * `centerPlan` should come from Firestore `centers/{id}.plan`.
 * Defaults to "free" when the field is missing.
 */
export function hasFeature(
  centerPlan: PlanId | undefined | null,
  feature: FeatureId,
): boolean {
  return planHasFeature(centerPlan ?? "free", feature)
}

// ── Plan-based module access (ClubOS dashboard) ───────────────
export type ClubPlanId = "estandar" | "profesional" | "maestro"

/** Modules accessible per subscription plan */
export const PLAN_MODULES: Record<ClubPlanId, readonly ModuleId[]> = {
  estandar: [
    "dashboard", "reservations", "courts", "clients",
    "settings", "team",
  ],
  profesional: [
    "dashboard", "reservations", "courts", "clients",
    "courses", "trainers", "promotions", "memberships",
    "finances", "reports", "settings", "team",
  ],
  maestro: [
    "dashboard", "reservations", "courts", "clients",
    "courses", "trainers", "promotions", "memberships",
    "tournaments", "finances", "reports", "settings", "team",
  ],
}

/**
 * Returns true when the module is included in the given plan.
 * Defaults to true when plan is null/undefined so the UI never
 * accidentally locks on load before the Firestore read completes.
 */
export function planIncludesModule(
  plan: ClubPlanId | null | undefined,
  module: ModuleId,
): boolean {
  if (!plan) return true
  return (PLAN_MODULES[plan] as readonly string[]).includes(module)
}

/** Returns the minimum plan that includes a module */
export function minimumPlanForModule(module: ModuleId): ClubPlanId | null {
  const plans: ClubPlanId[] = ["estandar", "profesional", "maestro"]
  for (const plan of plans) {
    if ((PLAN_MODULES[plan] as readonly string[]).includes(module)) return plan
  }
  return null
}
