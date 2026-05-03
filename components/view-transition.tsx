"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

// 10 distinct entrance animations. Each one defines its own keyframes
// and the wrapper class that activates it.
const TRANSITIONS = [
  "vt-fade-blur",        // Soft fade with blur clearing
  "vt-zoom-in",          // Punchy zoom-in from 80%
  "vt-slide-up",         // Slides up from bottom with overshoot
  "vt-slide-right",      // Sweeps in from the left
  "vt-slide-left",       // Sweeps in from the right
  "vt-flip-x",           // 3D flip from the top
  "vt-flip-y",           // 3D flip from the side
  "vt-iris",             // Circular iris reveal
  "vt-wipe-diagonal",    // Diagonal wipe reveal
  "vt-glitch",           // Glitchy split-RGB entrance
] as const

type TransitionName = typeof TRANSITIONS[number]

function pickRandom(exclude?: TransitionName): TransitionName {
  // Avoid repeating the same one twice in a row
  const pool = exclude ? TRANSITIONS.filter(t => t !== exclude) : TRANSITIONS
  return pool[Math.floor(Math.random() * pool.length)]
}

export function ViewTransition({
  viewKey,
  children,
  className = "",
}: {
  viewKey: string
  children: ReactNode
  className?: string
}) {
  const [transition, setTransition] = useState<TransitionName>(() => pickRandom())
  const lastRef = useRef<TransitionName>(transition)
  const lastViewRef = useRef<string>(viewKey)

  useEffect(() => {
    if (lastViewRef.current !== viewKey) {
      const next = pickRandom(lastRef.current)
      lastRef.current = next
      lastViewRef.current = viewKey
      setTransition(next)
    }
  }, [viewKey])

  return (
    <>
      <style jsx global>{`
        /* ---------- Fade + blur ---------- */
        @keyframes vt-fade-blur {
          0%   { opacity: 0; filter: blur(24px); transform: scale(1.02); }
          100% { opacity: 1; filter: blur(0);    transform: scale(1);    }
        }
        .vt-fade-blur { animation: vt-fade-blur 700ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* ---------- Zoom in ---------- */
        @keyframes vt-zoom-in {
          0%   { opacity: 0; transform: scale(0.82); filter: blur(8px); }
          60%  { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: scale(1);    filter: blur(0); }
        }
        .vt-zoom-in { animation: vt-zoom-in 650ms cubic-bezier(0.34, 1.56, 0.64, 1) both; }

        /* ---------- Slide up with overshoot ---------- */
        @keyframes vt-slide-up {
          0%   { opacity: 0; transform: translateY(60px); }
          70%  { opacity: 1; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0);    }
        }
        .vt-slide-up { animation: vt-slide-up 750ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* ---------- Slide right (in from left) ---------- */
        @keyframes vt-slide-right {
          0%   { opacity: 0; transform: translateX(-80px); filter: blur(6px); }
          100% { opacity: 1; transform: translateX(0);     filter: blur(0); }
        }
        .vt-slide-right { animation: vt-slide-right 650ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* ---------- Slide left (in from right) ---------- */
        @keyframes vt-slide-left {
          0%   { opacity: 0; transform: translateX(80px); filter: blur(6px); }
          100% { opacity: 1; transform: translateX(0);    filter: blur(0); }
        }
        .vt-slide-left { animation: vt-slide-left 650ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* ---------- 3D flip from top ---------- */
        @keyframes vt-flip-x {
          0%   { opacity: 0; transform: perspective(1200px) rotateX(-65deg); transform-origin: top center; }
          100% { opacity: 1; transform: perspective(1200px) rotateX(0);      transform-origin: top center; }
        }
        .vt-flip-x { animation: vt-flip-x 800ms cubic-bezier(0.22, 1, 0.36, 1) both; transform-style: preserve-3d; }

        /* ---------- 3D flip from side ---------- */
        @keyframes vt-flip-y {
          0%   { opacity: 0; transform: perspective(1400px) rotateY(45deg) translateX(80px); }
          100% { opacity: 1; transform: perspective(1400px) rotateY(0)     translateX(0);    }
        }
        .vt-flip-y { animation: vt-flip-y 750ms cubic-bezier(0.22, 1, 0.36, 1) both; transform-style: preserve-3d; }

        /* ---------- Iris reveal ---------- */
        @keyframes vt-iris {
          0%   { opacity: 0; clip-path: circle(0% at 50% 50%); }
          100% { opacity: 1; clip-path: circle(120% at 50% 50%); }
        }
        .vt-iris { animation: vt-iris 800ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* ---------- Diagonal wipe ---------- */
        @keyframes vt-wipe-diagonal {
          0%   { opacity: 0; clip-path: polygon(0 0, 0 0, 0 0, 0 0); }
          100% { opacity: 1; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
        }
        .vt-wipe-diagonal { animation: vt-wipe-diagonal 800ms cubic-bezier(0.65, 0, 0.35, 1) both; }

        /* ---------- Glitch (split-RGB) ---------- */
        @keyframes vt-glitch {
          0%   { opacity: 0; transform: translateX(-8px); filter: hue-rotate(45deg) saturate(2); }
          15%  { opacity: 0.6; transform: translateX(10px); filter: hue-rotate(-25deg) saturate(2.5); }
          30%  { opacity: 0.7; transform: translateX(-6px) skewX(2deg); }
          45%  { opacity: 0.85; transform: translateX(4px) skewX(-1deg); filter: none; }
          60%  { opacity: 0.95; transform: translateX(-2px); }
          100% { opacity: 1; transform: translateX(0); filter: none; }
        }
        .vt-glitch { animation: vt-glitch 700ms steps(12, end) both; }
      `}</style>
      <div
        key={`${viewKey}-${transition}`}
        className={`${transition} ${className}`}
      >
        {children}
      </div>
    </>
  )
}
