import { Textarea, type TextareaProps } from "@chakra-ui/react"
import { forwardRef } from "react"
import { FOCUS_RING, GREEN, INK, INVALID_RING, LABEL, RADIUS_CONTROL, RULE, SURFACE } from "@/theme/tokens"

export interface AppTextareaProps extends TextareaProps {
  invalid?: boolean
}

export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>(
  function AppTextarea({ invalid, ...props }, ref) {
    return (
      <Textarea
        ref={ref}
        minH="120px"
        px="16px"
        py="14px"
        fontSize="0.875rem"
        color={INK}
        bg={SURFACE}
        border={`1px solid ${invalid ? "#DC2626" : RULE}`}
        borderRadius={RADIUS_CONTROL}
        resize={{ base: "none", md: "vertical" }}
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
