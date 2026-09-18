import { Button, Spinner, type ButtonProps } from "@chakra-ui/react"
import { AMBER, AMBER_HOVER, BUTTON, DANGER, GREEN, INK, MOTION, MUTED, PAPER, RADIUS_CONTROL, RULE, SURFACE } from "@/theme/tokens"

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger" | "icon"
type Size = "sm" | "md" | "lg"

const variantStyles: Record<Variant, Record<string, unknown>> = {
  primary: {
    bg: GREEN,
    color: "white",
    boxShadow: "0 1px 2px rgba(14,27,23,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
    _hover: { bg: "#0a5240", boxShadow: "0 2px 8px rgba(15,110,86,0.28)" },
    _active: { bg: "#083F30", transform: "translateY(0.5px)" },
  },
  secondary: {
    bg: SURFACE,
    color: INK,
    border: `1px solid ${RULE}`,
    boxShadow: "0 1px 2px rgba(14,27,23,0.04)",
    _hover: { borderColor: "#C4C9D0", bg: "#FBFCFE" },
    _active: { transform: "translateY(0.5px)" },
  },
  ghost: {
    bg: "transparent",
    color: MUTED,
    _hover: { bg: PAPER, color: INK },
  },
  accent: {
    bg: AMBER,
    color: INK,
    _hover: { bg: AMBER_HOVER },
    _active: { transform: "translateY(0.5px)" },
  },
  danger: {
    bg: SURFACE,
    color: DANGER,
    border: `1px solid ${DANGER}`,
    _hover: { bg: "#FEF2F2" },
  },
  icon: {
    bg: SURFACE,
    color: INK,
    border: `1px solid ${RULE}`,
    _hover: { bg: PAPER },
  },
}

export interface AppButtonProps extends Omit<ButtonProps, "variant" | "size"> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export function AppButton({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  children,
  ...rest
}: AppButtonProps) {
  const s = BUTTON[size]
  const icon = variant === "icon"
  return (
    <Button
      type="button"
      {...variantStyles[variant]}
      height={icon ? s.height : s.height}
      minW={icon ? s.height : undefined}
      px={icon ? 0 : s.px}
      fontSize={s.fontSize}
      fontWeight="600"
      letterSpacing="-0.005em"
      borderRadius={RADIUS_CONTROL}
      gap="8px"
      transition={MOTION}
      disabled={disabled || loading}
      opacity={disabled || loading ? 0.5 : 1}
      cursor={disabled || loading ? "not-allowed" : "pointer"}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : children}
    </Button>
  )
}
