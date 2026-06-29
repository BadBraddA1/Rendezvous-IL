import { Phone } from "lucide-react"
import type { DirectoryContactPhone } from "@/lib/directory-contacts"

type Props = {
  contacts: DirectoryContactPhone[]
  className?: string
}

export function DirectoryContactPhones({ contacts, className }: Props) {
  if (contacts.length === 0) return null

  return (
    <div className={className}>
      {contacts.map((contact, index) => (
        <p key={`${contact.member_id ?? "legacy"}-${contact.phone}-${index}`} className="flex items-start gap-2 text-sm">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 break-words">
            {contact.name ? (
              <>
                {contact.name}:{" "}
                <a
                  href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                  className="text-primary hover:underline"
                >
                  {contact.phone}
                </a>
              </>
            ) : (
              <a
                href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                className="text-primary hover:underline"
              >
                {contact.phone}
              </a>
            )}
          </span>
        </p>
      ))}
    </div>
  )
}
