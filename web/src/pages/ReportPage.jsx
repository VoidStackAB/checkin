import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  Skeleton,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  getTrainerGroups,
  getTrainerReport,
  getTrainerSession,
  sheetsErrorMessage,
} from '../api/trainer.js';
import AppBrand from '../components/AppBrand.jsx';
import FeedbackAlert from '../components/FeedbackAlert.jsx';
import ScreenCard from '../components/ScreenCard.jsx';
import TrainerPinScreen from '../components/TrainerPinScreen.jsx';
import { PageShell, PageStack } from '../components/PageShell.jsx';

const DEFAULT_GROUP_ID = 'default';

const WEEKDAYS = [
  'söndag',
  'måndag',
  'tisdag',
  'onsdag',
  'torsdag',
  'fredag',
  'lördag',
];
const MONTHS = [
  'januari',
  'februari',
  'mars',
  'april',
  'maj',
  'juni',
  'juli',
  'augusti',
  'september',
  'oktober',
  'november',
  'december',
];

function pad2(value) {
  return String(value).padStart(2, '0');
}

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function formatLongDate(iso) {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return iso;
  }
  const [y, m, d] = parts;
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[date.getUTCDay()]} ${d} ${MONTHS[m - 1]} ${y}`;
}

export default function ReportPage() {
  const [gate, setGate] = useState('loading');

  const [date, setDate] = useState(todayString);
  const [groupId, setGroupId] = useState(DEFAULT_GROUP_ID);
  const [groups, setGroups] = useState([]);

  const [loading, setLoading] = useState(false);
  const [checkins, setCheckins] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getTrainerSession()
      .then(({ unlocked }) => {
        if (!cancelled) {
          setGate(unlocked ? 'ready' : 'pin');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGate('pin');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (gate !== 'ready') {
      return undefined;
    }
    let cancelled = false;
    getTrainerGroups()
      .then((res) => {
        if (cancelled || !res.ok) {
          return;
        }
        setGroups(Array.isArray(res.data.groups) ? res.data.groups : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [gate]);

  const loadReport = useCallback(async () => {
    if (gate !== 'ready' || !date) {
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await getTrainerReport(date, groupId);
      if (res.status === 401) {
        setGate('pin');
        return;
      }
      if (!res.ok) {
        setError(sheetsErrorMessage(res.data.error));
        return;
      }
      setCheckins(Array.isArray(res.data.checkins) ? res.data.checkins : []);
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setLoading(false);
    }
  }, [gate, date, groupId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (gate === 'loading') {
    return (
      <PageShell centered>
        <VStack spacing={8}>
          <AppBrand subtitle="Laddar…" />
          <Spinner size="lg" color="teal.500" thickness="3px" />
        </VStack>
      </PageShell>
    );
  }

  if (gate === 'pin') {
    return <TrainerPinScreen onUnlocked={() => setGate('ready')} />;
  }

  return (
    <PageShell>
      <PageStack spacing={5}>
        <AppBrand subtitle="Tränarrapport — incheckningar per dag" />

        <ScreenCard>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600" mb={1}>
                Datum
              </FormLabel>
              <Input
                type="date"
                value={date}
                max={todayString()}
                onChange={(e) => setDate(e.target.value)}
                focusBorderColor="teal.400"
              />
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600" mb={1}>
                Grupp
              </FormLabel>
              <Select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                focusBorderColor="teal.400"
              >
                {groups.length === 0 ? (
                  <option value={DEFAULT_GROUP_ID}>Standard</option>
                ) : (
                  groups.map((group) => (
                    <option key={group.groupId} value={group.groupId}>
                      {group.name}
                    </option>
                  ))
                )}
              </Select>
            </FormControl>
          </VStack>
        </ScreenCard>

        <ScreenCard>
          <VStack spacing={4} align="stretch">
            <Flex align="center" justify="space-between" gap={3}>
              <Text fontWeight="semibold" color="gray.800">
                {formatLongDate(date)}
              </Text>
              {!loading && !error ? (
                <Badge colorScheme="teal" fontSize="sm" px={2} py={1}>
                  {checkins.length}{' '}
                  {checkins.length === 1 ? 'incheckad' : 'incheckade'}
                </Badge>
              ) : null}
            </Flex>

            {loading ? (
              <>
                <Skeleton height="12" borderRadius="lg" />
                <Skeleton height="12" borderRadius="lg" />
                <Skeleton height="12" borderRadius="lg" />
              </>
            ) : error ? (
              <>
                <FeedbackAlert onDismiss={() => setError('')}>
                  {error}
                </FeedbackAlert>
                <Text
                  as="button"
                  type="button"
                  fontSize="sm"
                  color="teal.600"
                  fontWeight="semibold"
                  textAlign="center"
                  onClick={loadReport}
                >
                  Försök igen
                </Text>
              </>
            ) : checkins.length === 0 ? (
              <Text textAlign="center" color="gray.600" py={4}>
                Ingen checkade in den här dagen i vald grupp.
              </Text>
            ) : (
              <VStack spacing={2} align="stretch" role="list">
                {checkins.map((entry, index) => (
                  <Flex
                    key={`${entry.memberId}-${index}`}
                    align="center"
                    gap={3}
                    py={2.5}
                    px={3}
                    borderRadius="lg"
                    bg="gray.50"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    <Box
                      flexShrink={0}
                      w={7}
                      textAlign="right"
                      color="gray.400"
                      fontSize="sm"
                      fontWeight="semibold"
                    >
                      {index + 1}
                    </Box>
                    <Text fontWeight="medium" color="gray.800" noOfLines={1}>
                      {entry.name || 'Okänd medlem'}
                    </Text>
                  </Flex>
                ))}
              </VStack>
            )}
          </VStack>
        </ScreenCard>
      </PageStack>
    </PageShell>
  );
}
