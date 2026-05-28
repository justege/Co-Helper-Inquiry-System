import { Box } from "@chakra-ui/react"
import { INK } from "./tokens"
import { MarketingFooter, MarketingNav, AnnounceBar } from "./MarketingUI"

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box minH="100vh" bg="white" color={INK} fontFamily="inherit" display="flex" flexDirection="column">
      <AnnounceBar />
      <MarketingNav />
      <Box flex={1}>{children}</Box>
      <MarketingFooter />
    </Box>
  )
}
