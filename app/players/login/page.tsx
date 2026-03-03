"use client"

import dynamic from "next/dynamic"

const LoginPlayersForm = dynamic(() => import("@/components/auth/login-players-form").then(mod => ({ default: mod.LoginPlayersForm })), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-lg shadow-lg p-8 animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  )
})

export default function PlayerLoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <LoginPlayersForm />
    </main>
  )
}
