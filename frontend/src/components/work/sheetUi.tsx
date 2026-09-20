import type { CSSProperties, ReactNode } from "react"
import { Box } from "@chakra-ui/react"
import { APP_BORDER, APP_INK, APP_MUTED, APP_SURFACE } from "@/components/ui/appUi"
import { GREEN, LIGHT, MINT, PAPER } from "@/theme/tokens"

export const SHEET_BORDER = APP_BORDER
export const SHEET_SELECTED = GREEN

export const sheetWrapStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  background: APP_SURFACE,
  fontSize: "0.8125rem",
}

export function SheetFrame({ children }: { children: ReactNode }) {
  return (
    <Box
      bg={APP_SURFACE}
      border={`1px solid ${SHEET_BORDER}`}
      borderRadius="14px"
      overflow="auto"
      maxH="calc(100vh - 280px)"
      minH="320px"
    >
      {children}
    </Box>
  )
}

export function sheetCellStyle(opts: {
  selected?: boolean
  weekend?: boolean
  locked?: boolean
  header?: boolean
  muted?: boolean
  align?: "left" | "right"
}): CSSProperties {
  return {
    border: `1px solid ${SHEET_BORDER}`,
    height: opts.header ? 34 : 38,
    padding: "0 10px",
    verticalAlign: "middle",
    background: opts.header
      ? LIGHT
      : opts.selected
        ? MINT
        : opts.weekend
          ? PAPER
          : APP_SURFACE,
    color: opts.locked || opts.muted ? APP_MUTED : APP_INK,
    fontWeight: opts.header ? 700 : 500,
    fontSize: opts.header ? "0.625rem" : "0.8125rem",
    letterSpacing: opts.header ? "0.06em" : undefined,
    textTransform: opts.header ? "uppercase" : undefined,
    textAlign: opts.align ?? "left",
    outline: opts.selected ? `2px solid ${SHEET_SELECTED}` : undefined,
    outlineOffset: opts.selected ? -2 : undefined,
    cursor: opts.header || opts.locked ? "default" : "cell",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    position: opts.header ? "sticky" : undefined,
    top: opts.header ? 0 : undefined,
    zIndex: opts.header ? 2 : undefined,
  }
}

export const sheetInputStyle: CSSProperties = {
  width: "100%",
  height: 36,
  border: "none",
  outline: "none",
  background: "transparent",
  font: "inherit",
  color: "inherit",
  padding: 0,
}
