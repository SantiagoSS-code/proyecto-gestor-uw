import Link from "next/link"
import { Sparkles } from "lucide-react"

import { LoginCentrosForm } from "@/components/auth/login-centros-form"

export default function ClubOsLoginPage() {
  return (
    <main className="min-h-screen flex">
      {/* Lado izquierdo - Imagen */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 items-center justify-center p-8 relative overflow-hidden">
        {/* Elementos decorativos de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>

        {/* Contenido decorativo */}
        <div className="relative z-10 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white">ClubOS</h2>
            <p className="text-xl text-blue-100">
              Gestiona tu centro de padel de forma integral
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 text-left">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.3A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white">Reservas</h3>
              <p className="text-sm text-blue-100">Administra tus canchas</p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155.03.299.066.41.147a.75.75 0 00.528.205.75.75 0 00.776-.703 2.25 2.25 0 00-.783-2.08A2.75 2.75 0 008.5 3c-.727 0-1.396.232-1.962.664a2.25 2.25 0 00-.783 2.08.75.75 0 00.976.696c.111-.08.255-.117.41-.147A1.25 1.25 0 017.25 5.75c0 .298.125.573.33.763.204.19.48.287.77.287.29 0 .566-.097.77-.287.205-.19.33-.465.33-.763 0-.414-.336-.75-.75-.75h.018zm8.16 7.75h-4.08a6 6 0 00-5.98 5.98V18a.75.75 0 001.5 0v-.27a4.5 4.5 0 014.48-4.48h4.08a.75.75 0 000-1.5z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white">Jugadores</h3>
              <p className="text-sm text-blue-100">Gestiona tu comunidad</p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4.5 3a2.5 2.5 0 015 0V4H10a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75H4.75A.75.75 0 004 4.75V4a2.5 2.5 0 01.5-1.5zm6.05 6a.75.75 0 01.787.713l.275 2.75h2.947a.75.75 0 010 1.5h-.428l.536 5.36a.75.75 0 01-.748.84H2.718a.75.75 0 01-.748-.84l.536-5.36H1.75a.75.75 0 010-1.5h2.947l.275-2.75A.75.75 0 1110.5 9z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white">Pagos</h3>
              <p className="text-sm text-blue-100">Recibe tus ganancias</p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white">Reportes</h3>
              <p className="text-sm text-blue-100">Analiza tu negocio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lado derecho - Formulario */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Bienvenido</h1>
            <p className="text-muted-foreground">
              Iniciá sesión en tu cuenta de centro deportivo
            </p>
          </div>

          <LoginCentrosForm />
        </div>
      </div>
    </main>
  )
}
