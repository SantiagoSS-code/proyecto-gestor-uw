"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { User, onAuthStateChanged } from "firebase/auth"
import { authBackoffice } from "@/lib/firebaseBackofficeClient"

interface BackofficeAuthContextType {
  user: User | null
  loading: boolean
}

const BackofficeAuthContext = createContext<BackofficeAuthContextType>({
  user: null,
  loading: true,
})

export const useBackofficeAuth = () => {
  const context = useContext(BackofficeAuthContext)
  if (!context) {
    throw new Error("useBackofficeAuth must be used within a BackofficeAuthProvider")
  }
  return context
}

export function BackofficeAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authBackoffice, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return <BackofficeAuthContext.Provider value={{ user, loading }}>{children}</BackofficeAuthContext.Provider>
}
