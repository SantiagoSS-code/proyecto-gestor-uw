import * as React from "react"
import { cn } from "@/lib/utils"

export interface AuthInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
}

const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "flex h-14 w-full rounded-2xl border border-input bg-background px-4 py-2 text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
            icon && "pl-11",
            className
          )}
          ref={ref}
          {...props}
        />
        {icon && (
          <div className="absolute left-4 top-0 flex h-full items-center justify-center text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    )
  }
)
AuthInput.displayName = "AuthInput"

export { AuthInput }
