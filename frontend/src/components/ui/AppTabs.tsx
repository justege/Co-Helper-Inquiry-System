import { Box, Text } from "@chakra-ui/react"
import {
  APP_ACCENT,
  APP_BORDER,
  APP_INK,
  APP_LABEL,
  APP_MINT,
  APP_MOTION,
  APP_MUTED,
  APP_PAPER,
  APP_SURFACE,
} from "./appUi"
import { RADIUS_CARD, RADIUS_CONTROL } from "@/theme/tokens"

export type AppTabItem = {
  value: string
  label: string
  badge?: number
  dividerBefore?: boolean
}

function TabBadge({ active, count }: { active: boolean; count: number }) {
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      minW="18px"
      h="18px"
      px={1}
      ml={2}
      borderRadius="999px"
      fontSize="0.65rem"
      fontWeight="700"
      lineHeight="1"
      bg={active ? APP_MINT : "rgba(14,27,23,0.06)"}
      color={active ? APP_ACCENT : APP_LABEL}
    >
      {count}
    </Box>
  )
}

export function AppTabs({
  value,
  onChange,
  items,
}: {
  value: string
  onChange: (value: string) => void
  items: AppTabItem[]
}) {
  return (
    <Box
      bg={APP_PAPER}
      border={`1px solid ${APP_BORDER}`}
      borderRadius={RADIUS_CARD}
      p={1.5}
      overflowX="auto"
      css={{
        "&::-webkit-scrollbar": { height: "0", display: "none" },
        scrollbarWidth: "none",
      }}
    >
      <Box display="flex" alignItems="center" gap={0.5} minW="max-content">
        {items.map((item) => {
          const active = value === item.value
          const showBadge = item.badge != null && item.badge > 0
          return (
            <Box key={item.value} display="flex" alignItems="center" flexShrink={0}>
              {item.dividerBefore ? (
                <Box w="1px" h="20px" bg={APP_BORDER} mx={1.5} flexShrink={0} />
              ) : null}
              <Box
                as="button"
                type="button"
                display="inline-flex"
                alignItems="center"
                px={3.5}
                py={2}
                borderRadius={RADIUS_CONTROL}
                fontSize="0.8125rem"
                fontWeight={active ? "600" : "500"}
                letterSpacing="-0.01em"
                color={active ? APP_INK : APP_MUTED}
                bg={active ? APP_SURFACE : "transparent"}
                boxShadow={active ? "0 1px 3px rgba(14,27,23,0.07), 0 0 0 1px rgba(14,27,23,0.04)" : "none"}
                whiteSpace="nowrap"
                transition={`background ${APP_MOTION}, color ${APP_MOTION}, box-shadow ${APP_MOTION}`}
                _hover={{
                  color: active ? APP_INK : APP_INK,
                  bg: active ? APP_SURFACE : "rgba(255,255,255,0.55)",
                }}
                onClick={() => onChange(item.value)}
              >
                {item.label}
                {showBadge ? <TabBadge active={active} count={item.badge!} /> : null}
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

export function AppSectionLabel({ children }: { children: string }) {
  return (
    <Text fontSize="0.6875rem" fontWeight="600" color={APP_LABEL} letterSpacing="0.06em" textTransform="uppercase">
      {children}
    </Text>
  )
}
