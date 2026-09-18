import { Input, type InputProps } from "@chakra-ui/react"
import { forwardRef } from "react"
import { CONTROL, FOCUS_RING, GREEN, INK, INVALID_RING, LABEL, RADIUS_CONTROL, RULE, SURFACE, type ControlSize } from "@/theme/tokens"

export interface AppInputProps extends InputProps {
  controlSize?: ControlSize
  invalid?: boolean
}

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(
  function AppInput({ controlSize = "md", invalid, ...props }, ref) {
    const s = CONTROL[controlSize]
    return (
      <Input
        ref={ref}
        h={s.height}
        px={s.px}
        py={s.py}
        fontSize={s.fontSize}
        color={INK}
        bg={SURFACE}
        border={`1px solid ${invalid ? "#DC2626" : RULE}`}
        borderRadius={RADIUS_CONTROL}
        _placeholder={{ color: LABEL, opacity: 1 }}
        _focusVisible={{
          borderColor: invalid ? "#DC2626" : GREEN,
          boxShadow: invalid ? INVALID_RING : FOCUS_RING,
          outline: "none",
        }}
        {...props}
      />
    )
  },
)
