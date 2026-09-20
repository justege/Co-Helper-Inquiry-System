import { Box, Text } from "@chakra-ui/react"
import { Link } from "react-router-dom"
import { LuChevronLeft } from "react-icons/lu"
import { INK, MUTED } from "@/theme/tokens"
import { PageBody } from "./PageHeader"
import { WelcomeBanner, type PageStat } from "./WelcomeBanner"
import { FeatureEmptyState, InquiryMockup } from "./FeatureEmptyState"
import type { ReactNode } from "react"

export type { PageStat }

export interface PageIntro {
  title: string
  bullets?: string[]
  stats?: PageStat[]
  cta?: ReactNode
  mockup?: ReactNode
}

interface PageShellProps {
  title: string
  subtitle?: string
  eyebrow?: string
  backHref?: string
  backLabel?: string
  action?: ReactNode
  intro?: PageIntro
  stats?: PageStat[]
  wide?: boolean
  children: ReactNode
}

export function PageShell({
  title,
  subtitle,
  eyebrow = "Workspace",
  backHref,
  backLabel = "Back",
  action,
  intro,
  stats,
  wide = true,
  children,
}: PageShellProps) {
  const island: PageIntro | null = intro ?? (subtitle
    ? {
        title: subtitle,
        bullets: [
          "This page follows the same workspace flow as the rest of Co-Helper",
          "Use the island above to jump into the next action",
          "Everything you add here stays with this workspace",
        ],
        mockup: <InquiryMockup />,
      }
    : null)

  return (
    <PageBody wide={wide}>
      {backHref && (
        <Link to={backHref} style={{ textDecoration: "none" }}>
          <Text
            fontSize="0.8125rem"
            color={MUTED}
            display="inline-flex"
            alignItems="center"
            gap="4px"
            mb={3}
            _hover={{ color: INK }}
          >
            <LuChevronLeft size={14} /> {backLabel}
          </Text>
        </Link>
      )}

      <WelcomeBanner eyebrow={eyebrow} title={title} action={action} stats={stats} />

      {island && (
        <Box mb={6}>
          <FeatureEmptyState
            title={island.title}
            bullets={island.bullets}
            stats={island.stats ?? stats}
            cta={island.cta}
            mockup={island.mockup ?? <InquiryMockup />}
          />
        </Box>
      )}

      <Box>{children}</Box>
    </PageBody>
  )
}

export const PAGE_MAX_W = "1280px"
