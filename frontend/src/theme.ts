import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  globalCss: {
    html: { background: "#EFF1F6" },
    body: {
      fontFamily: "body",
      color: "#0D1B2E",
      background: "#EFF1F6",
      WebkitFontSmoothing: "antialiased",
    },
  },
  theme: {
    tokens: {
      fonts: {
        body: { value: "'Montserrat', system-ui, sans-serif" },
        heading: { value: "'Montserrat', system-ui, sans-serif" },
      },
      colors: {
        // Primary corporate blue — used for CTAs, active states, links
        blue: {
          50:  { value: "#EFF6FF" },
          100: { value: "#DBEAFE" },
          200: { value: "#BFDBFE" },
          300: { value: "#93C5FD" },
          400: { value: "#60A5FA" },
          500: { value: "#1563B2" },
          600: { value: "#1252A0" },
          700: { value: "#0F4080" },
          800: { value: "#0C3060" },
          900: { value: "#081F40" },
        },
        // Neutral slate grays for text and borders
        gray: {
          50:  { value: "#F8F9FC" },
          100: { value: "#EFF1F6" },
          200: { value: "#D8DCE8" },
          300: { value: "#B8C0D0" },
          400: { value: "#8A96A8" },
          500: { value: "#64748B" },
          600: { value: "#4A5568" },
          700: { value: "#2D3748" },
          800: { value: "#1A2535" },
          900: { value: "#0D1B2E" },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
