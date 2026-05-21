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
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react';
import AppBrand from '../components/AppBrand.jsx';
import FeedbackAlert from '../components/FeedbackAlert.jsx';
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
  const [yearRank, setYearRank] = useState(null);
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
      setMember(getMemberIdentity());
      setCheckedInToday(Boolean(res.data.checkedInToday));
      setYearCount(res.data.yearCount ?? 0);
      setYearRank(
        typeof res.data.rank === 'number' ? res.data.rank : null,
      );
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
              <Skeleton height="5" borderRadius="md" />
              <Skeleton height="4" width="60%" borderRadius="md" />
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
                  fontSize="2xl"
                  fontWeight="bold"
                  color={checkedInToday ? 'green.800' : 'gray.800'}
                >
                  {yearCount}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  träningar i år
                </Text>
                {yearRank !== null ? (
                  <Text mt={2} fontSize="sm" color="gray.700">
                    Du ligger på plats {yearRank} i år
                  </Text>
                ) : null}
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
    </PageStack>
  );
}
