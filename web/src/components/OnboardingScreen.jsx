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
  linkMember,
  matchMembers,
  sheetsErrorMessage,
} from '../api/members.js';
import { setMemberIdentity } from '../storage/member.js';
import AppBrand from './AppBrand.jsx';
import FuzzyMatchConfirm from './FuzzyMatchConfirm.jsx';
import ScreenCard from './ScreenCard.jsx';
import { PageShell, PageStack } from './PageShell.jsx';

export default function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState('names');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function finishWithIdentity({ memberId, firstName: fn, lastName: ln }) {
    setMemberIdentity({ memberId, firstName: fn, lastName: ln });
    onComplete();
  }

  async function createWithTypedNames(trimmedFirst, trimmedLast) {
    const created = await createMember(trimmedFirst, trimmedLast);
    if (!created.ok) {
      if (created.data.error === 'invalid_format') {
        setError('Fyll i både förnamn och efternamn.');
        return;
      }
      setError(sheetsErrorMessage(created.data.error));
      return;
    }
    await finishWithIdentity({
      memberId: created.data.memberId,
      firstName: created.data.firstName,
      lastName: created.data.lastName,
    });
  }

  async function handleNameSubmit(event) {
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
        setCandidates(match.data.candidates);
        setStep('confirm');
        return;
      }

      await createWithTypedNames(trimmedFirst, trimmedLast);
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmLink(memberId) {
    if (!memberId || submitting) {
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const linked = await linkMember(memberId);
      if (!linked.ok) {
        if (linked.data.error === 'member_not_found') {
          setError('Medlemmen hittades inte — gå tillbaka och försök igen.');
          return;
        }
        setError(sheetsErrorMessage(linked.data.error));
        return;
      }
      await finishWithIdentity({
        memberId: linked.data.memberId,
        firstName: linked.data.firstName,
        lastName: linked.data.lastName,
      });
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateNew() {
    if (submitting) {
      return;
    }
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    setError('');
    setSubmitting(true);
    try {
      await createWithTypedNames(trimmedFirst, trimmedLast);
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    setCandidates([]);
    setError('');
    setStep('names');
  }

  if (step === 'confirm') {
    return (
      <FuzzyMatchConfirm
        candidates={candidates}
        onBack={handleBack}
        onConfirmLink={handleConfirmLink}
        onCreateNew={handleCreateNew}
        submitting={submitting}
        error={error}
      />
    );
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
            onSubmit={handleNameSubmit}
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
