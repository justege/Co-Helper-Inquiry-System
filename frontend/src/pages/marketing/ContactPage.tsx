import { Box, Grid, Heading, Input, Stack, Text, Textarea } from "@chakra-ui/react"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

const inputStyles = {
  bg: "white",
  border: `1px solid ${RULE}`,
  borderRadius: "6px",
  fontSize: "0.875rem",
  px: 4,
  py: 2.5,
  _focus: { borderColor: "#9CA3AF", outline: "none", boxShadow: "none" },
}

export default function ContactPage() {
  return (
    <MarketingLayout>
      <PageHero
        label="Support"
        title="Contact"
        subtitle="Reach our team for sales inquiries, support requests, or partnership applications."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={12}>
          <Box as="form" onSubmit={(e) => e.preventDefault()}>
            <Stack gap={4}>
              <Box>
                <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={1.5}>Name</Text>
                <Input placeholder="Your name" {...inputStyles} />
              </Box>
              <Box>
                <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={1.5}>Work email</Text>
                <Input type="email" placeholder="you@company.com" {...inputStyles} />
              </Box>
              <Box>
                <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={1.5}>Company</Text>
                <Input placeholder="Company name" {...inputStyles} />
              </Box>
              <Box>
                <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={1.5}>Subject</Text>
                <Input placeholder="Sales, support, partnership, press..." {...inputStyles} />
              </Box>
              <Box>
                <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={1.5}>Message</Text>
                <Textarea placeholder="How can we help?" rows={5} {...inputStyles} resize="vertical" />
              </Box>
              <Box
                as="button"
                alignSelf="flex-start"
                px={5} py="10px"
                bg={INK}
                color="white"
                fontWeight="600"
                fontSize="0.875rem"
                borderRadius="6px"
                border={`1px solid ${INK}`}
                cursor="pointer"
                _hover={{ bg: "#1E2530" }}
              >
                Send message
              </Box>
            </Stack>
          </Box>

          <Stack gap={6}>
            <Box p={7} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`}>
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={4}>Direct contact</Heading>
              <Stack gap={3}>
                <Box>
                  <Text fontSize="0.75rem" fontWeight="600" color={MUTED} letterSpacing="0.06em" textTransform="uppercase">General</Text>
                  <Text fontSize="0.875rem" color={INK} mt={1}>hello@outsourcesoft.com</Text>
                </Box>
                <Box>
                  <Text fontSize="0.75rem" fontWeight="600" color={MUTED} letterSpacing="0.06em" textTransform="uppercase">Sales</Text>
                  <Text fontSize="0.875rem" color={INK} mt={1}>sales@outsourcesoft.com</Text>
                </Box>
                <Box>
                  <Text fontSize="0.75rem" fontWeight="600" color={MUTED} letterSpacing="0.06em" textTransform="uppercase">Support</Text>
                  <Text fontSize="0.875rem" color={INK} mt={1}>support@outsourcesoft.com</Text>
                </Box>
                <Box>
                  <Text fontSize="0.75rem" fontWeight="600" color={MUTED} letterSpacing="0.06em" textTransform="uppercase">Partnerships</Text>
                  <Text fontSize="0.875rem" color={INK} mt={1}>partners@outsourcesoft.com</Text>
                </Box>
              </Stack>
            </Box>

            <Box p={7} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={3}>Office</Heading>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.75">
                OutsourceSoft<br />
                Levent, Istanbul<br />
                Turkey
              </Text>
              <Text fontSize="0.8125rem" color={MUTED} mt={4}>
                Monday – Friday, 09:00 – 18:00 (TRT)
              </Text>
            </Box>
          </Stack>
        </Grid>
      </ContentSection>
    </MarketingLayout>
  )
}
