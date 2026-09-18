export const GREEN = "#0F6E56"
export const BLUE = "#185FA5"
export const AMBER = "#D8FF86"
export const AMBER_HOVER = "#C4EB72"
export const INK = "#0E1B17"
export const MUTED = "#6B7280"
export const LABEL = "#8A96A8"
export const RULE = "#E5E7EB"
export const PAPER = "#F4F1EA"
export const LIGHT = "#F5F7FA"
export const SURFACE = "#FFFFFF"
export const DANGER = "#B91C1C"

export const RADIUS_CONTROL = "10px"
export const RADIUS_CARD = "14px"
export const FOCUS_RING = "0 0 0 3px rgba(15,110,86,0.14)"
export const INVALID_RING = "0 0 0 3px rgba(220,38,38,0.12)"
export const MOTION = "140ms ease"

export const CONTROL = {
  sm: { height: "36px", px: "12px", py: "8px", fontSize: "0.8125rem" },
  md: { height: "44px", px: "16px", py: "12px", fontSize: "0.875rem" },
  lg: { height: "52px", px: "18px", py: "14px", fontSize: "0.9375rem" },
} as const

export const BUTTON = {
  sm: { height: "36px", px: "14px", fontSize: "0.8125rem" },
  md: { height: "44px", px: "20px", fontSize: "0.875rem" },
  lg: { height: "52px", px: "28px", fontSize: "0.9375rem" },
} as const

export type ControlSize = keyof typeof CONTROL
