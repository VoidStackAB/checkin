import { Box, Heading, Text } from '@chakra-ui/react';

export default function AppBrand({ subtitle, size = 'lg' }) {
  return (
    <Box textAlign="center">
      <Box
        mx="auto"
        mb={3}
        w={12}
        h={12}
        borderRadius="2xl"
        bg="teal.500"
        color="white"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="xl"
        fontWeight="bold"
        boxShadow="card"
        aria-hidden
      >
        ✓
      </Box>
      <Heading as="h1" size={size}>
        Check-in
      </Heading>
      {subtitle ? (
        <Text mt={2} color="gray.600" fontSize="md" lineHeight="tall">
          {subtitle}
        </Text>
      ) : null}
    </Box>
  );
}
