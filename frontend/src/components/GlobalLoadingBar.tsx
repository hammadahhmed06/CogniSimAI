import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

// Simple top loading bar that appears when queries or mutations are in-flight
export function GlobalLoadingBar() {
  const isFetching = useIsFetching()
  const isMutating = useIsMutating()
  const active = isFetching + isMutating > 0
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (active) {
      setVisible(true)
    } else {
      // Delay hide slightly for smoother UX
      const t = setTimeout(() => setVisible(false), 250)
      return () => clearTimeout(t)
    }
  }, [active])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-0">
      <div
        className={`h-[3px] w-full origin-left transform-gpu bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{
          animation: visible ? 'loading-bar 1.15s ease-in-out infinite' : undefined,
        }}
      />
      <style>{`
      @keyframes loading-bar {
        0% { transform: scaleX(.05); }
        50% { transform: scaleX(.6); }
        100% { transform: scaleX(1); }
      }
      `}</style>
    </div>
  )
}
