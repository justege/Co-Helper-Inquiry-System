import { Box, Button, Grid, Spinner, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { LuArrowRight } from "react-icons/lu"

// ── Design tokens — Co-Helper brand DNA ──────────────────────────────────────

export const APP_INK = "#0E1B17"          // Trust Green near-black
export const APP_MUTED = "#6B7280"
export const APP_LABEL = "#8A96A8"
export const APP_BORDER = "#E5E7EB"
export const APP_SURFACE = "#FFFFFF"
export const APP_BG_SUBTLE = "#F5F7FA"
export const APP_ACCENT = "#0F6E56"       // Trust Green
export const APP_AMBER = "#D8FF86"        // Action Lime — CTA accents

export const APP_CARD = {
  bg: APP_SURFACE,
  border: `1px solid ${APP_BORDER}`,
  borderRadius: "12px",
  overflow: "hidden" as const,
}

export const APP_INPUT_STYLE = {
  variant: "outline" as const,
  size: "md" as const,
  bg: APP_SURFACE,
  borderColor: APP_BORDER,
  borderRadius: "8px",
  fontSize: "0.875rem",
  color: APP_INK,
  _focusVisible: {
    borderColor: APP_ACCENT,
    boxShadow: "0 0 0 3px rgba(15,110,86,0.12)",
  },
  _placeholder: { color: APP_LABEL },
}

export const APP_BTN_PRIMARY = {
  bg: APP_ACCENT,
  color: "white",
  fontWeight: "600" as const,
  fontSize: "0.875rem",
  borderRadius: "8px",
  _hover: { bg: "#0a5240" },
}

export const APP_BTN_GHOST = {
  variant: "ghost" as const,
  fontWeight: "500" as const,
  fontSize: "0.875rem",
  borderRadius: "8px",
  color: APP_MUTED,
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function AppCard({
  label,
  children,
  action,
}: {
  label: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <Box {...APP_CARD}>
      <Box
        px={{ base: 4, md: 5 }} py={3}
        borderBottom={`1px solid ${APP_BORDER}`}
        display="flex" alignItems="center" justifyContent="space-between" gap={3} flexWrap="wrap"
        bg={APP_BG_SUBTLE}
      >
        <Text fontSize="0.6875rem" fontWeight="600" color={APP_LABEL} letterSpacing="0.06em" textTransform="uppercase">
          {label}
        </Text>
        {action}
      </Box>
      <Box p={{ base: 4, md: 5 }}>{children}</Box>
    </Box>
  )
}

export function AppRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      display="grid"
      gridTemplateColumns={{ base: "1fr", sm: "120px 1fr" }}
      gap={{ base: 0.5, sm: 3 }}
      alignItems={{ base: "start", sm: "baseline" }}
      py={1.5}
      borderBottom={`1px solid ${APP_BORDER}`}
      _last={{ borderBottom: "none" }}
    >
      <Text fontSize="0.8125rem" color={APP_LABEL} fontWeight="500">{label}</Text>
      <Text color={APP_INK} fontWeight="500" fontSize="0.875rem">{value}</Text>
    </Box>
  )
}

export function AppMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Text fontSize="0.6875rem" color={APP_LABEL} fontWeight="500" letterSpacing="0.04em" textTransform="uppercase">
        {label}
      </Text>
      <Text fontSize="0.875rem" fontWeight="600" color={APP_INK} mt={1}>{value}</Text>
    </Box>
  )
}

export function AppStatusText({ status, label }: { status?: string; label?: string }) {
  return (
    <Text fontSize="0.8125rem" fontWeight="500" color={APP_INK}>
      {label ?? formatStatusLabel(status ?? "")}
    </Text>
  )
}

