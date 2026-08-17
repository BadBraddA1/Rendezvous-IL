/** Family auth: lake teal tokens, no Clerk card/logo/footer. */
export const clerkAppearance = {
  layout: {
    logoPlacement: "none",
    socialButtonsVariant: "blockButton",
    unsafe_disableDevelopmentModeWarnings: true,
  },
  variables: {
    colorPrimary: "var(--primary)",
    colorText: "var(--foreground)",
    colorTextSecondary: "var(--muted-foreground)",
    colorBackground: "transparent",
    colorInputBackground: "var(--background)",
    colorInputText: "var(--foreground)",
    colorNeutral: "var(--border)",
    colorDanger: "var(--destructive)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-franklin), ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
    card: "w-full border-0 bg-transparent p-0 shadow-none",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    logoBox: "hidden",
    footer: "hidden",
    footerPages: "hidden",
    footerAction: "hidden",
    navbar: "hidden",
    formButtonPrimary:
      "min-h-11 w-full rounded-[var(--radius)] bg-primary text-sm font-medium text-primary-foreground shadow-none hover:bg-primary/90",
    formFieldInput:
      "min-h-11 rounded-[var(--radius)] border border-border bg-background text-base text-foreground",
    formFieldLabel: "text-sm font-medium text-foreground",
    formFieldHintText: "text-sm text-muted-foreground",
    formFieldErrorText: "text-sm text-destructive",
    socialButtonsBlockButton:
      "min-h-11 border border-border bg-background text-foreground hover:bg-secondary",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formResendCodeLink: "text-primary",
    alternativeMethodsBlockButton: "text-primary",
  },
}
