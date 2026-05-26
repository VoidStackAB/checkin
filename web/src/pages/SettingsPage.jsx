import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useOutletContext } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Heading,
  Input,
  Link,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  getMeStatus,
  memberNotFoundMessage,
  sheetsErrorMessage,
} from '../api/checkin.js';
import { patchMember } from '../api/members.js';
import { getMemberIdentity, setMemberIdentity } from '../storage/member.js';
import AppBrand from '../components/AppBrand.jsx';
import FeedbackAlert from '../components/FeedbackAlert.jsx';
import ScreenCard from '../components/ScreenCard.jsx';
import { PageStack } from '../components/PageShell.jsx';

export default function SettingsPage() {
  const { onRequireOnboarding } = useOutletContext();
  const cancelRef = useRef(null);
  const onRequireOnboardingRef = useRef(onRequireOnboarding);
  onRequireOnboardingRef.current = onRequireOnboarding;

  const member = getMemberIdentity();
  const memberId = member?.memberId;

  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loadedFirst, setLoadedFirst] = useState('');
  const [loadedLast, setLoadedLast] = useState('');
  const [optOutRanking, setOptOutRanking] = useState(false);
  const [error, setError] = useState('');
  const [savingNames, setSavingNames] = useState(false);
  const [savingOptOut, setSavingOptOut] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);

  const namesDirty =
    firstName.trim() !== loadedFirst || lastName.trim() !== loadedLast;

  const loadSettings = useCallback(async () => {
    if (!memberId) {
      setLoading(false);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await getMeStatus(memberId);
      if (res.status === 404 && res.data.error === 'member_not_found') {
        onRequireOnboardingRef.current?.();
        setError(memberNotFoundMessage());
        return;
      }
      if (!res.ok) {
        setError(sheetsErrorMessage(res.data.error));
        return;
      }
      const fn = res.data.firstName ?? '';
      const ln = res.data.lastName ?? '';
      setFirstName(fn);
      setLastName(ln);
      setLoadedFirst(fn);
      setLoadedLast(ln);
      setOptOutRanking(Boolean(res.data.optOutRanking));
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function handleSaveNames(event) {
    event.preventDefault();
    if (!memberId || savingNames || !namesDirty) {
      return;
    }
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst || !trimmedLast) {
      setError('Fyll i både förnamn och efternamn.');
      return;
    }
    setError('');
    setSavingNames(true);
    try {
      const res = await patchMember({
        memberId,
        firstName: trimmedFirst,
        lastName: trimmedLast,
      });
      if (res.status === 404 && res.data.error === 'member_not_found') {
        onRequireOnboardingRef.current?.();
        setError(memberNotFoundMessage());
        return;
      }
      if (!res.ok) {
        if (res.data.error === 'invalid_format') {
          setError('Fyll i både förnamn och efternamn.');
          return;
        }
        setError(sheetsErrorMessage(res.data.error));
        return;
      }
      setMemberIdentity({
        memberId: res.data.memberId,
        firstName: res.data.firstName,
        lastName: res.data.lastName,
      });
      setFirstName(res.data.firstName);
      setLastName(res.data.lastName);
      setLoadedFirst(res.data.firstName);
      setLoadedLast(res.data.lastName);
      setOptOutRanking(Boolean(res.data.optOutRanking));
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setSavingNames(false);
    }
  }

  async function handleOptOutChange(next) {
    if (!memberId || savingOptOut) {
      return;
    }
    const previous = optOutRanking;
    setOptOutRanking(next);
    setError('');
    setSavingOptOut(true);
    try {
      const res = await patchMember({ memberId, optOutRanking: next });
      if (res.status === 404 && res.data.error === 'member_not_found') {
        setOptOutRanking(previous);
        onRequireOnboardingRef.current?.();
        setError(memberNotFoundMessage());
        return;
      }
      if (!res.ok) {
        setOptOutRanking(previous);
        setError(sheetsErrorMessage(res.data.error));
        return;
      }
      setOptOutRanking(Boolean(res.data.optOutRanking));
    } catch {
      setOptOutRanking(previous);
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setSavingOptOut(false);
    }
  }

  function handleConfirmSwitch() {
    setSwitchOpen(false);
    onRequireOnboardingRef.current?.();
  }

  return (
    <>
      <PageStack spacing={5}>
        <AppBrand subtitle="Inställningar" />

        {error ? (
          <FeedbackAlert onDismiss={() => setError('')}>{error}</FeedbackAlert>
        ) : null}

        <ScreenCard>
          <form onSubmit={handleSaveNames}>
            <VStack spacing={4} align="stretch">
              <Heading size="sm" color="gray.800">
                Ditt namn
              </Heading>
              <FormControl isDisabled={loading}>
                <FormLabel>Förnamn</FormLabel>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </FormControl>
              <FormControl isDisabled={loading}>
                <FormLabel>Efternamn</FormLabel>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </FormControl>
              <Button
                type="submit"
                colorScheme="teal"
                isDisabled={loading || !namesDirty}
                isLoading={savingNames}
                loadingText="Sparar…"
              >
                Spara
              </Button>
            </VStack>
          </form>
        </ScreenCard>

        <ScreenCard>
          <FormControl
            display="flex"
            alignItems="flex-start"
            justifyContent="space-between"
            isDisabled={loading || savingOptOut}
          >
            <VStack align="start" spacing={1} flex="1" pr={4}>
              <FormLabel htmlFor="opt-out" mb={0} fontWeight="semibold">
                Dölj mig från topplistan
              </FormLabel>
              <FormHelperText mt={0}>
                Du syns inte i den offentliga topplistan. Antal träningar på
                hemskärmen påverkas inte.
              </FormHelperText>
            </VStack>
            <Switch
              id="opt-out"
              colorScheme="teal"
              isChecked={optOutRanking}
              onChange={(e) => handleOptOutChange(e.target.checked)}
            />
          </FormControl>
        </ScreenCard>

        <ScreenCard>
          <VStack spacing={3} align="stretch">
            <Button
              variant="outline"
              colorScheme="gray"
              onClick={() => setSwitchOpen(true)}
            >
              Byt person på telefonen
            </Button>
            <Link
              as={RouterLink}
              to="/privacy"
              fontSize="sm"
              color="teal.600"
              fontWeight="medium"
              textAlign="center"
              _hover={{ color: 'teal.700', textDecoration: 'underline' }}
            >
              Integritet
            </Link>
          </VStack>
        </ScreenCard>
      </PageStack>

      <AlertDialog
        isOpen={switchOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setSwitchOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Byt person på telefonen?
            </AlertDialogHeader>
            <AlertDialogBody>
              <Text>
                Klubbens PIN och ditt samtycke till databehandling behålls på
                den här telefonen. Nästa person behöver registrera sig eller
                koppla ett befintligt namn.
              </Text>
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setSwitchOpen(false)}>
                Avbryt
              </Button>
              <Button colorScheme="teal" onClick={handleConfirmSwitch} ml={3}>
                Fortsätt
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
