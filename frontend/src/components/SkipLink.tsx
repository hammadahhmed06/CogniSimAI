import React from "react"

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only fixed top-2 left-2 z-[100] bg-blue-600 text-white px-3 py-2 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  )
}

export default SkipLink
