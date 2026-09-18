import { Box, Grid, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE } from "@/components/marketing/tokens"

const POSTS = [
  {
    category: "Product",
    date: "September 12, 2026",
    title: "Why we dropped marketplace matching",
    excerpt: "Clients already come from you. Co-Helper is now a private workspace: invite, run the job, log the hours — no browsing, no PM, no escrow.",
  },
  {
    category: "Guides",
    date: "September 4, 2026",
    title: "How to invite a client without posting a project",
    excerpt: "Send a workspace invite, open a job, and keep the brief, chat, and rate in one record. The client never has to shop around.",
  },
  {
    category: "AI",
    date: "August 21, 2026",
    title: "Edit with AI uses the job — not a generic prompt",
    excerpt: "Rewrites pull from that job’s requirements, messages, and to-dos. The Gemini key stays on the server. You still own the words.",
  },
  {
    category: "Integrations",
    date: "August 8, 2026",
    title: "Import a Trello board as jobs and to-dos",
    excerpt: "Columns become projects, cards become jobs, checklists and comments become to-dos. Optional webhook keep-alive after the first import.",
  },
  {
    category: "Finance",
    date: "July 22, 2026",
    title: "Hours and payment logs — without becoming a processor",
    excerpt: "Agree an hourly or project rate, log time, record what was paid. Invoicing and transfers stay how you already operate.",
  },
  {
    category: "Clients",
    date: "July 3, 2026",
    title: "What invited clients actually see",
    excerpt: "Each client sees only the jobs you share with them — brief, chat, files, to-dos, and the payment log. No marketplace catalogue.",
  },
]

export default function BlogPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Company"
        title="Blog"
        subtitle="Notes on running a one-person business workspace — invites, jobs, AI, hours, and payment logs."
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
