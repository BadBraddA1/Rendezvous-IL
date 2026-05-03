"use client"

import { useEffect, useState, useRef } from "react"
import useSWR from "swr"
import { IceCream, Trophy, Eye, EyeOff } from "lucide-react"

type Challenge = {
  visible: boolean
  stephen: number
  brian: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function IceCreamChallenge({ adminMode = false }: { adminMode?: boolean }) {
  const { data, mutate } = useSWR<Challenge>(
    "/api/ice-cream-challenge",
    fetcher,
    { refreshInterval: 5000 }
  )

  const challenge: Challenge = data ?? { visible: false, stephen: 0, brian: 0 }

  // If not visible AND we're not in admin mode, render nothing.
  // (In admin mode we still show a hidden-state placeholder so you can edit.)
  if (!challenge.visible && !adminMode) return null

  const save = async (next: Challenge) => {
    // optimistic update
    mutate(next, false)
    await fetch("/api/ice-cream-challenge", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    })
    mutate()
  }

  const leader =
    challenge.stephen > challenge.brian
      ? "stephen"
      : challenge.brian > challenge.stephen
        ? "brian"
        : null

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl border backdrop-blur-sm p-6 ${
        challenge.visible
          ? "border-pink-400/30 bg-gradient-to-br from-pink-500/[0.10] via-white/[0.04] to-transparent"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-pink-500/15 blur-2xl" />
      <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-pink-500/15 p-2.5 border border-pink-400/20">
              <IceCream className="h-5 w-5 text-pink-300" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-pink-300/90">
                Ice Cream Challenge
              </p>
              <p className="text-sm text-white/50">Who can eat more this week?</p>
            </div>
          </div>

          {adminMode && (
            <button
              onClick={() => save({ ...challenge, visible: !challenge.visible })}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                challenge.visible
                  ? "border-green-400/40 bg-green-500/15 text-green-300 hover:bg-green-500/25"
                  : "border-white/20 bg-white/5 text-white/60 hover:bg-white/10"
              }`}
              aria-label={challenge.visible ? "Hide challenge" : "Show challenge"}
            >
              {challenge.visible ? (
                <>
                  <Eye className="h-3.5 w-3.5" /> Live
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" /> Hidden
                </>
              )}
            </button>
          )}
        </div>

        {!challenge.visible && adminMode && (
          <p className="mb-4 text-sm text-white/50 italic">
            Currently hidden from the TV. Tap "Hidden" to reveal once the first meal is over.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <PlayerCard
            name="Stephen Bradd"
            count={challenge.stephen}
            isLeader={leader === "stephen"}
            adminMode={adminMode}
            onChange={(n) => save({ ...challenge, stephen: n })}
          />
          <PlayerCard
            name="Brian Collins"
            count={challenge.brian}
            isLeader={leader === "brian"}
            adminMode={adminMode}
            onChange={(n) => save({ ...challenge, brian: n })}
          />
        </div>
      </div>
    </div>
  )
}

function PlayerCard({
  name,
  count,
  isLeader,
  adminMode,
  onChange,
}: {
  name: string
  count: number
  isLeader: boolean
  adminMode: boolean
  onChange: (n: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(count))
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep local input in sync if the source value changes while not editing
  useEffect(() => {
    if (!editing) setValue(String(count))
  }, [count, editing])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commit = () => {
    const n = Math.max(0, Math.floor(Number(value) || 0))
    setEditing(false)
    if (n !== count) onChange(n)
    setValue(String(n))
  }

  return (
    <div
      className={`relative rounded-2xl border p-5 text-center transition-colors ${
        isLeader
          ? "border-pink-400/50 bg-gradient-to-br from-pink-500/15 via-white/[0.04] to-transparent"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      {isLeader && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-pink-500/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-lg">
          <Trophy className="h-3 w-3" /> Leader
        </div>
      )}

      <p className="text-sm uppercase tracking-[0.2em] font-bold text-white/60 mb-3 truncate">
        {name}
      </p>

      {editing ? (
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") {
              setValue(String(count))
              setEditing(false)
            }
          }}
          className="w-full bg-transparent text-center text-6xl font-bold tabular-nums outline-none border-b-2 border-pink-400/60 focus:border-pink-400"
          aria-label={`${name} ice cream count`}
        />
      ) : (
        <button
          type="button"
          disabled={!adminMode}
          onClick={() => adminMode && setEditing(true)}
          className={`block w-full text-6xl font-bold tabular-nums leading-none ${
            adminMode
              ? "cursor-pointer rounded-lg px-2 py-1 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-pink-400/60"
              : "cursor-default"
          } ${isLeader ? "text-pink-300" : "text-white"}`}
          aria-label={adminMode ? `Edit ${name} count` : `${name} count`}
        >
          {count}
        </button>
      )}

      <p className="mt-2 text-xs text-white/40 uppercase tracking-wider">
        {count === 1 ? "scoop" : "scoops"}
      </p>
    </div>
  )
}
