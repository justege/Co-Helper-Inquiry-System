import { Box } from "@chakra-ui/react"
import { PageHeader, PageBody } from "./PageHeader"
import type { ReactNode } from "react"

interface PageShellProps {
  title: string
  subtitle?: string
  eyebrow?: string
  backHref?: string
  backLabel?: string
  action?: ReactNode
  wide?: boolean
  headerBgImage?: string
  children: ReactNode
}

/** Compatible wrapper — light page header instead of dark island. */
export function PageShell({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  action,
  wide,
  children,
}: PageShellProps) {
  return (
    <PageBody wide={wide}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={action}
        backHref={backHref}
        backLabel={backLabel}
      />
      <Box>{children}</Box>
    </PageBody>
  )
}

export const PAGE_MAX_W = "960px"
