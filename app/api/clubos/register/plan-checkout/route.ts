import Stripe from "stripe"
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"

export const runtime = "nodejs"

type BodyPayload = {
  centerId?: string
  email?: string
  plan?: "estandar" | "profesional" | "maestro" | "starter" | "growth" | "pro"
  billing?: "monthly" | "annual"
}

let stripeClient: Stripe | null = null

function getStripe() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret) {
    throw new Error("Stripe no está configurado (falta STRIPE_SECRET_KEY)")
  }
  if (!stripeClient) stripeClient = new Stripe(stripeSecret)
  return stripeClient
}

type PlanTier = {
  monthly: { amountCents: number; label: string }
  annual: { amountCents: number; label: string }
}

const PLAN_CONFIG: Record<string, PlanTier> = {
  // Current plan keys
  estandar: {
    monthly: { amountCents: 2900, label: "Plan Estándar · mensual" },
    annual: { amountCents: 29900, label: "Plan Estándar · anual" },
  },
  profesional: {
    monthly: { amountCents: 4900, label: "Plan Profesional · mensual" },
    annual: { amountCents: 49900, label: "Plan Profesional · anual" },
  },
  maestro: {
    monthly: { amountCents: 7900, label: "Plan Maestro · mensual" },
    annual: { amountCents: 79900, label: "Plan Maestro · anual" },
  },
  // Legacy keys kept for backwards compatibility
  starter: {
    monthly: { amountCents: 2900, label: "Plan Starter · mensual" },
    annual: { amountCents: 29900, label: "Plan Starter · anual" },
  },
  growth: {
    monthly: { amountCents: 4900, label: "Plan Growth · mensual" },
    annual: { amountCents: 49900, label: "Plan Growth · anual" },
  },
  pro: {
    monthly: { amountCents: 7900, label: "Plan Pro · mensual" },
    annual: { amountCents: 79900, label: "Plan Pro · anual" },
  },
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as BodyPayload | null
    const centerId = String(body?.centerId || "").trim()
    const email = String(body?.email || "").trim().toLowerCase()
    const plan = String(body?.plan || "profesional").toLowerCase() as keyof typeof PLAN_CONFIG
    const billing = (String(body?.billing || "monthly").toLowerCase() === "annual" ? "annual" : "monthly") as "monthly" | "annual"

    if (!centerId || !email) {
      return NextResponse.json({ error: "centerId y email son obligatorios" }, { status: 400 })
    }

    const planConfig = PLAN_CONFIG[plan]
    if (!planConfig) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
    }

    const centerRef = adminDb.collection("centers").doc(centerId)
    const legacyRef = adminDb.collection("padel_centers").doc(centerId)

    await Promise.all([
      centerRef.set({ selectedPlan: plan, subscriptionPeriod: billing, updatedAt: new Date() }, { merge: true }),
      legacyRef.set({ plan, updatedAt: new Date() }, { merge: true }),
    ])

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const stripe = getStripe()
    const tier = planConfig[billing]
    const interval = billing === "annual" ? "year" : "month"
    const nextPath = encodeURIComponent("/clubos/dashboard/settings/profile")

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      success_url: `${origin}/clubos/login?checkout=success&plan=${encodeURIComponent(plan)}&billing=${billing}&next=${nextPath}`,
      cancel_url: `${origin}/clubos/register/plan?centerId=${encodeURIComponent(centerId)}&email=${encodeURIComponent(email)}`,
      subscription_data: {
        metadata: {
          type: "clubos_subscription",
          centerId,
          email,
          plan,
          billing,
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: tier.amountCents,
            recurring: {
              interval,
            },
            product_data: {
              name: tier.label,
            },
          },
        },
      ],
      metadata: {
        type: "clubos_plan_activation",
        centerId,
        email,
        plan,
        billing,
      },
    })

    return NextResponse.json({ ok: true, checkoutUrl: session.url || null })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "No se pudo crear el checkout" }, { status: 500 })
  }
}
