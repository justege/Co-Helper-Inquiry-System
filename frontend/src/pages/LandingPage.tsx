import { useEffect, useState } from "react"
import { Box, Flex, Grid, Heading, Stack, Text } from "@chakra-ui/react"
import izmirPng from "@/assets/izmir.png"
import backgroundMp4 from "@/assets/background.mp4"
import {
  CheckItem,
  CTA,
  Divider,
  Logo,
  MarketingFooter,
  SectionLabel,
  StepNumber,
} from "@/components/marketing/MarketingUI"
import { INK, MUTED, RULE, SURFACE } from "@/components/marketing/tokens"

function BarRow({ label, value, max, highlight = false }: { label: string; value: number; max: number; highlight?: boolean }) {
  const pct = Math.round((value / max) * 100)
  return (
    <Box mb={5}>
      <Flex justify="space-between" mb={2}>
        <Text fontSize="0.875rem" fontWeight="500" color={INK}>{label}</Text>
        <Text fontSize="0.875rem" fontWeight="600" color={highlight ? INK : MUTED}>{value}</Text>
      </Flex>
      <Box h="6px" bg={RULE} borderRadius="full" overflow="hidden">
        <Box
          h="full" borderRadius="full"
          bg={highlight ? INK : "#9CA3AF"}
          style={{ width: `${pct}%`, transition: "width 0.6s ease" }}
        />
      </Box>
    </Box>
  )
}

function ShippingCard({ city, days }: { city: string; days: string }) {
  return (
    <Box
      bg="white" borderRadius="8px" border={`1px solid ${RULE}`}
      p={5} display="flex" alignItems="center" justifyContent="space-between" gap={4}
      _hover={{ borderColor: "#9CA3AF" }}
      transition="border-color 0.15s"
    >
      <Box>
        <Text fontSize="0.9375rem" fontWeight="600" color={INK}>{city}</Text>
        <Text fontSize="0.8125rem" color={MUTED} mt={0.5}>{days}</Text>
      </Box>
      <Text fontSize="0.75rem" fontWeight="600" color={MUTED} letterSpacing="0.04em" flexShrink={0}>
        {days.split(" ")[0]}d
      </Text>
    </Box>
  )
}

const STEPS = [
  {
    n: "01",
    title: "Post an inquiry",
    body: "Describe your product or service need in plain language. Set quantity, deadline, and budget range — completed in under five minutes.",
  },
  {
    n: "02",
    title: "Receive partner bids",
    body: "Verified Turkish manufacturers and service partners review your brief and submit structured, itemised offers — usually within 24 hours.",
  },
  {
    n: "03",
    title: "Accept & track delivery",
    body: "Compare bids side by side, accept the best offer, and track production milestones and shipment status on your dashboard.",
  },
]

const CATEGORIES = [
  "Textiles & Apparel",
  "CNC & Precision Machining",
  "Metal Fabrication",
  "Furniture & Wood Products",
  "Automotive Components",
  "Food & Agricultural Products",
  "Ceramics & Building Materials",
  "Chemicals & Plastics",
  "Electronics & Assembly",
  "Logistics & Freight",
  "Quality Control & Inspection",
  "Design & Engineering Services",
]

const WHY = [
  {
    title: "Cost advantage",
    body: "40–70% below Western European production costs. Turkish factories supply Airbus, IKEA, H&M and Mercedes-Benz.",
  },
  {
    title: "EU Customs Union",
    body: "Turkey has been part of the EU Customs Union since 1996. Simplified documentation, reduced tariffs, fast border clearance.",
  },
  {
    title: "Strategic location",
    body: "1–3 days shipping to 55+ European and Middle Eastern markets. Major seaports at Istanbul, Izmir and Mersin.",
  },
  {
    title: "Experienced partners",
    body: "English-speaking, internationally certified factories and service firms with decades of export experience.",
  },
]

