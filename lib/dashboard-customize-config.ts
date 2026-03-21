// ─────────────────────────────────────────────────────────────
//  Dashboard Customization – Metrics Catalog
//  Defines all configurable sections, groups and metrics for
//  the "Personalizar panel" feature. Each metric starts as
//  `enabled: false` (placeholder) so the UI can be wired up
//  progressively without breaking existing functionality.
// ─────────────────────────────────────────────────────────────

export type DashboardMetric = {
  id: string
  label: string
  description?: string
  enabled: boolean
}

export type DashboardMetricGroup = {
  id: string
  label: string
  metrics: DashboardMetric[]
}

export type DashboardCustomizeSection = {
  id: string
  label: string
  icon: string // lucide icon name, used as reference
  groups: DashboardMetricGroup[]
}

// ──────────────────────────────────────────
//  FINANZAS
// ──────────────────────────────────────────
const finanzasSection: DashboardCustomizeSection = {
  id: "finanzas",
  label: "Finanzas",
  icon: "DollarSign",
  groups: [
    {
      id: "ingresos",
      label: "Ingresos",
      metrics: [
        { id: "totalRevenue",          label: "Ingresos totales del período",   enabled: true },
        { id: "revenueByDay",          label: "Ingresos por día",               enabled: true },
        { id: "revenueByWeek",         label: "Ingresos por semana",            enabled: false },
        { id: "revenueByMonth",        label: "Ingresos por mes",               enabled: false },
        { id: "revenueByPaymentMethod",label: "Ingresos por método de pago",    enabled: false },
        { id: "revenueByBookingType",  label: "Ingresos por tipo de reserva",   enabled: false },
        { id: "revenueByCourtId",      label: "Ingresos por cancha",            enabled: false },
        { id: "revenueBySport",        label: "Ingresos por deporte",           enabled: false },
      ],
    },
    {
      id: "membresias-finanzas",
      label: "Membresías",
      metrics: [
        { id: "membershipRevenue",     label: "Ingresos por membresías",        enabled: false },
        { id: "membershipsSold",       label: "Membresías vendidas",            enabled: false },
        { id: "activeMemberships",     label: "Membresías activas",             enabled: false },
        { id: "membershipsByPlan",     label: "Distribución por plan",          enabled: false },
        { id: "membershipRenewalRate", label: "Tasa de renovación",             enabled: false },
        { id: "membershipChurnRate",   label: "Tasa de cancelación",            enabled: false },
      ],
    },
    {
      id: "paquetes",
      label: "Paquetes",
      metrics: [
        { id: "packageRevenue",    label: "Ingresos por paquetes",  enabled: false },
        { id: "packagesSold",      label: "Paquetes vendidos",      enabled: false },
        { id: "packageUsageRate",  label: "Tasa de uso de sesiones",enabled: false },
      ],
    },
    {
      id: "descuentos",
      label: "Descuentos y Promociones",
      metrics: [
        { id: "discountsApplied",    label: "Descuentos aplicados",        enabled: false },
        { id: "discountByPromoCode", label: "Descuento por código promo",  enabled: false },
        { id: "discountByMembership",label: "Descuento por membresía",     enabled: false },
        { id: "totalCourtesies",     label: "Reservas en cortesía",        enabled: false },
      ],
    },
    {
      id: "pagos",
      label: "Pagos",
      metrics: [
        { id: "pendingPayments", label: "Cobros pendientes",    enabled: false },
        { id: "pendingByBooking",label: "Deuda por reserva",    enabled: false },
        { id: "pendingByClient", label: "Deuda por cliente",    enabled: false },
        { id: "cashPayments",    label: "Pagos en efectivo",    enabled: false },
        { id: "digitalPayments", label: "Pagos digitales",      enabled: false },
      ],
    },
    {
      id: "balance",
      label: "Balance",
      metrics: [
        { id: "netRevenue",    label: "Ingresos netos",  enabled: false },
        { id: "averageTicket", label: "Ticket promedio", enabled: false },
      ],
    },
  ],
}

