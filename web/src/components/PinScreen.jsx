import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';
import { unlockPin } from '../api/apiFetch.js';

const ERROR_COPY = {
  invalid_pin: 'Fel PIN — försök igen.',
  invalid_format: 'Ange PIN.',
  rate_limited: 'För många försök — vänta en stund och försök igen.',
};

export default function PinScreen({ onUnlocked }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { ok, data } = await unlockPin(pin);
      if (ok) {
        onUnlocked();
        return;
      }
      setError(ERROR_COPY[data.error] ?? 'Kunde inte låsa upp — försök igen.');
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FlexShell>
      <Box as="form" onSubmit={handleSubmit} w="full">
        <VStack spacing={6} align="stretch">
          <Box textAlign="center">
            <Heading as="h1" size="lg">
              Check-in
            </Heading>
            <Text mt={2} color="gray.600" fontSize="md">
              Ange klubbens PIN för att fortsätta
            </Text>
          </Box>

          <FormControl isInvalid={Boolean(error)}>
            <FormLabel htmlFor="club-pin">PIN</FormLabel>
            <Input
              id="club-pin"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              size="lg"
            />
            {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
          </FormControl>

          <Button
            type="submit"
            size="lg"
            colorScheme="teal"
            height="4rem"
            fontSize="lg"
            isLoading={submitting}
            loadingText="Kontrollerar…"
          >
            Lås upp
          </Button>
        </VStack>
      </Box>
    </FlexShell>
  );
}

function FlexShell({ children }) {
  return (
    <Container maxW="container.sm" px={4} py={8} w="full">
      {children}
    </Container>
  );
}
