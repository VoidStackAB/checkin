import { useState } from 'react';
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  VStack,
} from '@chakra-ui/react';
import {
  createMember,
  matchMembers,
  sheetsErrorMessage,
} from '../api/members.js';
import { setMemberIdentity } from '../storage/member.js';
import AppBrand from './AppBrand.jsx';
import ScreenCard from './ScreenCard.jsx';
import { PageShell, PageStack } from './PageShell.jsx';

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
    <PageShell centered>
      <PageStack>
        <AppBrand subtitle="Ange ditt namn för att komma igång" size="lg" />

        <ScreenCard>
          <VStack
            as="form"
            spacing={5}
            align="stretch"
            onSubmit={handleSubmit}
            w="full"
          >
            <FormControl isRequired isInvalid={Boolean(error)}>
              <FormLabel htmlFor="first-name">Förnamn</FormLabel>
              <Input
                id="first-name"
                name="firstName"
                autoComplete="given-name"
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </FormControl>

            <FormControl isRequired isInvalid={Boolean(error)}>
              <FormLabel htmlFor="last-name">Efternamn</FormLabel>
              <Input
                id="last-name"
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
            </FormControl>

            <Button
              type="submit"
              size="lg"
              height="3.75rem"
              fontSize="lg"
              isLoading={submitting}
              loadingText="Sparar…"
              isDisabled={submitting}
            >
              Fortsätt
            </Button>
          </VStack>
        </ScreenCard>
      </PageStack>
    </PageShell>
  );
}
