import { Box } from "@chakra-ui/react"
import { APP_ACCENT, APP_BORDER, APP_MUTED } from "./appUi"

export function AppTabs({
  value,
  onChange,
  items,
}: {
  value: string
  onChange: (value: string) => void
  items: { value: string; label: string; badge?: number }[]
}) {
  return (
    <Box display="flex" gap={0} borderBottom={`1px solid ${APP_BORDER}`} overflowX="auto">
      {items.map((item) => {
        const active = value === item.value
        return (
          <Box
            key={item.value}
            as="button"
            type="button"
            px={4}
            py={3}
            fontSize="0.8125rem"
            fontWeight="700"
            color={active ? APP_ACCENT : APP_MUTED}
            borderBottom={active ? `2px solid ${APP_ACCENT}` : "2px solid transparent"}
            whiteSpace="nowrap"
            onClick={() => onChange(item.value)}
          >
            {item.label}
            {item.badge != null && item.badge > 0 ? (
              <Box as="span" ml={2} fontSize="0.7rem" fontWeight="700" color={active ? APP_ACCENT : APP_MUTED}>
                {item.badge}
              </Box>
            ) : null}
          </Box>
        )
      })}
    </Box>
  )
}
