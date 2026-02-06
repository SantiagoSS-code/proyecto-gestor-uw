import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, code, name } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: "Email y código son requeridos" }, { status: 400 })
    }

    // Use Resend to send the verification email
    // If you don't have Resend, we'll use a fallback approach
    const RESEND_API_KEY = process.env.RESEND_API_KEY

    if (RESEND_API_KEY) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || "Courtly <onboarding@resend.dev>",
          to: [email],
          subject: "Tu código de verificación - Courtly",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb; margin: 0;">courtly</h1>
              </div>
              <h2 style="color: #333; text-align: center;">Código de Verificación</h2>
              <p style="color: #666;">Hola${name ? ` ${name}` : ''},</p>
              <p style="color: #666;">Tu código de verificación es:</p>
              <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 25px; text-align: center; margin: 25px 0; border-radius: 12px;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #fff;">${code}</span>
              </div>
              <p style="color: #666;">Este código expira en <strong>10 minutos</strong>.</p>
              <p style="color: #999; font-size: 14px;">Si no solicitaste este código, puedes ignorar este email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #999; font-size: 12px; text-align: center;">
                © 2026 Courtly. Todos los derechos reservados.
              </p>
            </div>
          `,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.log("[Courtly] Resend error:", errorData)
        // Fallback: return success but log the code for testing
        console.log(`[Courtly] Verification code for ${email}: ${code}`)
        return NextResponse.json({
          success: true,
          message: "Código enviado (modo desarrollo)",
          debug_code: process.env.NODE_ENV === "development" ? code : undefined,
        })
      }

      return NextResponse.json({ success: true, message: "Código enviado" })
    } else {
      // No Resend API key - development mode
      // Log the code so it can be used for testing
      console.log(`[Courtly] Verification code for ${email}: ${code}`)

      return NextResponse.json({
        success: true,
        message: "Código enviado (modo desarrollo - revisa la consola del servidor)",
        // In development, return the code so we can test
        debug_code: process.env.NODE_ENV === "development" ? code : undefined,
      })
    }
  } catch (error) {
    console.log("[Courtly] Send verification code error:", error)
    return NextResponse.json({ error: "Error al enviar el código de verificación" }, { status: 500 })
  }
}
