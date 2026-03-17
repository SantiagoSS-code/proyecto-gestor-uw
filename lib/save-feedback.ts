export const SAVE_FEEDBACK_EVENT = "center-save-feedback"

export type SaveFeedbackVariant = "success" | "error"

export type SaveFeedbackDetail = {
  message: string
  variant: SaveFeedbackVariant
  reload: boolean
  redirectTo?: string
}

export function showSavePopupAndRefresh(
  message: string,
  variant: SaveFeedbackVariant = "success",
  reload?: boolean,
  redirectTo?: string,
) {
  if (typeof window === "undefined") return
  const detail: SaveFeedbackDetail = {
    message,
    variant,
    // Errors never reload by default (would lose unsaved form data)
    reload: reload ?? variant === "success",
    redirectTo,
  }
  window.dispatchEvent(new CustomEvent(SAVE_FEEDBACK_EVENT, { detail }))
}
