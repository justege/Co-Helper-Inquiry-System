import { Box, Text } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE } from "@/components/marketing/tokens"

const ENTRIES = [
  {
    version: "1.4.0",
    date: "May 2026",
    title: "Partner services catalogue",
    items: [
      "Partners can publish service listings and price lists",
      "Admin review workflow for partner service submissions",
      "Improved inquiry-to-offer matching by category",
    ],
  },
  {
    version: "1.3.0",
    date: "April 2026",
    title: "Document management",
    items: [
      "Upload and attach PDFs to inquiries and offers",
      "Document versioning on inquiry detail pages",
      "Downloadable offer summaries",
    ],
  },
  {
    version: "1.2.0",
    date: "March 2026",
    title: "Admin & expert management",
    items: [
      "Super admin dashboard for platform oversight",
      "Expert profile management and assignment",
      "Bulk inquiry status updates",
    ],
  },
  {
    version: "1.1.0",
    date: "February 2026",
    title: "Offer comparison",
    items: [
      "Side-by-side bid comparison for buyers",
      "Structured offer fields: price, lead time, terms",
      "Accept/reject workflow with status tracking",
    ],
  },
  {
    version: "1.0.0",
    date: "January 2026",
    title: "Initial release",
    items: [
      "Buyer inquiry creation and management",
      "Partner registration and verification",
      "Email authentication and role-based access",
      "Dashboard with inquiry pipeline overview",
    ],
  },
]

export default function ChangelogPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Platform"
        title="Changelog"
        subtitle="Product updates, new features, and improvements to the OutsourceSoft platform."
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
