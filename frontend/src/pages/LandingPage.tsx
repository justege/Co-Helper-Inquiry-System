import { useEffect, useRef, useState } from "react"
import { Flex, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import FilmBackdrop from "@/components/landing/FilmBackdrop"

function Choice({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} style={{ textDecoration: "none", pointerEvents: "auto", position: "relative", zIndex: 2 }}>
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
    </Link>
  )
}

export default function LandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setVisible(true)
      return
    }

    const video = videoRef.current
    const reveal = () => setVisible(true)
    const onTime = () => {
      if (video && video.currentTime >= 5) reveal()
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

  return (
    <FilmBackdrop videoRef={videoRef} dim={visible ? 0.38 : 0}>
      <Flex
        minH="100vh"
        align="center"
        justify="center"
        px={6}
        opacity={visible ? 1 : 0}
        transform={visible ? "translateY(0)" : "translateY(16px)"}
        transition="opacity 1.8s ease, transform 1.8s ease"
        pointerEvents={visible ? "auto" : "none"}
        aria-hidden={!visible}
        data-choices={visible ? "visible" : "hidden"}
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
            <Choice to="/login">Log in</Choice>
            <Text
              color="rgba(255,255,255,0.55)"
              fontSize="0.75rem"
              letterSpacing="0.22em"
              textTransform="uppercase"
            >
              or
            </Text>
            <Choice to="/request">New project request</Choice>
          </Flex>
        </Flex>
      </Flex>
    </FilmBackdrop>
  )
}