export function AppFilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      flexShrink={0}
      px={3}
      py={1.5}
      borderRadius="6px"
      fontSize="0.8125rem"
      fontWeight={active ? "600" : "500"}
      color={active ? APP_SURFACE : APP_MUTED}
      bg={active ? APP_ACCENT : APP_SURFACE}
      border={`1px solid ${active ? APP_ACCENT : APP_BORDER}`}
      cursor="pointer"
      transition="all 0.1s"
      _hover={{ borderColor: APP_ACCENT, color: active ? APP_SURFACE : APP_INK, bg: active ? APP_ACCENT : "#F5FBF8" }}
      whiteSpace="nowrap"
    >
      {children}
    </Box>
  )
}

export function AppStatCard({
  label,
  value,
  hint,
  active,
  onClick,
}: {
  label: string
  value: string | number
  hint?: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <Box
      {...APP_CARD}
      p={{ base: 4, md: 5 }}
      cursor={onClick ? "pointer" : "default"}
      onClick={onClick}
      border={active ? `1.5px solid ${APP_ACCENT}` : `1px solid ${APP_BORDER}`}
      bg={active ? APP_BG_SUBTLE : APP_SURFACE}
      transition="border-color 0.12s"
      _hover={onClick ? { borderColor: APP_ACCENT } : undefined}
    >
      <Text fontSize="0.6875rem" fontWeight="500" color={APP_LABEL} textTransform="uppercase" letterSpacing="0.05em">
        {label}
      </Text>
      <Text fontSize={{ base: "1.5rem", md: "1.75rem" }} fontWeight="700" color={APP_INK} letterSpacing="-0.03em" lineHeight="1" mt={2}>
        {value}
      </Text>
      {hint && <Text fontSize="0.75rem" color={APP_LABEL} mt={2}>{hint}</Text>}
    </Box>
  )
}

export function AppLoadingRow({ label = "Loading…" }: { label?: string }) {
  return (
    <Box px={5} py={8} display="flex" alignItems="center" gap={2}>
      <Spinner size="sm" color="gray.500" />
      <Text fontSize="sm" color={APP_MUTED}>{label}</Text>
    </Box>
  )
}

export function AppEmptyState({ message }: { message: string }) {
  return (
    <Box px={5} py={10} textAlign="center">
      <Text fontSize="0.875rem" color={APP_MUTED}>{message}</Text>
    </Box>
  )
}

export function AppListShell({ children }: { children: React.ReactNode }) {
  return <Box {...APP_CARD} overflow="hidden">{children}</Box>
}

export function AppListRow({
  href,
  isLast,
  children,
}: {
  href: string
  isLast?: boolean
  children: React.ReactNode
}) {
  return (
    <Link to={href} style={{ textDecoration: "none", display: "block" }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={3}
        px={5}
        py={4}
        borderBottom={isLast ? "none" : `1px solid ${APP_BORDER}`}
        bg={APP_SURFACE}
        transition="background 0.1s"
        _hover={{ bg: APP_BG_SUBTLE }}
      >
        {children}
        <Box color={APP_LABEL} flexShrink={0}>
          <LuArrowRight size={14} />
        </Box>
      </Box>
    </Link>
  )
}

export function AppPanel({ children }: { children: React.ReactNode }) {
  return <Box {...APP_CARD} p={{ base: 4, md: 5 }}>{children}</Box>
}

export function AppTableHeader({
  columns,
  templateColumns,
}: {
  columns: string[]
  templateColumns: string
}) {
  return (
    <Grid
      templateColumns={templateColumns}
      gap={3}
      px={5}
      py={3}
      borderBottom={`1px solid ${APP_BORDER}`}
      bg={APP_BG_SUBTLE}
      display={{ base: "none", lg: "grid" }}
    >
      {columns.map((h) => (
        <Text key={h} fontSize="0.625rem" fontWeight="600" color={APP_LABEL} textTransform="uppercase" letterSpacing="0.06em">
          {h}
        </Text>
      ))}
    </Grid>
  )
}

export function AppErrorPanel({ message }: { message: string }) {
  return (
    <Box {...APP_CARD} p={5}>
      <Text fontSize="sm" color={APP_INK}>{message}</Text>
    </Box>
  )
}
