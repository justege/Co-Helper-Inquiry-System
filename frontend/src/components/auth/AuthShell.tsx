import { Box, Flex, Heading, HStack, Text, VStack } from "@chakra-ui/react"
import { Link } from "react-router-dom"

export function AuthShell({
  title,
  subtitle,
  footer,
  children,
  promo,
}: {
  title: string
  subtitle: string
  footer: React.ReactNode
  children: React.ReactNode
  promo: AuthPromoProps
}) {
  return (
    <Flex minH="100vh" bg="white">
      <Flex
        flex="1"
        position="relative"
        overflow="hidden"
        flexDir="column"
        bg="#f6f8fc"
      >
        <Box
          display={{ base: "block", lg: "none" }}
          mx={5}
          mt={5}
          px={5}
          py={4}
          rounded="2xl"
          bgGradient="linear(to-r, #3d5afe, #7e57c2)"
          color="white"
          textAlign="center"
          shadow="md"
        >
          <Text fontSize="sm" fontWeight="600" opacity={0.9}>
            {promo.eyebrow}
          </Text>
          <Text fontSize="lg" fontWeight="800" mt={1}>
            {promo.headline} {promo.highlight}
          </Text>
        </Box>

        <Flex
          flex="1"
          align="center"
          justify="center"
          px={{ base: 5, md: 10 }}
          py={{ base: 8, md: 12 }}
          position="relative"
        >
        <AuthLeftDecor />

        <Box position="relative" zIndex={1} w="full" maxW="400px">
          <VStack gap={8} align="stretch">
            <AuthBrand />

            <Box
              bg="white"
              rounded="2xl"
              px={{ base: 6, md: 8 }}
              py={8}
              shadow="0 20px 60px rgba(15, 23, 42, 0.08)"
              border="1px solid"
              borderColor="white"
            >
              <VStack gap={1} align="flex-start" mb={6}>
                <Heading fontSize="1.75rem" fontWeight="800" color="gray.900" letterSpacing="-0.03em">
                  {title}
                </Heading>
                <Text fontSize="sm" color="gray.500" fontWeight="500">
                  {subtitle}
                </Text>
              </VStack>

              {children}
            </Box>

            <Text fontSize="sm" color="gray.500" textAlign="center" fontWeight="500">
              {footer}
            </Text>
          </VStack>
        </Box>
        </Flex>
      </Flex>

      <AuthPromoPanel {...promo} />
    </Flex>
  )
}

export function AuthBrand() {
  return (
    <VStack gap={1} textAlign="center">
      <Heading
        as={Link}
        to="/"
        fontSize="1.5rem"
        fontWeight="800"
        letterSpacing="-0.04em"
        color="gray.900"
        _hover={{ textDecoration: "none", opacity: 0.85 }}
      >
        Boilerplate
      </Heading>
      <Text fontSize="xs" color="gray.400" fontWeight="600" letterSpacing="0.08em" textTransform="uppercase">
        Full-stack starter
      </Text>
    </VStack>
  )
}

function AuthLeftDecor() {
  return (
    <>
      <Box
        position="absolute"
        top="-120px"
        left="-80px"
        w="320px"
        h="320px"
        rounded="full"
        bg="rgba(79, 119, 255, 0.08)"
        filter="blur(2px)"
      />
      <Box
        position="absolute"
        bottom="-100px"
        right="-60px"
        w="280px"
        h="280px"
        rounded="full"
        bg="rgba(99, 102, 241, 0.06)"
      />
      <Box
        position="absolute"
        top="18%"
        right="8%"
        w="120px"
        h="72px"
        rounded="full"
        bg="rgba(255, 255, 255, 0.7)"
        filter="blur(1px)"
      />
      <Box
        position="absolute"
        bottom="22%"
        left="6%"
        w="160px"
        h="90px"
        rounded="full"
        bg="rgba(255, 255, 255, 0.55)"
      />
    </>
  )
}

type AuthPromoProps = {
  eyebrow: string
  headline: React.ReactNode
  highlight: string
  bullets: string[]
  footer: string
}

function AuthPromoPanel({ eyebrow, headline, highlight, bullets, footer }: AuthPromoProps) {
  return (
    <Flex
      display={{ base: "none", lg: "flex" }}
      flex="1"
      position="relative"
      overflow="hidden"
      align="center"
      justify="center"
      px={14}
      py={16}
      bgGradient="linear(to-br, #3d5afe, #5c6bc0 45%, #7e57c2)"
    >
      <Box
        position="absolute"
        inset={0}
        opacity={0.35}
        bgImage="radial-gradient(circle at center, rgba(255,255,255,0.35) 0, rgba(255,255,255,0) 70%)"
        bgSize="120px 120px"
      />

      {[320, 480, 640].map((size, i) => (
        <Box
          key={size}
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          w={`${size}px`}
          h={`${size}px`}
          rounded="full"
          border="1px solid"
          borderColor="whiteAlpha.200"
          opacity={0.5 - i * 0.12}
        />
      ))}

      <VStack gap={10} position="relative" zIndex={1} maxW="420px" textAlign="center">
        <VStack gap={3}>
          <Text fontSize="sm" color="whiteAlpha.800" fontWeight="600" letterSpacing="0.06em" textTransform="uppercase">
            {eyebrow}
          </Text>
          <Heading fontSize="3rem" fontWeight="800" color="white" lineHeight="1.08" letterSpacing="-0.03em">
            {headline}
            <Box as="span" display="block" color="#ffe082">
              {highlight}
            </Box>
          </Heading>
        </VStack>

        <Box
          w="full"
          bg="white"
          rounded="3xl"
          p={8}
          shadow="0 30px 80px rgba(15, 23, 42, 0.25)"
          position="relative"
        >
          <Box
            position="absolute"
            top="-18px"
            left="50%"
            transform="translateX(-50%)"
            w="72px"
            h="72px"
            rounded="full"
            bg="linear-gradient(135deg, #ffd180, #ffb74d)"
            border="4px solid white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="2rem"
          >
            👩‍💻
          </Box>

          <VStack gap={4} pt={8}>
            <Text fontSize="sm" color="gray.500" fontWeight="600">
              Everything you need to launch
            </Text>
            <VStack gap={3} align="stretch" w="full">
              {bullets.map((item) => (
                <HStack key={item} gap={3} align="flex-start">
                  <Box
                    mt={1}
                    w="18px"
                    h="18px"
                    rounded="full"
                    bg="#eef2ff"
                    color="#4f46e5"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="10px"
                    fontWeight="800"
                    flexShrink={0}
                  >
                    ✓
                  </Box>
                  <Text fontSize="sm" color="gray.700" fontWeight="500" textAlign="left">
                    {item}
                  </Text>
                </HStack>
              ))}
            </VStack>
          </VStack>
        </Box>

        <Text fontSize="sm" color="whiteAlpha.700" fontWeight="500">
          {footer}
        </Text>
      </VStack>
    </Flex>
  )
}
