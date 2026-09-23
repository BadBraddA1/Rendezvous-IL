/**
 * Per-site auth settings for the BraddCorp auth kit (see BadBraddA1/braddcorp-auth).
 * Colors live in app/auth.css (the :root token block).
 */

export type SocialProvider = "oauth_google" | "oauth_apple"

export const authConfig = {
  siteName: "Rendezvous IL",

  homeUrl: "/",

  afterSignInUrl: "/account",
  afterSignUpUrl: "/account",

  signInUrl: "/sign-in",
  signUpUrl: "/sign-up",
  forgotPasswordUrl: "/forgot-password",
  ssoCallbackUrl: "/sso-callback",

  collectName: true,

  /**
   * Absolute redirect_url values on these hosts are honored after sign-in
   * (middleware deep-link returns). Relative paths are always allowed.
   */
  allowedReturnHosts: ["rendezvousil.com", "www.rendezvousil.com"] as string[],

  /** No social connections enabled on the Ren Clerk instance. */
  socialProviders: [] as SocialProvider[],

  copy: {
    signInTitle: "Welcome back",
    signInSubtitle: "Sign in to your family dashboard and manage registrations.",
    signUpTitle: "Create your account",
    signUpSubtitle: "Join Rendezvous IL to manage registrations and your family dashboard.",
    forgotTitle: "Reset your password",
    forgotSubtitle: "Enter your account email and we'll send you a reset code.",
  },
}
