import { useForm } from "react-hook-form"
import { Box, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import { FormInput, FormTextarea } from "@/components/ui/form-controls"
import MarketingLayout from "@/components/marketing/MarketingLayout"
import { ContentSection, PageHero } from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

type ContactFields = {
  name: string
  email: string
  company: string
  subject: string
  message: string
}

export default function ContactPage() {
  const { register, handleSubmit } = useForm<ContactFields>()

  function onSubmit(_data: ContactFields) {
    // Static marketing form — wire to API when available
  }

  return (
    <MarketingLayout>
      <PageHero
        label="Support"
        title="Contact"
        subtitle="Reach our team for project scoping, sales callbacks, support, or developer network applications."
      />

      <ContentSection>
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={12}>
          <Box as="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack gap={4}>
              <Box>
                <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={1.5}>Name</Text>
                <FormInput placeholder="Your name" {...register("name")} />
              </Box>
              <Box>
                <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={1.5}>Work email</Text>
                <FormInput type="email" placeholder="you@company.com" {...register("email")} />
              </Box>
              <Box>
                <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={1.5}>Company</Text>
                <FormInput placeholder="Company name" {...register("company")} />
              </Box>
              <Box>
                <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={1.5}>Subject</Text>
                <FormInput placeholder="Sales, support, partnership, press..." {...register("subject")} />
              </Box>
              <Box>
                <Text fontSize="0.8125rem" fontWeight="600" color={INK} mb={1.5}>Message</Text>
                <FormTextarea placeholder="How can we help?" rows={5} resize="vertical" {...register("message")} />
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
            <Box p={7} bg={INK} borderRadius="8px" color="white">
              <Heading fontSize="1rem" fontWeight="600" mb={3}>Prefer a callback?</Heading>
              <Text fontSize="0.875rem" color="rgba(255,255,255,0.72)" lineHeight="1.75" mb={4}>
                Tell us about your project and we&rsquo;ll schedule a short call with our team —
                no sales deck, just scoping help.
              </Text>
              <Text fontSize="0.875rem" fontWeight="600">Use the form and select &ldquo;Sales&rdquo; as your subject.</Text>
            </Box>

            <Box p={7} bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`}>
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={4}>Direct contact</Heading>
              <Stack gap={3}>
                <Box>
                  <Text fontSize="0.75rem" fontWeight="600" color={MUTED} letterSpacing="0.06em" textTransform="uppercase">General</Text>
                  <Text fontSize="0.875rem" color={INK} mt={1}>hello@co-helper.com</Text>
                </Box>
                <Box>
                  <Text fontSize="0.75rem" fontWeight="600" color={MUTED} letterSpacing="0.06em" textTransform="uppercase">Sales</Text>
                  <Text fontSize="0.875rem" color={INK} mt={1}>sales@co-helper.com</Text>
                </Box>
                <Box>
                  <Text fontSize="0.75rem" fontWeight="600" color={MUTED} letterSpacing="0.06em" textTransform="uppercase">Support</Text>
                  <Text fontSize="0.875rem" color={INK} mt={1}>support@co-helper.com</Text>
                </Box>
                <Box>
                  <Text fontSize="0.75rem" fontWeight="600" color={MUTED} letterSpacing="0.06em" textTransform="uppercase">Partnerships</Text>
                  <Text fontSize="0.875rem" color={INK} mt={1}>partners@co-helper.com</Text>
                </Box>
              </Stack>
            </Box>

            <Box p={7} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={3}>Headquarters</Heading>
              <Text fontSize="0.875rem" color={MUTED} lineHeight="1.75">
                Co-Helper<br />
                Berlin HQ · Remote-first global team
              </Text>
              <Text fontSize="0.8125rem" color={MUTED} mt={4}>
                Monday – Friday, 09:00 – 18:00 (CET)
              </Text>
            </Box>
          </Stack>
        </Grid>
      </ContentSection>
    </MarketingLayout>
  )
}
