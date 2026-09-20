import type { InputProps } from "@chakra-ui/react"
import { Box } from "@chakra-ui/react"
import { FormInput } from "@/components/ui/form-controls"
import { APP_ACCENT, APP_BORDER, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"

/** Quarter-hours so 0.25, 0.5, 1, 2, 8 are all valid stepper values. */
export const HOUR_STEP = 0.25
export const LOG_HOUR_MIN = 0.25
export const LOG_HOUR_MAX = 24

export const LOG_HOUR_PRESETS = [
  { label: "15m", hours: 0.25 },
  { label: "30m", hours: 0.5 },
  { label: "1h", hours: 1 },
  { label: "2h", hours: 2 },
  { label: "4h", hours: 4 },
  { label: "8h", hours: 8 },
] as const

export function HoursField({
  value,
  onChange,
  min = LOG_HOUR_MIN,
  max = LOG_HOUR_MAX,
  showPresets = true,
  w = "88px",
  h = "36px",
  ...inputProps
}: {
  value: string
  onChange: (value: string) => void
  min?: number
  max?: number
  showPresets?: boolean
} & Omit<InputProps, "value" | "onChange" | "type" | "step" | "min" | "max">) {
  return (
    <Box>
      <FormInput
        type="number"
        inputMode="decimal"
        step={HOUR_STEP}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        w={w}
        h={h}
        {...inputProps}
      />
      {showPresets ? (
        <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
          {LOG_HOUR_PRESETS.map((preset) => {
            const active = Number(value) === preset.hours
            return (
              <Box
                key={preset.label}
                as="button"
                h="26px"
                px={2}
                borderRadius="8px"
                fontSize="0.7rem"
                fontWeight="700"
                border={`1px solid ${active ? APP_ACCENT : APP_BORDER}`}
                bg={active ? "rgba(15,110,86,0.1)" : APP_SURFACE}
                color={active ? APP_ACCENT : APP_MUTED}
                onClick={(e) => {
                  e.preventDefault()
                  onChange(String(preset.hours))
                }}
              >
                {preset.label}
              </Box>
            )
          })}
        </Box>
      ) : null}
    </Box>
  )
}
