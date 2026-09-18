import { NativeSelect, type NativeSelectFieldProps } from "@chakra-ui/react"
import { forwardRef } from "react"
import { CONTROL, FOCUS_RING, GREEN, INK, INVALID_RING, RADIUS_CONTROL, RULE, SURFACE, type ControlSize } from "@/theme/tokens"

export interface AppSelectProps extends Omit<NativeSelectFieldProps, "size" | "disabled"> {
  controlSize?: ControlSize
  invalid?: boolean
  disabled?: boolean
}

export const AppSelect = forwardRef<HTMLSelectElement, AppSelectProps>(
  function AppSelect({ controlSize = "md", invalid, children, disabled, ...props }, ref) {
    const s = CONTROL[controlSize]
    return (
      <NativeSelect.Root width="100%" disabled={disabled}>
        <NativeSelect.Field
          ref={ref}
          h={s.height}
          ps={s.px}
          pe="40px"
          fontSize={s.fontSize}
          color={INK}
          bg={SURFACE}
          border={`1px solid ${invalid ? "#DC2626" : RULE}`}
          borderRadius={RADIUS_CONTROL}
          _focusVisible={{
            borderColor: invalid ? "#DC2626" : GREEN,
            boxShadow: invalid ? INVALID_RING : FOCUS_RING,
            outline: "none",
          }}
          {...props}
        >
          {children}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    )
  },
)
