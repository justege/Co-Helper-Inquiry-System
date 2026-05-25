import { Box, Grid, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE } from "@/components/marketing/tokens"

const POSTS = [
  {
    category: "Sourcing",
    date: "May 12, 2026",
    title: "Why European buyers are shifting textile production to Turkey",
    excerpt: "Cost advantages, EU Customs Union membership, and established supply chains make Turkey a strategic choice for apparel sourcing.",
  },
  {
    category: "Platform",
    date: "April 28, 2026",
    title: "Introducing structured offer comparison for procurement teams",
    excerpt: "Compare partner bids side by side with standardised fields for price, lead time, and payment terms.",
  },
  {
    category: "Industry",
    date: "April 3, 2026",
    title: "Turkey's automotive supply chain: opportunities for tier-2 suppliers",
    excerpt: "How global OEMs source components from Turkish manufacturers — and what buyers should look for in a partner.",
  },
  {
    category: "Guides",
    date: "March 15, 2026",
    title: "A buyer's guide to posting your first inquiry",
    excerpt: "What to include in your product brief, how to set realistic deadlines, and tips for receiving competitive bids.",
  },
  {
    category: "Partners",
    date: "February 20, 2026",
    title: "How verified partners win more business on OutsourceSoft",
    excerpt: "Best practices for responding to inquiries, structuring offers, and maintaining high partner ratings.",
  },
  {
    category: "Logistics",
    date: "January 30, 2026",
    title: "Shipping from Istanbul and Izmir to European markets",
    excerpt: "Transit times, documentation requirements, and freight options for buyers sourcing from Turkey's major ports.",
  },
]

export default function BlogPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Company"
        title="Blog"
        subtitle="Insights on Turkish manufacturing, procurement best practices, and platform updates."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
          {POSTS.map((post) => (
            <Link key={post.title} to="/blog" style={{ textDecoration: "none" }}>
              <Box
                p={7}
                bg="white"
                borderRadius="8px"
                border={`1px solid ${RULE}`}
                _hover={{ borderColor: "#9CA3AF" }}
                transition="border-color 0.15s"
              >
              <Box display="flex" gap={3} mb={3}>
                <Text fontSize="0.6875rem" fontWeight="600" color={MUTED} letterSpacing="0.08em" textTransform="uppercase">
                  {post.category}
                </Text>
                <Text fontSize="0.6875rem" color={MUTED}>{post.date}</Text>
              </Box>
              <Text fontSize="1.0625rem" fontWeight="600" color={INK} lineHeight="1.4" mb={3}>{post.title}</Text>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.65">{post.excerpt}</Text>
              </Box>
            </Link>
          ))}
        </Grid>
      </ContentSection>
    </MarketingLayout>
  )
}
