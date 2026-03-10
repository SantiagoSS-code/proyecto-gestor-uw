import Stripe from "stripe"
import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase/admin"

export const runtime = "nodejs"

type BodyPayload = {
  centerId?: string
  email?: string
  plan?: "starter" | "growth" | "pro"
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

const PLAN_PRICE: Record<"starter" | "growth" | "pro", { amountCents: number; label: string }> = {
  starter: { amountCents: 2900, label: "Plan Starter" },
  growth: { amountCents: 7900, label: "Plan Growth" },
  pro: { amountCents: 14900, label: "Plan Pro" },
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as BodyPayload | null
    const centerId = String(body?.centerId || "").trim()
    const email = String(body?.email || "").trim().toLowerCase()
    const plan = (String(body?.plan || "growth").toLowerCase() as "starter" | "growth" | "pro")

    if (!centerId || !email) {
      return NextResponse.json({ error: "centerId y email son obligatorios" }, { status: 400 })
    }

    if (!PLAN_PRICE[plan]) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
    }

    const centerRef = adminDb.collection("centers").doc(centerId)
    const legacyRef = adminDb.collection("padel_centers").doc(centerId)

    await Promise.all([
      centerRef.set({ selectedPlan: plan, updatedAt: new Date() }, { merge: true }),
      legacyRef.set({ plan, updatedAt: new Date() }, { merge: true }),
    ])

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const stripe = getStripe()
    const price = PLAN_PRICE[plan]

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      success_url: `${origin}/clubos/login?checkout=success&plan=${encodeURIComponent(plan)}`,
      cancel_url: `${origin}/clubos/register/plan?centerId=${encodeURIComponent(centerId)}&email=${encodeURIComponent(email)}`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: price.amountCents,
            product_data: {
              name: `${price.label} · Activación ClubOS`,
            },
          },
        },
      ],
      metadata: {
        type: "clubos_plan_activation",
        centerId,
        email,
        plan,
      },
    })

    return NextResponse.json({ ok: true, checkoutUrl: session.url || null })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "No se pudo crear el checkout" }, { status: 500 })
  }
}
