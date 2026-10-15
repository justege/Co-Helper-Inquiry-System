import { Box, Flex, Text } from "@chakra-ui/react"

const BOOKED_UNTIL = "01.01.2027"

export default function AvailabilityBanner() {
  return (
    <Box
      as="header"
      role="status"
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={40}
      className="availability-banner"
      pt="env(safe-area-inset-top)"
    >
      <Flex align="center" justify="center" gap={{ base: 2.5, md: 3 }} minH="var(--availability-banner)" px={4} py="11px">
        <Box
          aria-hidden
          flexShrink={0}
          w="6px"
          h="6px"
          borderRadius="full"
          bg="#D8FF86"
          boxShadow="0 0 0 4px rgba(216, 255, 134, 0.14)"
        />
        <Text
          as="p"
          textAlign="center"
          lineHeight="1.35"
          fontSize={{ base: "0.75rem", md: "0.8125rem" }}
          fontWeight="500"
          letterSpacing="-0.011em"
          color="rgba(255,255,255,0.9)"
        >
          <Text
            as="span"
            display={{ base: "none", sm: "inline" }}
            mr={{ base: 0, sm: 2.5 }}
            fontSize="0.625rem"
            fontWeight="600"
            letterSpacing="0.16em"
            textTransform="uppercase"
            color="#D8FF86"
          >
            Availability
          </Text>
          I’m currently fully booked until{" "}
          <Text
            as="span"
            fontFamily="'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
            fontWeight="500"
            letterSpacing="-0.03em"
            color="white"
          >
            {BOOKED_UNTIL}
          </Text>
        </Text>
      </Flex>
    </Box>
  )
}
