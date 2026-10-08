/**
 * Per-site auth settings for @braddcorp/auth.
 * Brand colors: styles/auth-tokens.css
 */

import type { AuthConfig, SocialProvider } from "@braddcorp/auth"

export type { SocialProvider }

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
} satisfies AuthConfig
