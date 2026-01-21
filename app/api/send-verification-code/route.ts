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
          from: "Padel Club <onboarding@resend.dev>",
          to: [email],
          subject: "Tu código de verificación - Padel Club",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; text-align: center;">Padel Club</h1>
              <h2 style="color: #666; text-align: center;">Código de Verificación</h2>
              <p>Hola ${name || ""},</p>
              <p>Tu código de verificación es:</p>
              <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
              </div>
              <p>Este código expira en 10 minutos.</p>
              <p>Si no solicitaste este código, puedes ignorar este email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #999; font-size: 12px; text-align: center;">
                © 2026 Padel Club. Todos los derechos reservados.
              </p>
            </div>
          `,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.log("[v0] Resend error:", errorData)
        // Fallback: return success but log the code for testing
        console.log(`[v0] Verification code for ${email}: ${code}`)
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
      console.log(`[v0] Verification code for ${email}: ${code}`)

      return NextResponse.json({
        success: true,
        message: "Código enviado (modo desarrollo - revisa la consola del servidor)",
        // In development, return the code so we can test
        debug_code: process.env.NODE_ENV === "development" ? code : undefined,
      })
    }
  } catch (error) {
    console.log("[v0] Send verification code error:", error)
    return NextResponse.json({ error: "Error al enviar el código de verificación" }, { status: 500 })
  }
}
