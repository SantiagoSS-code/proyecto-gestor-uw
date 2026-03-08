import { cn } from "@/lib/utils"
import Image from "next/image"

interface LogoProps {
  className?: string
  width?: number
  height?: number
}

export function Logo({ className, width = 130, height = 42 }: LogoProps) {
  return (
    <Image
      src="/images/voyd-logo-new-cropped.png"
      alt="VOYD Logo"
      width={width}
      height={height}
      className={cn("object-contain", className)}
    />
  )
}
