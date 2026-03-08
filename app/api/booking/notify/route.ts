import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { adminDb } from "@/lib/firebase/admin"

export const runtime = "nodejs"

const SPORT_LABEL: Record<string, string> = {
  padel: "Pádel",
  tennis: "Tennis",
  futbol: "Fútbol",
  pickleball: "Pickleball",
  squash: "Squash",
}

function formatDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatCurrency(amount: number | null, currency: string) {
  if (amount == null) return "A confirmar"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency === "ARS" ? "ARS" : "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

function playerEmailHtml(b: any) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:#2563eb;padding:32px 40px;text-align:center">
            <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px">VOYD</div>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:40px">
          <div style="font-size:24px;font-weight:700;color:#0f172a;margin-bottom:8px">✅ ¡Reserva confirmada!</div>
          <p style="color:#475569;margin:0 0 32px">Hola ${b.userName}, tu turno fue reservado exitosamente.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:24px">
            <tr><td style="padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px">Club</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${b.clubName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px">Cancha</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${b.courtName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px">Deporte</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${SPORT_LABEL[b.sport] || b.sport}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px">Fecha</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right;text-transform:capitalize">${formatDate(b.date)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px">Horario</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${b.startTime} – ${b.endTime}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px">Duración</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${b.durationMinutes} min</td>
                </tr>
                <tr style="border-top:1px solid #e2e8f0">
                  <td style="padding:12px 0 6px;color:#0f172a;font-size:15px;font-weight:700">Total</td>
                  <td style="padding:12px 0 6px;color:#2563eb;font-size:15px;font-weight:700;text-align:right">${formatCurrency(b.price, b.currency)}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="color:#64748b;font-size:13px;margin:0">
            ID de reserva: <span style="font-family:monospace;color:#334155">${b.bookingId || ""}</span>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
          <p style="color:#94a3b8;font-size:12px;margin:0">VOYD · Sistema de reservas deportivas</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function clubEmailHtml(b: any) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr>
          <td style="background:#0f172a;padding:32px 40px;text-align:center">
            <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px">VOYD</div>
            <div style="color:#94a3b8;font-size:13px;margin-top:4px">Panel de gestión</div>
          </td>
        </tr>
        <tr><td style="padding:40px">
          <div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:8px">🎾 Nueva reserva confirmada</div>
          <p style="color:#475569;margin:0 0 32px">Hay una nueva reserva en <strong>${b.clubName}</strong>.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:24px">
            <tr><td style="padding:20px 24px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px">Jugador</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${b.userName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px">Email</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${b.userEmail}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px">Cancha</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${b.courtName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px">Deporte</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${SPORT_LABEL[b.sport] || b.sport}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px">Fecha</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right;text-transform:capitalize">${formatDate(b.date)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748b;font-size:14px">Horario</td>
                  <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right">${b.startTime} – ${b.endTime}</td>
                </tr>
                <tr style="border-top:1px solid #e2e8f0">
                  <td style="padding:12px 0 6px;color:#0f172a;font-size:15px;font-weight:700">Total</td>
                  <td style="padding:12px 0 6px;color:#2563eb;font-size:15px;font-weight:700;text-align:right">${formatCurrency(b.price, b.currency)}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="color:#64748b;font-size:13px;margin:0">
            ID: <span style="font-family:monospace;color:#334155">${b.bookingId || ""}</span>
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center">
          <p style="color:#94a3b8;font-size:12px;margin:0">VOYD · Sistema de gestión para clubes</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json()
    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 })
    }

    // Decode compound bookingId → clubId__docId
    const idx = bookingId.indexOf("__")
    if (idx === -1) {
      return NextResponse.json({ error: "Invalid bookingId format" }, { status: 400 })
    }
    const clubId = bookingId.slice(0, idx)
    const docId = bookingId.slice(idx + 2)

    // Read booking via admin SDK
    const bookingSnap = await adminDb
      .collection("centers")
      .doc(clubId)
      .collection("bookings")
      .doc(docId)
      .get()

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const b = { ...bookingSnap.data(), bookingId } as any

    // Read club email via admin SDK
    const centerSnap = await adminDb.collection("centers").doc(clubId).get()
    const centerEmail: string | null = centerSnap.exists ? (centerSnap.data()?.email || null) : null

    // Send emails via Resend
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set — skipping emails")
      return NextResponse.json({ ok: true, emailsSent: false })
    }

    const resend = new Resend(apiKey)
    const from = "VOYD Reservas <onboarding@resend.dev>"

    const sends = []

    // 1) Email to player
    if (b.userEmail) {
      sends.push(
        resend.emails.send({
          from,
          to: b.userEmail,
          subject: `✅ Reserva confirmada — ${b.clubName} · ${b.date} ${b.startTime}`,
          html: playerEmailHtml(b),
        })
      )
    }

    // 2) Email to club
    if (centerEmail) {
      sends.push(
        resend.emails.send({
          from,
          to: centerEmail,
          subject: `🎾 Nueva reserva — ${b.courtName} · ${b.date} ${b.startTime} · ${b.userName}`,
          html: clubEmailHtml(b),
        })
      )
    }

    await Promise.all(sends)

    return NextResponse.json({ ok: true, emailsSent: sends.length })
  } catch (err) {
    console.error("notify error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
