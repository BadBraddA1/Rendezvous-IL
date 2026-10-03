"use client"

import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react"
import { chatConfig } from "@/lib/chat-config"
import type { ChatPendingAttachment } from "@/lib/chat-kit-types"

type ChatComposerProps = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  pending?: ChatPendingAttachment[]
  onRemovePending?: (id: string) => void
  onPickFiles?: (files: FileList) => void
  disabled?: boolean
  placeholder?: string
}

/**
 * System Six decision 6: grows to N lines then scrolls; Enter sends;
 * Shift+Enter breaks; attachment previews above the text, never inside.
 */
export function ChatComposer({
  value,
  onChange,
  onSend,
  pending = [],
  onRemovePending,
  onPickFiles,
  disabled = false,
  placeholder = chatConfig.copy.composerPlaceholder,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const canSend = Boolean(value.trim() || pending.length > 0) && !disabled

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "0px"
    const max =
      parseFloat(getComputedStyle(el).lineHeight || "20") * chatConfig.composerMaxLines + 20
    el.style.height = `${Math.min(el.scrollHeight, max)}px`
  }, [value])

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      if (canSend) onSend()
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files && onPickFiles) onPickFiles(event.target.files)
    event.target.value = ""
  }

  return (
    <div
      className="bc-chat__composer"
      style={{ ["--chat-composer-max-lines" as string]: String(chatConfig.composerMaxLines) }}
    >
      {pending.length > 0 ? (
        <div className="bc-chat__pending">
          {pending.map((item) => (
            <div key={item.id} className="bc-chat__pending-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} alt={item.name ?? "Attachment preview"} />
              {onRemovePending ? (
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() => onRemovePending(item.id)}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="bc-chat__row">
        {onPickFiles ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={onFileChange}
            />
            <button
              type="button"
              className="bc-chat__attach"
              aria-label={chatConfig.copy.attachAria}
              disabled={disabled}
              onClick={() => fileRef.current?.click()}
            >
              +
            </button>
          </>
        ) : null}

        <textarea
          ref={textareaRef}
          className="bc-chat__input"
          rows={1}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />

        <button
          type="button"
          className="bc-chat__send"
          data-ready={canSend ? "true" : "false"}
          aria-label={chatConfig.copy.sendAria}
          disabled={!canSend}
          onClick={onSend}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
