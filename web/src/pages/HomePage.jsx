import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useOutletContext } from 'react-router-dom';
import { getMemberIdentity } from '../storage/member.js';
import {
  getMeStatus,
  memberNotFoundMessage,
  postCheckin,
  sheetsErrorMessage,
} from '../api/checkin.js';
import { getGroupCheckins } from '../api/groups.js';
import GroupCheckinDialog from '../components/GroupCheckinDialog.jsx';
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Link,
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

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const memberId = member?.memberId;

  const loadGroups = useCallback(
    async ({ silent = false } = {}) => {
      if (!memberId) {
        setLoading(false);
        return;
      }
      setError('');
      if (!silent) {
        setLoading(true);
      }
      try {
        const res = await getGroupCheckins(memberId);
        if (res.status === 404 && res.data.error === 'member_not_found') {
          onRequireOnboardingRef.current?.();
          setError(memberNotFoundMessage());
          return;
        }
        if (!res.ok) {
          setError(sheetsErrorMessage(res.data.error));
          return;
        }
        setGroups(Array.isArray(res.data.groups) ? res.data.groups : []);
      } catch {
        setError('Nätverksfel — kontrollera anslutningen och försök igen.');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [memberId],
  );

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (!memberId) {
      return;
    }
    // Silent identity sync so the greeting matches the sheet after link.
    getMeStatus(memberId)
      .then(() => setMember(getMemberIdentity()))
      .catch(() => {});
  }, [memberId]);

  async function checkInToGroup(group) {
    const current = getMemberIdentity();
    if (!current || checkingIn) {
      return;
    }
    setError('');
    setCheckingIn(true);
    try {
      const res = await postCheckin({
        memberId: current.memberId,
        firstName: current.firstName,
        lastName: current.lastName,
        groupId: group.groupId,
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
      await loadGroups({ silent: true });
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setCheckingIn(false);
    }
  }

  function handleCheckinButton() {
    if (groups.length === 1) {
      checkInToGroup(groups[0]);
      return;
    }
    setDialogOpen(true);
  }

  const displayMember = member ?? getMemberIdentity();
  const singleDone = groups.length === 1 && groups[0].checkedInToday;
  const buttonDisabled =
    loading || checkingIn || groups.length === 0 || singleDone;
  const buttonLabel = singleDone ? 'Redan incheckad idag' : 'Checka in';

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
              <Heading size="sm" color="gray.800">
                Dina grupper
              </Heading>

              {loading ? (
                <>
                  <Skeleton height="16" borderRadius="xl" />
                  <Skeleton height="16" borderRadius="xl" />
                </>
              ) : groups.length === 0 ? (
                <VStack spacing={2} align="stretch" py={2}>
                  <Text textAlign="center" color="gray.600">
                    Du är inte med i någon grupp.
                  </Text>
                  <Link
                    as={RouterLink}
                    to="/settings"
                    fontSize="sm"
                    color="teal.600"
                    fontWeight="medium"
                    textAlign="center"
                    _hover={{ color: 'teal.700', textDecoration: 'underline' }}
                  >
                    Gå med i en grupp under Inställningar
                  </Link>
                </VStack>
              ) : (
                groups.map((group) => (
                  <Flex
                    key={group.groupId}
                    align="center"
                    justify="space-between"
                    gap={3}
                    py={3}
                    px={4}
                    borderRadius="xl"
                    bg={group.checkedInToday ? 'green.50' : 'gray.50'}
                    borderWidth="1px"
                    borderColor={
                      group.checkedInToday ? 'green.200' : 'gray.200'
                    }
                  >
                    <Box flex="1" minW={0}>
                      <Text
                        fontWeight="semibold"
                        color="gray.800"
                        noOfLines={1}
                      >
                        {group.name}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {group.yearCount} träningar i år
                      </Text>
                    </Box>
                    <Badge colorScheme={group.checkedInToday ? 'green' : 'gray'}>
                      {group.checkedInToday ? 'Incheckad' : 'Inte incheckad'}
                    </Badge>
                  </Flex>
                ))
              )}
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
              colorScheme={singleDone ? 'green' : 'teal'}
              height="3.75rem"
              fontSize="lg"
              w="full"
              onClick={handleCheckinButton}
              isDisabled={buttonDisabled}
              isLoading={checkingIn}
              loadingText="Checkar in…"
            >
              {buttonLabel}
            </Button>
          </VStack>
        </Container>
      </Box>

      <GroupCheckinDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        member={displayMember}
        onCheckedIn={() => loadGroups({ silent: true })}
      />
    </Flex>
  );
}
