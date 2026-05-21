import { Box, Container, Flex } from '@chakra-ui/react';

export function PageShell({
  children,
  centered = false,
  withNav = false,
  maxW = 'container.sm',
}) {
  return (
    <Flex
      direction="column"
      minH="100dvh"
      bgGradient="linear(to-b, gray.50, gray.100)"
      align={centered ? 'center' : 'stretch'}
      justify={centered ? 'center' : 'flex-start'}
    >
      <Container
        maxW={maxW}
        px={4}
        pt="max(1.5rem, env(safe-area-inset-top))"
        pb={withNav ? '6rem' : 8}
        w="full"
        flex={centered ? '0 1 auto' : '1'}
      >
        {children}
      </Container>
    </Flex>
  );
}

export function PageStack({ children, spacing = 6 }) {
  return (
    <Flex direction="column" gap={spacing} w="full">
      {children}
    </Flex>
  );
}
