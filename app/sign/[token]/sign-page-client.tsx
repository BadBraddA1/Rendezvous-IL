"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, Clock, Loader2, PartyPopper } from "lucide-react"
import { SignatureField } from "@/components/registration/signature-field"
import { AGREEMENT_AFFIRMATION, AGREEMENT_INTRO, AGREEMENT_ITEMS } from "@/lib/agreement-content"

type OtherSigner = {
  name: string
  signed: boolean
}

type Props = {
  token: string
  parentName: string
  familyLastName: string
  initialSignedName: string | null
  initialSignedAt: string | null
  initialOthers: OtherSigner[]
}

export function SignPageClient({
  token,
  parentName,
  familyLastName,
  initialSignedName,
  initialSignedAt,
  initialOthers,
}: Props) {
  const [signedName, setSignedName] = useState(initialSignedName ?? "")
  const [hasSigned, setHasSigned] = useState(Boolean(initialSignedAt))
  const [others, setOthers] = useState<OtherSigner[]>(initialOthers)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allSigned = hasSigned && others.every((o) => o.signed)

  const submitSignature = async () => {
    if (!signedName.trim()) {
      setError("Please type your full name to sign.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedName: signedName.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.")
        return
      }
      setHasSigned(true)
      if (Array.isArray(data.others)) {
        setOthers(data.others)
      }
    } catch {
      setError("Something went wrong. Please check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="mb-3 text-balance text-3xl font-bold tracking-tight md:text-4xl">
          Rendezvous 2027 Registration Agreement
        </h1>
        <p className="text-balance text-muted-foreground">
          {familyLastName} Family — signature for <strong>{parentName}</strong>
        </p>
      </div>

      {allSigned ? (
        <Card className="border-success/30 bg-surface-highlight">
          <CardHeader className="text-center">
            <PartyPopper className="mx-auto mb-2 h-10 w-10 text-success" aria-hidden="true" />
            <CardTitle>All signatures complete!</CardTitle>
            <CardDescription>
              Everyone has signed. Your family is ready to check in at Rendezvous 2027 — see you
              there!
            </CardDescription>
          </CardHeader>
        </Card>
      ) : hasSigned ? (
        <Card className="border-primary/20 bg-surface-highlight">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-success" aria-hidden="true" />
            <CardTitle>Thank you, you're all set</CardTitle>
            <CardDescription>Your signature has been recorded.</CardDescription>
          </CardHeader>
          {others.length > 0 && (
            <CardContent>
              <ul className="space-y-2 text-sm">
                {others.map((other) => (
                  <li key={other.name} className="flex items-center gap-2">
                    {other.signed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span>
                      {other.signed ? (
                        <>{other.name} has signed</>
                      ) : (
                        <>
                          Waiting for <strong>{other.name}</strong> to sign — they received their
                          own email link
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{AGREEMENT_INTRO}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="ml-4 list-disc space-y-2 text-sm text-muted-foreground">
                {AGREEMENT_ITEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
                {AGREEMENT_AFFIRMATION}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Your signature</CardTitle>
              <CardDescription>
                By signing below, you ({parentName}) confirm that you have read and agree to the
                statements above.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SignatureField
                id="emailSignature"
                label={`Signature for ${parentName}`}
                value={signedName}
                onChange={setSignedName}
                required
              />
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button onClick={submitSignature} disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Recording signature...
                  </>
                ) : (
                  "Sign agreement"
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
