import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { getMemberIdentity } from '../storage/member.js';
import {
  getMeStatus,
  memberNotFoundMessage,
  postCheckin,
  sheetsErrorMessage,
} from '../api/checkin.js';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Link,
  Text,
  VStack,
} from '@chakra-ui/react';

const NAV_ITEMS = [
  { id: 'home', label: 'Hem' },
  { id: 'leaderboard', label: 'Topplista' },
  { id: 'settings', label: 'Inställningar' },
];

export default function AppShell({ onRequireOnboarding }) {
  const member = getMemberIdentity();
  const onRequireOnboardingRef = useRef(onRequireOnboarding);
  onRequireOnboardingRef.current = onRequireOnboarding;

  const [statusLoading, setStatusLoading] = useState(true);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [yearCount, setYearCount] = useState(0);
  const [error, setError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const memberId = member?.memberId;

  const loadStatus = useCallback(async () => {
    if (!memberId) {
      setStatusLoading(false);
      return;
    }
    setError('');
    setStatusLoading(true);
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
      setCheckedInToday(Boolean(res.data.checkedInToday));
      setYearCount(res.data.yearCount ?? 0);
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setStatusLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleCheckin() {
    if (!member || checkedInToday || checkingIn || statusLoading) {
      return;
    }
    setError('');
    setCheckingIn(true);
    try {
      const res = await postCheckin({
        memberId: member.memberId,
        firstName: member.firstName,
        lastName: member.lastName,
      });
      if (res.status === 404 && res.data.error === 'member_not_found') {
        onRequireOnboardingRef.current?.();
        setError(memberNotFoundMessage());
        return;
      }
      if (!res.ok) {
        if (res.data.error === 'invalid_format') {
          setError('Profilen är ofullständig — registrera dig igen.');
          return;
        }
        setError(sheetsErrorMessage(res.data.error));
        return;
      }
      if (
        res.data.status === 'checked_in' ||
        res.data.status === 'already_checked_in'
      ) {
        setCheckedInToday(true);
        setYearCount(res.data.yearCount ?? yearCount);
      }
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setCheckingIn(false);
    }
  }

  const buttonDisabled = statusLoading || checkedInToday || checkingIn;
  const buttonLabel = checkedInToday ? 'Redan incheckad' : 'Checka in idag';

  return (
    <Flex direction="column" minH="100dvh" bg="gray.50">
      <Container
        as="main"
        flex="1"
        maxW="container.sm"
        px={4}
        py={8}
        pb="5rem"
      >
        <VStack spacing={6} align="stretch">
          <Box textAlign="center">
            <Heading as="h1" size="lg">
              Check-in
            </Heading>
            {member ? (
              <>
                <Text mt={2} color="gray.700" fontSize="lg">
                  Hej, {member.firstName}!
                </Text>
                {!statusLoading && (
                  <Text mt={1} color="gray.600" fontSize="md">
                    {yearCount} träningar i år
                  </Text>
                )}
              </>
            ) : (
              <Text mt={2} color="gray.600" fontSize="md">
                Träningscheck-in för klubben
              </Text>
            )}
          </Box>

          {error ? (
            <Text textAlign="center" color="red.600" fontSize="sm">
              {error}
            </Text>
          ) : null}

          <Button
            size="lg"
            colorScheme="teal"
            height="4rem"
            fontSize="lg"
            onClick={handleCheckin}
            isDisabled={buttonDisabled}
            isLoading={checkingIn}
            loadingText="Checkar in…"
          >
            {buttonLabel}
          </Button>

          <Link
            as={RouterLink}
            to="/privacy"
            fontSize="sm"
            color="teal.600"
            textAlign="center"
          >
            Integritet
          </Link>
        </VStack>
      </Container>

      <Box
        as="nav"
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        borderTopWidth="1px"
        borderColor="gray.200"
        bg="white"
        pb="env(safe-area-inset-bottom, 0)"
      >
        <Flex maxW="container.sm" mx="auto">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.id}
              flex="1"
              variant="ghost"
              borderRadius={0}
              py={4}
              fontSize="sm"
              isDisabled
              color="gray.600"
            >
              {item.label}
            </Button>
          ))}
        </Flex>
      </Box>
    </Flex>
  );
}
