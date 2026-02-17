import type React from "react"
import { cn } from "@/lib/utils"

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean
}

export function PrimaryButton({
  className,
  fullWidth = true,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={cn(
        "h-12 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-lg transition-all",
        "hover:from-blue-700 hover:to-blue-600 active:scale-[0.99]",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        fullWidth && "w-full",
        className
      )}
      {...props}
    />
  )
}
