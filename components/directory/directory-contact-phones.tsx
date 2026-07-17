import { MessageSquare, Phone } from "lucide-react"
import type { DirectoryContactPhone } from "@/lib/directory-contacts"

type Props = {
  contacts: DirectoryContactPhone[]
  className?: string
}

function digitsOnly(phone: string) {
  return phone.replace(/[^\d+]/g, "")
}

export function DirectoryContactPhones({ contacts, className }: Props) {
  if (contacts.length === 0) return null

  return (
    <div className={className}>
      {contacts.map((contact, index) => {
        const digits = digitsOnly(contact.phone)
        return (
          <div
            key={`${contact.member_id ?? "legacy"}-${contact.phone}-${index}`}
            className="flex items-start gap-2 text-sm"
          >
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 space-y-0.5 break-words">
              {contact.name ? <p className="font-medium">{contact.name}</p> : null}
              <p className="text-muted-foreground">{contact.phone}</p>
              {digits ? (
                <p className="flex flex-wrap gap-3 pt-0.5">
                  <a href={`tel:${digits}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Phone className="h-3.5 w-3.5" />
                    Call
                  </a>
                  <a href={`sms:${digits}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Text
                  </a>
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
