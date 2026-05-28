import { Box, Grid, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE } from "@/components/marketing/tokens"

const POSTS = [
  {
    category: "Outsourcing",
    date: "May 12, 2026",
    title: "Why businesses are moving from freelancers to managed outsourcing",
    excerpt: "Dedicated project managers, vetted specialists, and structured delivery beat the chaos of managing contractors yourself.",
  },
  {
    category: "Platform",
    date: "April 28, 2026",
    title: "Introducing dedicated project managers on every Co-Helper project",
    excerpt: "One PM coordinates specialists, tracks milestones, and keeps clients updated — no need to speak to developers directly.",
  },
  {
    category: "Industry",
    date: "April 3, 2026",
    title: "Building a Shopify store without hiring a full-time developer",
    excerpt: "How e-commerce businesses outsource store setup, integrations, and ongoing management through Co-Helper.",
  },
  {
    category: "Guides",
    date: "March 15, 2026",
    title: "A client's guide to posting your first project brief",
    excerpt: "What to include in your brief, how to set realistic deadlines, and tips for getting the best results.",
  },
  {
    category: "Specialists",
    date: "February 20, 2026",
    title: "How verified specialists win more projects on Co-Helper",
    excerpt: "Best practices for delivering quality work, maintaining high ratings, and building long-term client relationships.",
  },
  {
    category: "Remote Work",
    date: "January 30, 2026",
    title: "Managing global development teams across time zones",
    excerpt: "How Co-Helper project managers coordinate specialists in the Americas, Europe, and Asia-Pacific for 24/7 progress.",
  },
]

export default function BlogPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Company"
        title="Blog"
        subtitle="Insights on digital outsourcing, project management best practices, and platform updates."
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
