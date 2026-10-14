import { useEffect, useRef, type ReactNode, type RefObject } from "react"
import { Box } from "@chakra-ui/react"
import backVideo from "@/assets/EOBack.mp4"

export default function FilmBackdrop({
  src = backVideo,
  dim = 0,
  loop = true,
  videoRef: videoRefProp,
  children,
}: {
  src?: string
  dim?: number
  loop?: boolean
  videoRef?: RefObject<HTMLVideoElement | null>
  children?: ReactNode
}) {
  const innerRef = useRef<HTMLVideoElement>(null)
  const videoRef = videoRefProp ?? innerRef

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    void video.play().catch(() => {})
  }, [videoRef, src])

  return (
    <Box minH="100vh" bg="#050505" position="relative" overflow="hidden" color="white">
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        loop={loop}
        playsInline
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none",
        }}
      />
      <Box
        position="absolute"
        inset={0}
        bg={`rgba(0,0,0,${dim})`}
        transition="background 1.6s ease"
        pointerEvents="none"
      />
      <Box position="relative" zIndex={1} minH="100vh">
        {children}
      </Box>
    </Box>
  )
}