const SHIPPING = [
  { city: "Berlin", days: "2–3 day delivery" },
  { city: "Paris", days: "2–3 day delivery" },
  { city: "Amsterdam", days: "3–4 day delivery" },
  { city: "Milan", days: "2–3 day delivery" },
  { city: "Dubai", days: "1–2 day delivery" },
  { city: "Warsaw", days: "3–4 day delivery" },
  { city: "London", days: "3–4 day delivery" },
  { city: "Madrid", days: "3–5 day delivery" },
]

export default function LandingPage() {
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.75)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <Box minH="100vh" bg="white" color={INK} fontFamily="inherit">

      <Box
        as="header"
        position="fixed" top={0} left={0} right={0} zIndex={50}
        bg="white"
        borderBottom={`1px solid ${RULE}`}
        transform={pastHero ? "translateY(0)" : "translateY(-100%)"}
        opacity={pastHero ? 1 : 0}
        pointerEvents={pastHero ? "auto" : "none"}
        transition="transform 0.25s ease, opacity 0.25s ease"
      >
        <Flex align="center" justify="space-between"
          maxW="1100px" mx="auto" px={{ base: 5, md: 8 }} h="56px"
        >
          <Logo />
          <Flex align="center" gap={2}>
            <CTA to="/login" variant="ghost">Sign in</CTA>
            <CTA to="/register" variant="primary">Get started</CTA>
          </Flex>
        </Flex>
      </Box>

      <Box position="relative" overflow="hidden" minH="100vh" display="flex" alignItems="center">
        <Box
          as="video"
          position="absolute" inset={0} w="full" h="full"
          style={{ objectFit: "cover" }}
          // @ts-expect-error – video-specific HTML attributes
          autoPlay muted loop playsInline src={backgroundMp4}
        />
        <Box
          position="absolute" inset={0}
          background="linear-gradient(180deg, rgba(13,17,23,0.55) 0%, rgba(13,17,23,0.82) 100%)"
        />

        <Flex
          position="absolute" top={0} left={0} right={0} zIndex={2}
          align="center" justify="space-between"
          maxW="1100px" mx="auto" px={{ base: 5, md: 8 }} pt={{ base: 6, md: 8 }}
          w="full"
        >
          <Logo light />
          <Flex align="center" gap={2}>
            <CTA to="/login" variant="hero-ghost">Sign in</CTA>
            <CTA to="/register" variant="white">Get started</CTA>
          </Flex>
        </Flex>

        <Box
          position="relative" zIndex={1}
          maxW="1100px" mx="auto" px={{ base: 5, md: 8 }}
          pt={{ base: 28, md: 0 }} pb={{ base: 16, md: 0 }}
          w="full"
        >
          <Box maxW="680px">
            <Text
              fontSize="0.75rem" fontWeight="600" color="rgba(255,255,255,0.6)"
              letterSpacing="0.08em" textTransform="uppercase" mb={6}
            >
              B2B Procurement Platform
            </Text>

            <Heading
              as="h1"
              fontSize={{ base: "2.25rem", md: "3.25rem", lg: "3.75rem" }}
              fontWeight="700"
              color="white"
              lineHeight="1.12"
              letterSpacing="-0.03em"
              mb={6}
            >
              Source from Turkey.<br />
              Without the guesswork.
            </Heading>

            <Text
              fontSize={{ base: "1rem", md: "1.125rem" }}
              color="rgba(255,255,255,0.72)"
              lineHeight="1.75"
              maxW="540px"
              mb={10}
            >
              OutsourceSoft connects global buyers with verified Turkish manufacturers and service partners —
              from inquiry to delivery, in one transparent platform.
            </Text>

            <Flex gap={3} flexWrap="wrap" align="center" mb={14}>
              <CTA to="/register" variant="white">Post your first inquiry</CTA>
              <CTA to="/login" variant="hero-ghost">Sign in</CTA>
            </Flex>

            <Grid templateColumns={{ base: "repeat(2,1fr)", md: "repeat(4,1fr)" }} gap={{ base: 4, md: 6 }}>
              {[
                { n: "500+",  l: "Verified partners" },
                { n: "24 h",  l: "Average first bid" },
                { n: "18",    l: "Manufacturing categories" },
                { n: "€0",    l: "Commission for buyers" },
              ].map((s) => (
                <Box key={s.l} pt={4} borderTop="1px solid rgba(255,255,255,0.2)">
                  <Text fontSize={{ base: "1.5rem", md: "1.75rem" }} fontWeight="700" color="white"
                    letterSpacing="-0.03em" lineHeight="1">{s.n}</Text>
                  <Text fontSize="0.8125rem" color="rgba(255,255,255,0.55)" mt={1.5}>{s.l}</Text>
                </Box>
              ))}
            </Grid>
          </Box>
        </Box>
      </Box>

      <Box maxW="1100px" mx="auto" px={{ base: 5, md: 8 }} py={{ base: 16, md: 24 }}>
        <SectionLabel>How it works</SectionLabel>
        <Heading fontSize={{ base: "1.75rem", md: "2.25rem" }} fontWeight="700" letterSpacing="-0.03em" mb={14} maxW="520px">
          Three steps from idea to delivery.
        </Heading>
        <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap={{ base: 10, md: 8 }}>
          {STEPS.map((step, i) => (
            <Box key={step.n} position="relative">
              {i < STEPS.length - 1 && (
                <Box
                  display={{ base: "none", md: "block" }}
                  position="absolute" top="20px" right="-16px" w="32px" h="1px"
                  bg={RULE} zIndex={0}
                />
              )}
              <StepNumber n={step.n} />
              <Heading fontSize="1rem" fontWeight="600" color={INK} mb={3} letterSpacing="-0.01em">
                {step.title}
              </Heading>
              <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.7">{step.body}</Text>
            </Box>
          ))}
        </Grid>
      </Box>

      <Divider />

      <Box bg={SURFACE} py={{ base: 16, md: 24 }}>
        <Box maxW="1100px" mx="auto" px={{ base: 5, md: 8 }}>
          <SectionLabel>By the numbers</SectionLabel>
          <Heading fontSize={{ base: "1.75rem", md: "2.25rem" }} fontWeight="700" letterSpacing="-0.03em" mb={4} maxW="640px">
            The cost advantage is real — and measurable.
          </Heading>
          <Text fontSize={{ base: "1rem", md: "1.0625rem" }} color={MUTED} mb={14} maxW="540px" lineHeight="1.7">
            Average manufacturing cost index relative to Turkey (base = 100). Data sourced from OECD industry surveys.
          </Text>

          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={12} alignItems="start">
            <Box bg="white" borderRadius="8px" border={`1px solid ${RULE}`} p={8}>
              <Text fontSize="0.75rem" fontWeight="600" color={MUTED} letterSpacing="0.06em" textTransform="uppercase" mb={6}>
                Manufacturing Cost Index
              </Text>
              <BarRow label="Germany"  value={100} max={110} />
              <BarRow label="France"   value={95}  max={110} />
              <BarRow label="Italy"    value={88}  max={110} />
              <BarRow label="Spain"    value={79}  max={110} />
              <BarRow label="Poland"   value={62}  max={110} />
              <BarRow label="Turkey"   value={40}  max={110} highlight />
              <Box mt={4} pt={4} borderTop={`1px solid ${RULE}`}>
                <Text fontSize="0.8125rem" color={MUTED} lineHeight="1.6">
                  Turkey offers up to 60% cost savings compared to Western European production.
                </Text>
              </Box>
            </Box>

            <Box>
              <Grid templateColumns="repeat(2,1fr)" gap={4} mb={6}>
                {[
                  { v: "60%", l: "Average cost savings vs. Germany" },
                  { v: "85%", l: "Of deliveries arrive on schedule" },
                  { v: "30yr", l: "EU Customs Union membership" },
                  { v: "#5", l: "World's largest textile exporter" },
                ].map((s) => (
                  <Box key={s.l} bg="white" borderRadius="8px" border={`1px solid ${RULE}`} p={6}>
                    <Text fontSize="2rem" fontWeight="700" color={INK} letterSpacing="-0.03em" lineHeight="1">{s.v}</Text>
                    <Text fontSize="0.875rem" color={MUTED} mt={2} lineHeight="1.5">{s.l}</Text>
                  </Box>
                ))}
              </Grid>

              <Box bg="white" borderRadius="8px" border={`1px solid ${RULE}`} p={6}>
                <Text fontSize="0.75rem" fontWeight="600" color={MUTED} letterSpacing="0.06em" textTransform="uppercase" mb={4}>
                  Global brands sourcing from Turkey
                </Text>
                <Flex flexWrap="wrap" gap={2}>
                  {["IKEA", "H&M", "Zara", "Airbus", "Mercedes-Benz", "Toyota", "Nike", "Adidas", "Bosch", "Siemens"].map((b) => (
                    <Box key={b} px={3} py={1} bg={SURFACE} borderRadius="4px"
                      fontSize="0.8125rem" fontWeight="500" color={INK} border={`1px solid ${RULE}`}>
                      {b}
                    </Box>
                  ))}
                </Flex>
              </Box>
            </Box>
          </Grid>
        </Box>
      </Box>

      <Divider />

      <Box maxW="1100px" mx="auto" px={{ base: 5, md: 8 }} py={{ base: 16, md: 24 }}>
        <SectionLabel>What we source</SectionLabel>
        <Heading fontSize={{ base: "1.75rem", md: "2.25rem" }} fontWeight="700" letterSpacing="-0.03em" mb={12} maxW="520px">
          12 categories. Thousands of suppliers.
        </Heading>
        <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(3,1fr)", lg: "repeat(4,1fr)" }} gap="1px" bg={RULE}>
          {CATEGORIES.map((cat) => (
            <Box key={cat} bg="white" p={5} _hover={{ bg: SURFACE }} transition="background 0.12s">
              <Text fontSize="0.9375rem" fontWeight="500" color={INK}>{cat}</Text>
            </Box>
          ))}
        </Grid>
      </Box>

      <Divider />

      <Box bg={SURFACE} py={{ base: 16, md: 24 }}>
        <Box maxW="1100px" mx="auto" px={{ base: 5, md: 8 }}>
          <SectionLabel>Why Turkey</SectionLabel>
          <Heading fontSize={{ base: "1.75rem", md: "2.25rem" }} fontWeight="700" letterSpacing="-0.03em" mb={14} maxW="600px">
            Europe's best-kept manufacturing advantage.
          </Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap={6}>
            {WHY.map((item) => (
              <Box key={item.title} p={7} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}
                _hover={{ borderColor: "#9CA3AF" }}
                transition="border-color 0.15s"
              >
                <Heading fontSize="1rem" fontWeight="600" color={INK} mb={2.5} letterSpacing="-0.01em">
                  {item.title}
                </Heading>
                <Text fontSize="0.9375rem" color={MUTED} lineHeight="1.7">{item.body}</Text>
              </Box>
            ))}
          </Grid>
        </Box>
      </Box>

      <Divider />

      <Box maxW="1100px" mx="auto" px={{ base: 5, md: 8 }} py={{ base: 16, md: 24 }}>
        <SectionLabel>Shipping reach</SectionLabel>
        <Heading fontSize={{ base: "1.75rem", md: "2.25rem" }} fontWeight="700" letterSpacing="-0.03em" mb={4} maxW="560px">
          Door-to-door delivery across Europe &amp; the Middle East.
        </Heading>
        <Text fontSize={{ base: "1rem", md: "1.0625rem" }} color={MUTED} mb={12} maxW="540px" lineHeight="1.7">
          Direct freight from Istanbul, Izmir and Mersin to 55+ destinations — by air, sea and road.
        </Text>

        <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4,1fr)" }} gap={4} mb={10}>
          {SHIPPING.map((s) => (
            <ShippingCard key={s.city} {...s} />
          ))}
        </Grid>

        <Box bg={SURFACE} borderRadius="8px" border={`1px solid ${RULE}`} p={6}>
          <Text fontSize="0.75rem" fontWeight="600" color={MUTED} letterSpacing="0.06em" textTransform="uppercase" mb={5}>
            Major departure ports &amp; hubs
          </Text>
          <Grid templateColumns={{ base: "1fr", sm: "repeat(3,1fr)" }} gap={6}>
            {[
              { name: "Istanbul", detail: "Largest container port in Turkey · 3M TEU/yr" },
              { name: "Izmir", detail: "Second largest port · Mediterranean gateway" },
              { name: "Mersin", detail: "Southern hub · Middle East & North Africa" },
            ].map((port) => (
              <Box key={port.name}>
                <Text fontSize="0.9375rem" fontWeight="600" color={INK}>{port.name}</Text>
                <Text fontSize="0.8125rem" color={MUTED} lineHeight="1.5" mt={1}>{port.detail}</Text>
              </Box>
            ))}
          </Grid>
        </Box>
      </Box>

      <Divider />

      <Box bg={SURFACE} py={{ base: 16, md: 24 }}>
        <Box maxW="1100px" mx="auto" px={{ base: 5, md: 8 }}>
          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
            <Box p={10} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
              <SectionLabel>For buyers</SectionLabel>
              <Heading fontSize="1.375rem" fontWeight="700" color={INK} letterSpacing="-0.02em" mb={5}>
                Procurement without the overhead.
              </Heading>
              <Stack gap={3} mb={8}>
                {[
                  "Post inquiries in any language",
                  "Zero commission — free for buyers",
                  "Side-by-side offer comparison",
                  "Real-time production & cargo tracking",
                  "Full document and PDF management",
                ].map((l) => (
                  <CheckItem key={l}>{l}</CheckItem>
                ))}
              </Stack>
              <CTA to="/register" variant="primary">Start sourcing</CTA>
            </Box>

            <Box p={10} bg="white" borderRadius="8px" border={`1px solid ${RULE}`}>
              <SectionLabel>For partners</SectionLabel>
              <Heading fontSize="1.375rem" fontWeight="700" color={INK} letterSpacing="-0.02em" mb={5}>
                Win qualified leads. No cold calls.
              </Heading>
              <Stack gap={3} mb={8}>
                {[
                  "Pre-qualified inquiry briefs in your niche",
                  "Structured offer submission",
                  "Verified partner badge and rating",
                  "Publish your services and price lists",
                  "Managed client communication",
                ].map((l) => (
                  <CheckItem key={l}>{l}</CheckItem>
                ))}
              </Stack>
              <CTA to="/partners" variant="outline">Apply as a partner</CTA>
            </Box>
          </Grid>
        </Box>
      </Box>

      <Divider />

      <Box position="relative" overflow="hidden">
        <Box position="absolute" inset={0} bgImage={`url(${izmirPng})`} bgSize="cover" bgPosition="center 45%" />
        <Box position="absolute" inset={0} bg="rgba(13,17,23,0.85)" />
        <Box maxW="1100px" mx="auto" px={{ base: 5, md: 8 }} py={{ base: 20, md: 28 }}
          position="relative" zIndex={1}>
          <Heading
            fontSize={{ base: "1.75rem", md: "2.5rem" }}
            fontWeight="700" color="white" letterSpacing="-0.03em" lineHeight="1.15" mb={6} maxW="640px"
          >
            Ready to simplify your Turkish procurement?
          </Heading>
          <Text fontSize={{ base: "1rem", md: "1.0625rem" }} color="rgba(255,255,255,0.65)"
            mb={10} maxW="480px" lineHeight="1.7">
            Join hundreds of buyers sourcing from Turkey's best manufacturers — transparently, efficiently, and without the middlemen.
          </Text>
          <Flex gap={3} flexWrap="wrap">
            <CTA to="/register" variant="white">Post your first inquiry</CTA>
            <CTA to="/login" variant="hero-ghost">Sign in</CTA>
          </Flex>
        </Box>
      </Box>

      <MarketingFooter />
    </Box>
  )
}
