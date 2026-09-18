import { Box, Text } from "@chakra-ui/react"
import { INK, LABEL, MUTED } from "@/theme/tokens"
import type { ReactNode } from "react"

export function AppFormField({
  label,
  helper,
  error,
  children,
}: {
  label?: string
  helper?: string
  error?: string
  children: ReactNode
}) {
  return (
    <Box>
      {label && (
        <Text fontSize="13px" fontWeight="600" color={INK} mb="6px">
          {label}
        </Text>
      )}
      {children}
      {error ? (
        <Text fontSize="12px" color="#B91C1C" mt="6px">{error}</Text>
      ) : helper ? (
        <Text fontSize="12px" color={MUTED} mt="6px">{helper}</Text>
      ) : null}
    </Box>
  )
}

export function AppForm({
  children,
  wide,
  onSubmit,
}: {
  children: ReactNode
  wide?: boolean
  onSubmit?: React.FormEventHandler
}) {
  return (
    <Box
      as="form"
      maxW={wide ? "640px" : "480px"}
      display="flex"
      flexDir="column"
      gap="20px"
      onSubmit={onSubmit}
    >
      {children}
    </Box>
  )
}

export function AppFormFooter({ children }: { children: ReactNode }) {
  return (
    <Box display="flex" justifyContent="flex-end" gap="12px" pt="4px">
      {children}
    </Box>
  )
}

export function AppValue({ children }: { children: ReactNode }) {
  return (
    <Box
      px="16px"
      py="12px"
      bg="#F4F1EA"
      borderRadius="10px"
      fontSize="0.875rem"
      fontWeight="500"
      color={INK}
    >
      {children}
    </Box>
  )
}

export function AppFormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box mt="28px" _first={{ mt: 0 }}>
      <Text fontSize="0.75rem" fontWeight="700" color={LABEL} letterSpacing="0.06em" textTransform="uppercase" mb="12px">
        {title}
      </Text>
      <Box display="flex" flexDir="column" gap="20px">{children}</Box>
    </Box>
  )
}
