"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertCircle, CheckCircle } from "lucide-react"
import { SAVE_FEEDBACK_EVENT, type SaveFeedbackDetail } from "@/lib/save-feedback"

const defaultState: SaveFeedbackDetail = {
  message: "",
  variant: "success",
  reload: true,
}

export function SaveFeedbackModal() {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState<SaveFeedbackDetail>(defaultState)

  useEffect(() => {
    const onFeedback = (event: Event) => {
      const custom = event as CustomEvent<SaveFeedbackDetail>
      if (!custom.detail?.message) return
      setFeedback(custom.detail)
      setOpen(true)
    }

    window.addEventListener(SAVE_FEEDBACK_EVENT, onFeedback)
    return () => window.removeEventListener(SAVE_FEEDBACK_EVENT, onFeedback)
  }, [])

  const closeAndMaybeReload = () => {
    setOpen(false)
    if (feedback.redirectTo) {
      window.location.href = feedback.redirectTo
    } else if (feedback.reload) {
      window.location.reload()
    }
  }

  const isSuccess = feedback.variant === "success"

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? closeAndMaybeReload() : setOpen(next))}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="gap-3">
          <div className="flex justify-center">
            {isSuccess ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-7 w-7 text-emerald-600" />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-7 w-7 text-red-600" />
              </div>
            )}
          </div>
          <DialogTitle className="text-center text-xl">
            {isSuccess ? "Cambios guardados" : "No se pudieron guardar"}
          </DialogTitle>
          <DialogDescription className="text-center text-base text-slate-600">
            {feedback.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2">
          <Button className="w-full sm:w-auto" onClick={closeAndMaybeReload}>
            Aceptar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
