export const SAVE_FEEDBACK_EVENT = "center-save-feedback"

export type SaveFeedbackVariant = "success" | "error"

export type SaveFeedbackDetail = {
  message: string
  variant: SaveFeedbackVariant
  reload: boolean
}

export function showSavePopupAndRefresh(message: string, variant: SaveFeedbackVariant = "success") {
  if (typeof window === "undefined") return
  const detail: SaveFeedbackDetail = {
    message,
    variant,
    reload: true,
  }
  window.dispatchEvent(new CustomEvent(SAVE_FEEDBACK_EVENT, { detail }))
}
