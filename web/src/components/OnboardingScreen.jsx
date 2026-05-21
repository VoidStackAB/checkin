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
import {
  createMember,
  matchMembers,
  sheetsErrorMessage,
} from '../api/members.js';
import { setMemberIdentity } from '../storage/member.js';

export default function OnboardingScreen({ onComplete }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      if (!trimmedFirst || !trimmedLast) {
        setError('Fyll i både förnamn och efternamn.');
        return;
      }

      const match = await matchMembers(trimmedFirst, trimmedLast);
      if (!match.ok) {
        setError(sheetsErrorMessage(match.data.error));
        return;
      }

      if (match.data.candidates?.length > 0) {
        setError('Matchning är inte tillgänglig än — försök igen senare.');
        return;
      }

      const created = await createMember(trimmedFirst, trimmedLast);
      if (!created.ok) {
        if (created.data.error === 'invalid_format') {
          setError('Fyll i både förnamn och efternamn.');
          return;
        }
        setError(sheetsErrorMessage(created.data.error));
        return;
      }

      setMemberIdentity({
        memberId: created.data.memberId,
        firstName: created.data.firstName,
        lastName: created.data.lastName,
      });
      onComplete();
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxW="container.sm" px={4} py={8} w="full">
      <Box as="form" onSubmit={handleSubmit} w="full">
        <VStack spacing={6} align="stretch">
          <Box textAlign="center">
            <Heading as="h1" size="lg">
              Välkommen
            </Heading>
            <Text mt={2} color="gray.600" fontSize="md">
              Ange ditt namn för att komma igång
            </Text>
          </Box>

          <FormControl isRequired isInvalid={Boolean(error)}>
            <FormLabel htmlFor="first-name">Förnamn</FormLabel>
            <Input
              id="first-name"
              name="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              size="lg"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel htmlFor="last-name">Efternamn</FormLabel>
            <Input
              id="last-name"
              name="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
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
            loadingText="Sparar…"
            isDisabled={submitting}
          >
            Fortsätt
          </Button>
        </VStack>
      </Box>
    </Container>
  );
}
