import { Box, Text } from "@chakra-ui/react"
import { useInView } from "@/hooks/useInView"
import { useTypewriter } from "@/hooks/useTypewriter"
import { GREEN, INK, MUTED } from "@/components/marketing/tokens"
import type { ReactNode } from "react"

// ─── Scroll reveal wrapper ────────────────────────────────────────────────────
export function ScrollReveal({
  children,
  delay = 0,
  y = 24,
}: {
  children: ReactNode
  delay?: number
  y?: number
}) {
  const { ref, inView } = useInView({ threshold: 0.12 })

  return (
    <Box
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 0.65s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      }}
    >
      {children}
    </Box>
  )
}

// ─── Text that shifts color when scrolled into view ───────────────────────────
export function ScrollColorText({
  children,
  from = MUTED,
  to = GREEN,
  as = "span",
  ...rest
}: {
  children: ReactNode
  from?: string
  to?: string
  as?: "span" | "p" | "div"
} & Record<string, unknown>) {
  const { ref, inView } = useInView({ threshold: 0.35 })

  return (
    <Box
      as={as}
      ref={ref}
      color={inView ? to : from}
      transition="color 0.9s cubic-bezier(0.22, 1, 0.36, 1)"
      {...rest}
    >
      {children}
    </Box>
  )
}

// ─── Split headline with animated accent line ─────────────────────────────────
export function SplitHeadline({
  primary,
  accent,
  accentFrom = MUTED,
  accentTo = GREEN,
  size = "inherit",
}: {
  primary: string
  accent: string
  accentFrom?: string
  accentTo?: string
  size?: string | object
}) {
  const { ref, inView } = useInView({ threshold: 0.3 })

  return (
    <Box ref={ref}>
      <Text as="span" display="block">{primary}</Text>
      <Text
        as="span"
        display="block"
        fontSize={size}
        fontWeight="600"
        color={inView ? accentTo : accentFrom}
        transition="color 0.85s cubic-bezier(0.22, 1, 0.36, 1)"
      >
        {accent}
      </Text>
    </Box>
  )
}

// ─── Terminal-style typewriter block ──────────────────────────────────────────
const TERMINAL_PHRASES = [
  "managedSoftwareDelivery();",
  "await pm.assign(brief);",
  "quote.fixed = true;",
  "ship(product, { meetings: false });",
  "// no coordination tax",
]

export function CodeTypewriter({
  label = "delivery.engine",
  phrases = TERMINAL_PHRASES,
}: {
  label?: string
  phrases?: string[]
}) {
  const typed = useTypewriter({ phrases, typeSpeed: 38, deleteSpeed: 22, pauseMs: 2400 })
  const { ref, inView } = useInView({ threshold: 0.2 })

  return (
    <Box
      ref={ref}
      mt={6}
      borderRadius="10px"
      overflow="hidden"
      border="1px solid rgba(14,27,23,0.1)"
      bg="#0E1B17"
      boxShadow="0 12px 40px rgba(14,27,23,0.12)"
      opacity={inView ? 1 : 0}
      transform={inView ? "translateY(0)" : "translateY(16px)"}
      transition="opacity 0.6s ease, transform 0.6s ease"
    >
      <Box
        px={4} py={2.5}
        borderBottom="1px solid rgba(255,255,255,0.06)"
        bg="rgba(0,0,0,0.25)"
        display="flex"
        alignItems="center"
        gap={2}
      >
        <Box w="8px" h="8px" borderRadius="50%" bg="#FF5F57" />
        <Box w="8px" h="8px" borderRadius="50%" bg="#FEBC2E" />
        <Box w="8px" h="8px" borderRadius="50%" bg="#28C840" />
        <Text
          fontSize="0.7rem"
          color="rgba(255,255,255,0.35)"
          fontFamily="'JetBrains Mono', monospace"
          ml={2}
        >
          {label}
        </Text>
      </Box>
      <Box px={5} py={4} minH="52px">
        <Text
          fontSize={{ base: "0.8125rem", md: "0.875rem" }}
          color="#86efac"
          fontFamily="'JetBrains Mono', monospace"
          lineHeight="1.6"
          whiteSpace="pre-wrap"
        >
          <Text as="span" color="rgba(255,255,255,0.25)">{"> "}</Text>
          {typed}
          <Box
            as="span"
            display="inline-block"
            w="2px"
            h="1em"
            bg="#86efac"
            ml="1px"
            verticalAlign="text-bottom"
            className="typewriter-cursor"
          />
        </Text>
      </Box>
    </Box>
  )
}

// ─── Animated typewriter subline (plain text, no terminal chrome) ─────────────
export function TypewriterSubline({
  phrases,
  color = MUTED,
  fontSize,
}: {
  phrases: string[]
  color?: string
  fontSize?: string | object
}) {
  const typed = useTypewriter({ phrases, typeSpeed: 36, deleteSpeed: 20, pauseMs: 2600 })

  return (
    <Text
      as="span"
      display="block"
      color={color}
      fontSize={fontSize}
      fontWeight="600"
      minH="1.2em"
      fontFamily="'JetBrains Mono', monospace"
    >
      {typed}
      <Box
        as="span"
        display="inline-block"
        w="2px"
        h="0.85em"
        bg={GREEN}
        ml="2px"
        verticalAlign="text-bottom"
        className="typewriter-cursor"
      />
    </Text>
  )
}

