import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  globalCss: {
    html: { background: "#F2F4F0" },
    body: {
      fontFamily: "body",
      color: "#0E1B17",
      background: "#F2F4F0",
    },
  },
  theme: {
    tokens: {
      fonts: {
        body: { value: "'Montserrat', system-ui, sans-serif" },
        heading: { value: "'Montserrat', system-ui, sans-serif" },
      },
      colors: {
        // Co-Helper brand — Trust Green
        green: {
          50:  { value: "#F0FAF5" },
          100: { value: "#D6EFE4" },
          200: { value: "#A7D7C5" },
          300: { value: "#6ABFA2" },
          400: { value: "#3DA07E" },
          500: { value: "#0F6E56" },
          600: { value: "#0a5240" },
          700: { value: "#083F30" },
          800: { value: "#052B20" },
          900: { value: "#031810" },
        },
        // Neutral grays — ink-tinted
        gray: {
          50:  { value: "#F5F7FA" },
          100: { value: "#F2F4F0" },
          200: { value: "#E5E7EB" },
          300: { value: "#C4C9D0" },
          400: { value: "#8A96A8" },
          500: { value: "#6B7280" },
          600: { value: "#4B5563" },
          700: { value: "#2D3748" },
          800: { value: "#1A2535" },
          900: { value: "#0E1B17" },
        },
        // Lime — action & CTA
        amber: {
          50:  { value: "#F4FFE0" },
          400: { value: "#D8FF86" },
          500: { value: "#C4EB72" },
          600: { value: "#B0D65E" },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
