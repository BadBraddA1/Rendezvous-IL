/**
 * Per-site chat settings — Rendezvous IL (System Six).
 * Colors live in styles/chat.css (:root --chat-* tokens).
 */

export const chatConfig = {
  siteName: "Rendezvous",

  groupWindowMs: 2 * 60 * 1000,

  composerMaxLines: 5,

  copy: {
    emptyTitle: "Say hello to your Rendezvous family",
    emptySubtitle: "Send a message to start the conversation.",
    composerPlaceholder: "Message…",
    newMessages: (n: number) => (n === 1 ? "1 new message" : `${n} new messages`),
    retry: "Retry",
    sendAria: "Send message",
    attachAria: "Attach photos",
  },
}
