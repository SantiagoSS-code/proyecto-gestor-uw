import { cn } from "@/lib/utils"
import Image from "next/image"

export function VoydLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/images/voyd-logo-new-cropped.png"
      alt="VOYD"
      width={980}
      height={320}
      className={cn("h-12 w-auto shrink-0 object-contain", className)}
    />
  )
}
