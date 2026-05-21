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
  Link,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react';
import AppBrand from './AppBrand.jsx';
import BottomNav from './BottomNav.jsx';
import FeedbackAlert from './FeedbackAlert.jsx';
import ScreenCard from './ScreenCard.jsx';

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
  const buttonLabel = checkedInToday ? 'Redan incheckad idag' : 'Checka in idag';

  return (
    <Flex
      direction="column"
      minH="100dvh"
      bgGradient="linear(to-b, gray.50, gray.100)"
    >
      <Container
        as="main"
        flex="1"
        maxW="container.sm"
        px={4}
        pt="max(1.5rem, env(safe-area-inset-top))"
        pb="6rem"
      >
        <VStack spacing={5} align="stretch">
          <AppBrand
            subtitle={
              member
                ? `Hej, ${member.firstName}!`
                : 'Träningscheck-in för klubben'
            }
          />

          <ScreenCard>
            <VStack spacing={4} align="stretch">
              {statusLoading ? (
                <>
                  <Skeleton height="5" borderRadius="md" />
                  <Skeleton height="4" width="60%" borderRadius="md" />
                </>
              ) : member ? (
                <>
                  <Box
                    py={3}
                    px={4}
                    borderRadius="xl"
                    bg={checkedInToday ? 'green.50' : 'gray.50'}
                    borderWidth="1px"
                    borderColor={checkedInToday ? 'green.200' : 'gray.200'}
                    textAlign="center"
                  >
                    <Text
                      fontSize="sm"
                      fontWeight="semibold"
                      color={checkedInToday ? 'green.700' : 'gray.600'}
                      textTransform="uppercase"
                      letterSpacing="wider"
                    >
                      {checkedInToday ? 'Incheckad' : 'Inte incheckad'}
                    </Text>
                    <Text
                      mt={1}
                      fontSize="2xl"
                      fontWeight="bold"
                      color={checkedInToday ? 'green.800' : 'gray.800'}
                    >
                      {yearCount}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      träningar i år
                    </Text>
                  </Box>

                  {checkedInToday ? (
                    <Text textAlign="center" fontSize="sm" color="gray.600">
                      Bra jobbat — vi ses på nästa pass!
                    </Text>
                  ) : (
                    <Text textAlign="center" fontSize="sm" color="gray.600">
                      Tryck nedan när du är på plats.
                    </Text>
                  )}
                </>
              ) : null}

              {error ? (
                <FeedbackAlert onDismiss={() => setError('')}>
                  {error}
                </FeedbackAlert>
              ) : null}

              <Button
                size="lg"
                colorScheme={checkedInToday ? 'green' : 'teal'}
                height="3.75rem"
                fontSize="lg"
                onClick={handleCheckin}
                isDisabled={buttonDisabled}
                isLoading={checkingIn}
                loadingText="Checkar in…"
              >
                {buttonLabel}
              </Button>
            </VStack>
          </ScreenCard>

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
      </Container>

      <BottomNav />
    </Flex>
  );
}
