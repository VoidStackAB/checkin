import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
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
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react';
import AppBrand from '../components/AppBrand.jsx';
import FeedbackAlert from '../components/FeedbackAlert.jsx';
import {
  checkinDockBottom,
  homeContentPaddingBottom,
} from '../components/layoutConstants.js';
import ScreenCard from '../components/ScreenCard.jsx';
import { PageStack } from '../components/PageShell.jsx';

export default function HomePage() {
  const { onRequireOnboarding } = useOutletContext();
  const [member, setMember] = useState(() => getMemberIdentity());
  const onRequireOnboardingRef = useRef(onRequireOnboarding);
  onRequireOnboardingRef.current = onRequireOnboarding;

  const [statusLoading, setStatusLoading] = useState(true);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [yearCount, setYearCount] = useState(0);
  const [error, setError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const memberId = member?.memberId;

  const loadStatus = useCallback(async ({ silent = false } = {}) => {
    if (!memberId) {
      setStatusLoading(false);
      return;
    }
    setError('');
    if (!silent) {
      setStatusLoading(true);
    }
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
      setMember(getMemberIdentity());
      setCheckedInToday(Boolean(res.data.checkedInToday));
      setYearCount(res.data.yearCount ?? 0);
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      if (!silent) {
        setStatusLoading(false);
      }
    }
  }, [memberId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleCheckin() {
    const current = getMemberIdentity();
    if (!current || checkedInToday || checkingIn || statusLoading) {
      return;
    }
    setError('');
    setCheckingIn(true);
    try {
      const res = await postCheckin({
        memberId: current.memberId,
        firstName: current.firstName,
        lastName: current.lastName,
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
        loadStatus({ silent: true });
      }
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setCheckingIn(false);
    }
  }

  const buttonDisabled = statusLoading || checkedInToday || checkingIn;
  const buttonLabel = checkedInToday ? 'Redan incheckad idag' : 'Checka in idag';
  const displayMember = member ?? getMemberIdentity();

  return (
    <Flex direction="column" flex="1" w="full" minH={0}>
      <Box flex="1" pb={homeContentPaddingBottom()}>
        <PageStack spacing={5}>
          <AppBrand
            subtitle={
              displayMember
                ? `Hej, ${displayMember.firstName}!`
                : 'Träningscheck-in för klubben'
            }
          />

          <ScreenCard>
            <VStack spacing={4} align="stretch">
              {statusLoading ? (
                <>
                  <Skeleton height="20" borderRadius="xl" />
                  <Skeleton height="16" borderRadius="xl" />
                  <Skeleton height="4" width="80%" borderRadius="md" />
                </>
              ) : displayMember ? (
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
                      fontSize="3xl"
                      fontWeight="bold"
                      lineHeight="1"
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
                      Knappen längst ned checkar in när du är på plats.
                    </Text>
                  )}
                </>
              ) : null}
            </VStack>
          </ScreenCard>
        </PageStack>
      </Box>

      <Box
        position="fixed"
        left={0}
        right={0}
        bottom={checkinDockBottom()}
        zIndex={9}
        bg="white"
        borderTopWidth="1px"
        borderColor="gray.200"
        boxShadow="0 -4px 16px rgba(0, 0, 0, 0.06)"
      >
        <Container maxW="container.sm" px={4} py={3}>
          <VStack spacing={3} align="stretch">
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
              w="full"
              onClick={handleCheckin}
              isDisabled={buttonDisabled}
              isLoading={checkingIn}
              loadingText="Checkar in…"
            >
              {buttonLabel}
            </Button>
          </VStack>
        </Container>
      </Box>
    </Flex>
  );
}