// ─── Matrix column header with scroll highlight ───────────────────────────────
export function MatrixColHeader({ label, index }: { label: string; index: number }) {
  const { ref, inView } = useInView({ threshold: 0.25 })

  return (
    <Box ref={ref} textAlign="center">
      <Text
        fontSize="0.7rem"
        fontWeight="700"
        letterSpacing="0.06em"
        textTransform="uppercase"
        color={inView ? "#86efac" : "rgba(255,255,255,0.35)"}
        transition={`color 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${index * 60}ms`}
      >
        {label}
      </Text>
    </Box>
  )
}

// ─── Animated check icon (dark matrix) ────────────────────────────────────────
export function AnimatedCheckIcon({
  pass,
  delay = 0,
  light = false,
}: {
  pass: boolean
  delay?: number
  light?: boolean
}) {
  const { ref, inView } = useInView({ threshold: 0.1, rootMargin: "0px 0px -5% 0px" })

  const scale = inView ? 1 : 0.4
  const opacity = inView ? 1 : 0

  if (light) {
    if (pass) {
      return (
        <Box
          ref={ref}
          style={{
            transform: `scale(${scale})`,
            opacity,
            transition: `transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 0.35s ease ${delay}ms`,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill={`${GREEN}22`} stroke={`${GREEN}80`} strokeWidth="1" />
            <path d="M6.5 10L8.5 12L13.5 7.5" stroke={GREEN} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Box>
      )
    }
    return (
      <Box
        ref={ref}
        style={{
          transform: `scale(${scale})`,
          opacity,
          transition: `transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 0.35s ease ${delay}ms`,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" fill="#F5F7FA" stroke="#E5E7EB" strokeWidth="1" />
          <path d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Box>
    )
  }

  if (pass) {
    return (
      <Box
        ref={ref}
        style={{
          transform: `scale(${scale})`,
          opacity,
          transition: `transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 0.35s ease ${delay}ms`,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" fill="rgba(134,239,172,0.15)" stroke="rgba(134,239,172,0.55)" strokeWidth="1" />
          <path d="M6.5 10L8.5 12L13.5 7.5" stroke="#86efac" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Box>
    )
  }

  return (
    <Box
      ref={ref}
      style={{
        transform: `scale(${scale})`,
        opacity,
        transition: `transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms, opacity 0.35s ease ${delay}ms`,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <path d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </Box>
  )
}

// ─── Matrix row with scroll-reveal text colors ────────────────────────────────
export function MatrixRow({
  row,
  rowIndex,
}: {
  row: {
    name: string
    desc: string
    highlight?: boolean
    scores: boolean[]
  }
  rowIndex: number
}) {
  const { ref, inView } = useInView({ threshold: 0.08, rootMargin: "0px 0px -10% 0px" })

  return (
    <Box
      ref={ref}
      borderRadius="12px"
      bg={row.highlight ? "#86efac" : "rgba(255,255,255,0.04)"}
      border={row.highlight ? "none" : "1px solid rgba(255,255,255,0.06)"}
      overflow="hidden"
      transition="all 0.2s"
      _hover={row.highlight ? undefined : { bg: "rgba(255,255,255,0.06)" }}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateX(0)" : "translateX(-12px)",
        transition: `opacity 0.55s ease ${rowIndex * 80}ms, transform 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${rowIndex * 80}ms`,
      }}
    >
      <Box
        display="grid"
        gridTemplateColumns="240px repeat(8, 1fr)"
        alignItems="center"
        px={5}
        py={5}
      >
        <Box pr={6}>
          <Text
            fontSize="0.9375rem"
            fontWeight="700"
            mb={1}
            color={row.highlight ? INK : inView ? "white" : "rgba(255,255,255,0.55)"}
            fontFamily="var(--font-heading)"
            letterSpacing="-0.01em"
            transition="color 0.6s ease"
          >
            {row.name}
          </Text>
          <Text
            fontSize="0.8rem"
            lineHeight="1.55"
            color={
              row.highlight
                ? "rgba(14,27,23,0.6)"
                : inView
                  ? "rgba(255,255,255,0.55)"
                  : "rgba(255,255,255,0.25)"
            }
            transition="color 0.6s ease"
          >
            {row.desc}
          </Text>
        </Box>

        {row.scores.map((pass, ci) => (
          <Box key={ci} display="flex" justifyContent="center" alignItems="center">
            <AnimatedCheckIcon
              pass={pass}
              light={row.highlight}
              delay={rowIndex * 80 + ci * 55}
            />
          </Box>
        ))}
      </Box>
    </Box>
  )
}
