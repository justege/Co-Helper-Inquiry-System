export type FooterLink = { label: string; to: string }

export const FOOTER_LINKS: { label: string; items: FooterLink[] }[] = [
  {
    label: "Platform",
    items: [
      { label: "How it Works", to: "/how-it-works" },
      { label: "Pricing", to: "/pricing" },
      { label: "Integrations", to: "/integrations" },
      { label: "Changelog", to: "/changelog" },
    ],
  },
  {
    label: "Company",
    items: [
      { label: "About", to: "/about" },
      { label: "Blog", to: "/blog" },
      { label: "Careers", to: "/careers" },
      { label: "Press", to: "/press" },
    ],
  },
  {
    label: "Legal",
    items: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
      { label: "Cookie Policy", to: "/cookies" },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Help Center", to: "/help" },
      { label: "Contact", to: "/contact" },
      { label: "Status", to: "/status" },
      { label: "Partners", to: "/partners" },
    ],
  },
]
