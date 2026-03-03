"use client"

import type { ReactNode } from "react"

interface CourtsLayoutProps {
  title: string
  description?: string
  children: ReactNode
}

export function CourtsLayout({ title, description, children }: CourtsLayoutProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="text-slate-500 mt-2">{description}</p>}
      </div>
      <div>
        {children}
      </div>
    </div>
  )
}