// ──────────────────────────────────────────
//  REPORTES
// ──────────────────────────────────────────
const reportesSection: DashboardCustomizeSection = {
  id: "reportes",
  label: "Reportes",
  icon: "BarChart2",
  groups: [
    {
      id: "ocupacion",
      label: "Ocupación",
      metrics: [
        { id: "occupancyRate",      label: "Tasa de ocupación general",     enabled: false },
        { id: "occupancyByDay",     label: "Ocupación por día",             enabled: false },
        { id: "occupancyByHour",    label: "Ocupación por franja horaria",  enabled: false },
        { id: "occupancyByCourt",   label: "Ocupación por cancha",          enabled: false },
        { id: "occupancyBySport",   label: "Ocupación por deporte",         enabled: false },
        { id: "peakHours",          label: "Franjas horarias pico",         enabled: false },
        { id: "lowHours",           label: "Franjas con baja demanda",      enabled: false },
      ],
    },
    {
      id: "canchas",
      label: "Canchas",
      metrics: [
        { id: "totalCourts",          label: "Cantidad de canchas",           enabled: false },
        { id: "courtUsageCount",      label: "Reservas por cancha",           enabled: false },
        { id: "courtRevenueRanking",  label: "Ranking por ingreso",           enabled: false },
        { id: "courtIdleTime",        label: "Tiempo ocioso por cancha",      enabled: false },
      ],
    },
    {
      id: "deportes",
      label: "Deportes",
      metrics: [
        { id: "bookingsBySport", label: "Reservas por deporte",      enabled: false },
        { id: "revenueBySport",  label: "Ingresos por deporte",      enabled: false },
        { id: "popularSports",   label: "Deportes más reservados",   enabled: false },
      ],
    },
    {
      id: "tendencias",
      label: "Tendencias",
      metrics: [
        { id: "weekOverWeekGrowth",    label: "Crecimiento semana a semana",  enabled: false },
        { id: "monthOverMonthGrowth",  label: "Crecimiento mes a mes",        enabled: false },
        { id: "newVsRecurringClients", label: "Nuevos vs recurrentes",        enabled: false },
      ],
    },
  ],
}

// ──────────────────────────────────────────
//  RESERVAS
// ──────────────────────────────────────────
const reservasSection: DashboardCustomizeSection = {
  id: "reservas",
  label: "Reservas",
  icon: "CalendarDays",
  groups: [
    {
      id: "listado",
      label: "Listado y estado",
      metrics: [
        { id: "bookingsList",      label: "Listado de reservas",        enabled: true },
        { id: "bookingStatus",     label: "Estado de reservas",         enabled: false },
        { id: "bookingsByDay",     label: "Reservas por día",           enabled: false },
        { id: "bookingsByHour",    label: "Reservas por franja",        enabled: true },
        { id: "bookingsByCourtId", label: "Reservas por cancha",        enabled: false },
        { id: "bookingsBySport",   label: "Reservas por deporte",       enabled: false },
        { id: "bookingsBySource",  label: "Origen de la reserva",       enabled: false },
      ],
    },
    {
      id: "cancelaciones",
      label: "Cancelaciones",
      metrics: [
        { id: "cancellationCount",    label: "Total de cancelaciones",       enabled: false },
        { id: "cancellationRate",     label: "Tasa de cancelación (%)",      enabled: false },
        { id: "cancellationsByReason",label: "Motivo de cancelación",        enabled: false },
        { id: "cancellationsByClient",label: "Clientes que más cancelan",    enabled: false },
        { id: "lateCancellations",    label: "Cancelaciones fuera de policy",enabled: false },
      ],
    },
    {
      id: "especiales",
      label: "Reservas especiales",
      metrics: [
        { id: "courtesyBookings",   label: "Reservas en cortesía",         enabled: false },
        { id: "membershipBookings", label: "Cubiertas por membresía",      enabled: false },
        { id: "packageBookings",    label: "Cubiertas por paquete",        enabled: false },
        { id: "recurringBookings",  label: "Reservas recurrentes activas", enabled: false },
      ],
    },
    {
      id: "gestion",
      label: "Gestión",
      metrics: [
        { id: "upcomingBookings",    label: "Próximas reservas",              enabled: true },
        { id: "confirmedToday",      label: "Confirmadas hoy",                enabled: true },
        { id: "modifiedBookings",    label: "Reservas editadas",              enabled: false },
        { id: "adminCreatedBookings",label: "Creadas desde el admin",         enabled: false },
      ],
    },
  ],
}

