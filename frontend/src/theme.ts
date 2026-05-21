import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  globalCss: {
    html: { background: "#fcfcfc" },
    body: {
      fontFamily: "body",
      color: "#333333",
      background: "#fcfcfc",
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
        orange: {
          50:  { value: "#fff7ed" },
          100: { value: "#ffe8d0" },
          200: { value: "#ffd0a2" },
          300: { value: "#ffb878" },
          400: { value: "#ffa14e" },
          500: { value: "#f08c35" },
          600: { value: "#d97020" },
          700: { value: "#b55a1a" },
          800: { value: "#8f4218" },
          900: { value: "#7a3716" },
        },
        gray: {
          50:  { value: "#f9f9f9" },
          100: { value: "#f2f2f2" },
          200: { value: "#e0e0e0" },
          300: { value: "#bdbdbd" },
          400: { value: "#a6aab5" },
          500: { value: "#828282" },
          600: { value: "#666666" },
          700: { value: "#484a4f" },
          800: { value: "#333333" },
          900: { value: "#1f1f1f" },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
