import { useEffect, useRef, useState } from "react"
import { Flex, Text } from "@chakra-ui/react"
import { useNavigate } from "react-router-dom"
import FilmBackdrop from "@/components/landing/FilmBackdrop"

const REVEAL_AT = 5
const HOLD_AT = 15

function Choice({ onChoose, children }: { onChoose: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onChoose}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        margin: 0,
        cursor: "pointer",
        font: "inherit",
        color: "inherit",
        textDecoration: "none",
        pointerEvents: "auto",
        position: "relative",
        zIndex: 2,
      }}
    >
      <Text
        as="span"
        display="inline-block"
        color="white"
        fontSize={{ base: "1.05rem", md: "1.25rem" }}
        fontWeight="500"
        letterSpacing="0.16em"
        textTransform="uppercase"
        borderBottom="1px solid rgba(255,255,255,0.55)"
        pb="6px"
        transition="border-color 0.4s ease, letter-spacing 0.4s ease"
        _hover={{ borderColor: "white", letterSpacing: "0.2em" }}
      >
        {children}
      </Text>
    </button>
  )
}

export default function LandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const leavingRef = useRef(false)
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [departing, setDeparting] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setVisible(true)
      return
    }

    const video = videoRef.current
    const reveal = () => setVisible(true)
    const onTime = () => {
      if (!video) return
      if (video.currentTime >= REVEAL_AT) reveal()
      if (!leavingRef.current && video.currentTime >= HOLD_AT) {
        video.pause()
        if (video.currentTime > HOLD_AT) video.currentTime = HOLD_AT
      }
    }
    const fallback = window.setTimeout(reveal, 8000)
    video?.addEventListener("timeupdate", onTime)
    video?.addEventListener("ended", reveal)
    video?.addEventListener("error", reveal)
    return () => {
      window.clearTimeout(fallback)
      video?.removeEventListener("timeupdate", onTime)
      video?.removeEventListener("ended", reveal)
      video?.removeEventListener("error", reveal)
    }
  }, [])

  function depart(to: string) {
    if (leavingRef.current) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const video = videoRef.current
    if (reduce || !video) {
      navigate(to)
      return
    }

    leavingRef.current = true
    setDeparting(true)

    let finished = false
    let timer = 0
    const finish = () => {
      if (finished) return
      finished = true
      window.clearTimeout(timer)
      navigate(to)
    }

    const playOut = () => {
      if (video.currentTime < HOLD_AT) {
        const cap = Number.isFinite(video.duration) ? video.duration : HOLD_AT
        video.currentTime = Math.min(HOLD_AT, cap)
      }
      video.addEventListener("ended", finish, { once: true })
      video.addEventListener("error", finish, { once: true })
      const remaining = Number.isFinite(video.duration)
        ? Math.max(0, video.duration - video.currentTime)
        : 20
      if (remaining < 0.05 || video.ended) {
        finish()
        return
      }
      timer = window.setTimeout(finish, (remaining + 1.5) * 1000)
      void video.play().catch(() => finish())
    }

    if (video.readyState >= 1) playOut()
    else {
      video.addEventListener("loadedmetadata", playOut, { once: true })
      video.addEventListener("error", finish, { once: true })
    }
  }

  const shown = visible && !departing

  return (
    <FilmBackdrop videoRef={videoRef} loop={false} dim={shown ? 0.38 : 0}>
      <Flex
        minH="100vh"
        align="center"
        justify="center"
        px={6}
        opacity={shown ? 1 : 0}
        transform={shown ? "translateY(0)" : "translateY(16px)"}
        transition="opacity 1.8s ease, transform 1.8s ease"
        pointerEvents={shown ? "auto" : "none"}
        aria-hidden={!shown}
        data-choices={shown ? "visible" : departing ? "departing" : "hidden"}
      >
        <Flex direction="column" align="center" gap={{ base: 8, md: 10 }}>
          <Text
            fontFamily="'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
            fontWeight="500"
            fontSize={{ base: "1.75rem", md: "2.25rem" }}
            letterSpacing="-0.04em"
            lineHeight="1"
          >
            {"<EO/>"}
          </Text>
          <Flex
            align="center"
            justify="center"
            gap={{ base: 4, md: 7 }}
            direction={{ base: "column", sm: "row" }}
          >
            <Choice onChoose={() => depart("/login")}>Log in</Choice>
            <Text
              color="rgba(255,255,255,0.55)"
              fontSize="0.75rem"
              letterSpacing="0.22em"
              textTransform="uppercase"
            >
              or
            </Text>
            <Choice onChoose={() => depart("/request")}>New project request</Choice>
          </Flex>
        </Flex>
      </Flex>
    </FilmBackdrop>
  )
}
