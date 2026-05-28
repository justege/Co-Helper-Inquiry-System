import { useEffect, useState } from "react"

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

type UseTypewriterOptions = {
  phrases: string[]
  typeSpeed?: number
  deleteSpeed?: number
  pauseMs?: number
  loop?: boolean
}

export function useTypewriter({
  phrases,
  typeSpeed = 42,
  deleteSpeed = 24,
  pauseMs = 2200,
  loop = true,
}: UseTypewriterOptions): string {
  const [text, setText] = useState(() =>
    prefersReducedMotion() ? (phrases[0] ?? "") : "",
  )
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (phrases.length === 0 || prefersReducedMotion()) return

    const current = phrases[phraseIndex] ?? ""
    const atEnd = !isDeleting && text === current
    const atStart = isDeleting && text === ""

    let delay = isDeleting ? deleteSpeed : typeSpeed
    if (atEnd) delay = pauseMs
    if (atStart && isDeleting) delay = 400

    const timer = window.setTimeout(() => {
      if (atEnd) {
        setIsDeleting(true)
        return
      }

      if (atStart) {
        setIsDeleting(false)
        const next = phraseIndex + 1
        if (next >= phrases.length) {
          if (loop) setPhraseIndex(0)
        } else {
          setPhraseIndex(next)
        }
        return
      }

      if (isDeleting) {
        setText(current.slice(0, text.length - 1))
      } else {
        setText(current.slice(0, text.length + 1))
      }
    }, delay)

    return () => window.clearTimeout(timer)
  }, [text, isDeleting, phraseIndex, phrases, typeSpeed, deleteSpeed, pauseMs, loop])

  return text
}