// ──────────────────────────────────────────
//  CLIENTES
// ──────────────────────────────────────────
const clientesSection: DashboardCustomizeSection = {
  id: "clientes",
  label: "Clientes",
  icon: "Users",
  groups: [
    {
      id: "base",
      label: "Base de clientes",
      metrics: [
        { id: "totalClients",         label: "Total de clientes registrados", enabled: true },
        { id: "newClientsThisPeriod", label: "Nuevos en el período",          enabled: false },
        { id: "activeClients",        label: "Clientes activos",              enabled: false },
        { id: "inactiveClients",      label: "Clientes inactivos",            enabled: false },
        { id: "clientsBySource",      label: "Origen de registro",            enabled: false },
      ],
    },
    {
      id: "perfil",
      label: "Perfil y segmentación",
      metrics: [
        { id: "clientProfile",          label: "Perfil del cliente",         enabled: false },
        { id: "clientSportPreferences", label: "Deportes favoritos",         enabled: false },
        { id: "clientPeakHours",        label: "Horarios habituales",        enabled: false },
        { id: "clientPreferredCourts",  label: "Canchas más usadas",         enabled: false },
        { id: "clientTags",             label: "Etiquetas del cliente",      enabled: false },
      ],
    },
    {
      id: "historial",
      label: "Historial",
      metrics: [
        { id: "bookingHistory",      label: "Historial de reservas",     enabled: false },
        { id: "paymentHistory",      label: "Historial de pagos",        enabled: false },
        { id: "cancellationHistory", label: "Historial de cancelaciones",enabled: false },
        { id: "membershipHistory",   label: "Membresías contratadas",    enabled: false },
        { id: "packageHistory",      label: "Paquetes comprados",        enabled: false },
      ],
    },
    {
      id: "membresias-cliente",
      label: "Membresías por cliente",
      metrics: [
        { id: "activeMembership",           label: "Membresía activa actual",       enabled: false },
        { id: "membershipExpiresAt",        label: "Fecha de vencimiento",          enabled: false },
        { id: "membershipSessionsUsed",     label: "Sesiones usadas",               enabled: false },
        { id: "membershipSessionsRemaining",label: "Sesiones disponibles",          enabled: false },
        { id: "membershipBenefitsUsed",     label: "Beneficios consumidos",         enabled: false },
      ],
    },
    {
      id: "metricas-cliente",
      label: "Métricas por cliente",
      metrics: [
        { id: "clientLTV",            label: "Lifetime value",         enabled: false },
        { id: "clientAverageTicket",  label: "Ticket promedio",        enabled: false },
        { id: "clientVisitFrequency", label: "Frecuencia de visita",   enabled: false },
        { id: "clientChurnRisk",      label: "Riesgo de abandono",     enabled: false },
        { id: "totalSpent",           label: "Total gastado histórico",enabled: false },
      ],
    },
    {
      id: "comunicacion",
      label: "Comunicación",
      metrics: [
        { id: "lastContactAt",        label: "Último contacto",            enabled: false },
        { id: "notificationsEnabled", label: "Notificaciones activas",     enabled: false },
      ],
    },
  ],
}

// ──────────────────────────────────────────
//  MEMBRESÍAS
// ──────────────────────────────────────────
const membresiasSection: DashboardCustomizeSection = {
  id: "membresias",
  label: "Membresías",
  icon: "CreditCard",
  groups: [
    {
      id: "planes",
      label: "Planes",
      metrics: [
        { id: "membershipPlans",       label: "Planes configurados",         enabled: false },
        { id: "planName",              label: "Nombre del plan",             enabled: false },
        { id: "planPrice",             label: "Precio del plan",             enabled: false },
        { id: "planDuration",          label: "Duración del plan",           enabled: false },
        { id: "planBenefits",          label: "Beneficios incluidos",        enabled: false },
        { id: "planSports",            label: "Deportes habilitados",        enabled: false },
        { id: "planCourtRestrictions", label: "Canchas habilitadas",         enabled: false },
      ],
    },
    {
      id: "ventas-estado",
      label: "Ventas y estado",
      metrics: [
        { id: "totalActiveMemberships",    label: "Total activas",             enabled: false },
        { id: "totalExpiredMemberships",   label: "Total vencidas",            enabled: false },
        { id: "totalCancelledMemberships", label: "Total canceladas",          enabled: false },
        { id: "membershipsSoldThisPeriod", label: "Vendidas en el período",    enabled: false },
        { id: "membershipsExpiringThisWeek",label: "Próximas a vencer",        enabled: false },
      ],
    },
    {
      id: "uso",
      label: "Uso",
      metrics: [
        { id: "usageByPlan",       label: "Uso de sesiones por plan",   enabled: false },
        { id: "usageByClient",     label: "Uso por cliente",            enabled: false },
        { id: "usageByDate",       label: "Sesiones por fecha",         enabled: false },
        { id: "overdraftSessions", label: "Sesiones fuera del plan",    enabled: false },
        { id: "unusedSessions",    label: "Sesiones sin consumir",      enabled: false },
      ],
    },
    {
      id: "financiero-membresias",
      label: "Financiero",
      metrics: [
        { id: "revenueByPlan",           label: "Ingresos por tipo de plan",  enabled: false },
        { id: "averageMembershipValue",  label: "Valor promedio de membresía",enabled: false },
        { id: "renewalRevenue",          label: "Ingresos por renovaciones",  enabled: false },
      ],
    },
  ],
}

// ──────────────────────────────────────────
//  EXPORT – catalog & ordered section list
// ──────────────────────────────────────────
export const DASHBOARD_CUSTOMIZE_SECTIONS: DashboardCustomizeSection[] = [
  finanzasSection,
  reportesSection,
  reservasSection,
  clientesSection,
  membresiasSection,
]
