import { Box, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE } from "@/components/marketing/tokens"

const ENTRIES = [
  {
    version: "2.1.0",
    date: "September 2026",
    title: "Workbench and invoices",
    items: [
      "Work home: one Now, this week vs capacity, to-dos in project accordions",
      "Clients see current work, remaining hours, weekly pace, and a finish window",
      "Invoices from unbilled hours — PDF, send, mark paid",
    ],
  },
  {
    version: "2.0.0",
    date: "September 2026",
    title: "Workspace for one-person businesses",
    items: [
      "Each one-person business owns a private workspace and invites companies by link",
      "Clients and projects replace the old marketplace job board",
      "Marketplace matching and escrow are no longer the product",
    ],
  },
  {
    version: "1.4.0",
    date: "May 2026",
    title: "Services catalogue (workspace-owned)",
    items: [
      "One-person businesses can list services they offer their own companies",
      "Documents and price ranges on the services page",
    ],
  },
  {
    version: "1.3.0",
    date: "April 2026",
    title: "Document management",
    items: [
      "Upload and attach files to a job",
      "Download from the job detail page",
    ],
  },
  {
    version: "1.2.0",
    date: "March 2026",
    title: "Platform operations",
    items: [
      "Admin tools for platform operators (not part of the workspace between a one-person business and a company)",
      "Role-based access for admin and superadmin",
    ],
  },
  {
    version: "1.0.0",
    date: "January 2026",
    title: "Initial release",
    items: [
      "Accounts, sign-in, and job records",
      "Email authentication and role-based access",
    ],
  },
]

export default function ChangelogPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Platform"
        title="Changelog"
        subtitle="What changed in the Co-Helper workspace — not a marketplace feed."
      />

      <ContentSection narrow>
        {ENTRIES.map((entry, i) => (
          <Box
            key={entry.version}
            pb={10}
            mb={10}
            borderBottom={i < ENTRIES.length - 1 ? `1px solid ${RULE}` : undefined}
          >
            <Box display="flex" flexWrap="wrap" alignItems="baseline" gap={3} mb={3}>
              <Text fontSize="0.9375rem" fontWeight="700" color={INK}>v{entry.version}</Text>
              <Text fontSize="0.8125rem" color={MUTED}>{entry.date}</Text>
            </Box>
            <Text fontSize="1.0625rem" fontWeight="600" color={INK} mb={4}>{entry.title}</Text>
            <Box as="ul" pl={5} m={0}>
              {entry.items.map((item) => (
                <Box as="li" key={item} fontSize="0.9375rem" color={MUTED} lineHeight="1.75" mb={1}>
                  {item}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </ContentSection>
    </MarketingLayout>
  )
}
