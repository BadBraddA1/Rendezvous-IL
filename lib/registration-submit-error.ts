const SUPPORT =
  "Contact Stephen Bradd at (217) 935-5058 or Stephen@Bradd.us if this keeps happening."

export function getRegistrationSubmitErrorMessage(
  error: unknown,
  status?: number,
  serverMessage?: string,
): string {
  if (status === 403) {
    return (
      serverMessage ||
      "Registration opens January 1, 2027. Check back then, or join the notify list on the registration page."
    )
  }
  if (status === 429) {
    return "Too many submission attempts. Please wait a few minutes and try again."
  }
  if (status && status >= 500) {
    return `Our server had trouble saving your registration. Please try again in a few minutes. ${SUPPORT}`
  }
  if (error instanceof TypeError) {
    return "We couldn't reach the server. Check your internet connection, then try submitting again."
  }
  if (typeof serverMessage === "string" && serverMessage.trim()) {
    return serverMessage
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return `Something went wrong while submitting your registration. Please try again. ${SUPPORT}`
}
