import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react';
import { getMemberIdentity } from '../storage/member.js';
import { getMyHistory, sheetsErrorMessage } from '../api/history.js';
import { getMyGroups } from '../api/groups.js';
import { memberNotFoundMessage } from '../api/checkin.js';
import AppBrand from '../components/AppBrand.jsx';
import FeedbackAlert from '../components/FeedbackAlert.jsx';
import ScreenCard from '../components/ScreenCard.jsx';
import CheckinHeatmap from '../components/CheckinHeatmap.jsx';
import AddCheckinDialog from '../components/AddCheckinDialog.jsx';
import { PageStack } from '../components/PageShell.jsx';

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_QUARTER = Math.floor(NOW.getMonth() / 3) + 1;
// How far back the quarter navigation may go.
const MIN_YEAR = CURRENT_YEAR - 2;

const MONTHS_SHORT = [
  'jan',
  'feb',
  'mar',
  'apr',
  'maj',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'dec',
];

const WEEKDAYS_SHORT = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];

function pad2(value) {
  return String(value).padStart(2, '0');
}

function todayString() {
  return `${CURRENT_YEAR}-${pad2(NOW.getMonth() + 1)}-${pad2(NOW.getDate())}`;
}

function quarterRange(year, quarter) {
  const startMonth = (quarter - 1) * 3;
  const start = `${year}-${pad2(startMonth + 1)}-01`;
  const lastDay = new Date(Date.UTC(year, startMonth + 3, 0)).getUTCDate();
  const end = `${year}-${pad2(startMonth + 3)}-${pad2(lastDay)}`;
  return { start, end };
}

function formatEntryDate(iso) {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3) {
    return iso;
  }
  const [y, m, d] = parts;
  const weekday = WEEKDAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${MONTHS_SHORT[m - 1]}`;
}

function NavArrow({ direction, onClick, disabled, label }) {
  return (
    <Box
      as="button"
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      flexShrink={0}
      w="2.5rem"
      h="2.5rem"
      display="flex"
      alignItems="center"
      justifyContent="center"
      borderRadius="lg"
      fontSize="2xl"
      fontWeight="bold"
      lineHeight="1"
      borderWidth="1px"
      color={disabled ? 'gray.300' : 'teal.600'}
      bg={disabled ? 'gray.50' : 'teal.50'}
      borderColor={disabled ? 'gray.200' : 'teal.200'}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      transition="background 0.15s, transform 0.1s"
      _hover={disabled ? undefined : { bg: 'teal.100', borderColor: 'teal.300' }}
      _active={disabled ? undefined : { bg: 'teal.200', transform: 'scale(0.97)' }}
    >
      {direction === 'left' ? '‹' : '›'}
    </Box>
  );
}

function StatBlock({ label, value }) {
  return (
    <VStack spacing={0} align="center" py={2}>
      <Text fontSize="2xl" fontWeight="bold" color="teal.600" lineHeight="1.1">
        {value}
      </Text>
      <Text fontSize="xs" color="gray.500" textAlign="center">
        {label}
      </Text>
    </VStack>
  );
}

export default function HistoryPage() {
  const { onRequireOnboarding } = useOutletContext();
  const onRequireOnboardingRef = useRef(onRequireOnboarding);
  onRequireOnboardingRef.current = onRequireOnboarding;

  const [member] = useState(() => getMemberIdentity());
  const memberId = member?.memberId;

  const [period, setPeriod] = useState({
    year: CURRENT_YEAR,
    quarter: CURRENT_QUARTER,
  });
  const { year, quarter } = period;

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');
  const [myGroups, setMyGroups] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!memberId) {
      return;
    }
    let cancelled = false;
    getMyGroups(memberId)
      .then((res) => {
        if (cancelled || !res.ok) {
          return;
        }
        const groups = Array.isArray(res.data.groups) ? res.data.groups : [];
        setMyGroups(groups.filter((group) => group.isMember));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const loadHistory = useCallback(
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
        const res = await getMyHistory(memberId, year);
        if (res.status === 404 && res.data.error === 'member_not_found') {
          onRequireOnboardingRef.current?.();
          setError(memberNotFoundMessage());
          return;
        }
        if (!res.ok) {
          setError(sheetsErrorMessage(res.data.error));
          return;
        }
        setHistory(res.data);
      } catch {
        setError('Nätverksfel — kontrollera anslutningen och försök igen.');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [memberId, year],
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const entries = useMemo(
    () => (Array.isArray(history?.entries) ? history.entries : []),
    [history],
  );

  const { start: quarterStart, end: quarterEnd } = quarterRange(year, quarter);

  const quarterEntries = useMemo(
    () =>
      entries.filter(
        (entry) => entry.date >= quarterStart && entry.date <= quarterEnd,
      ),
    [entries, quarterStart, quarterEnd],
  );

  const quarterCount = quarterEntries.length;

  const isLatestQuarter =
    year === CURRENT_YEAR && quarter === CURRENT_QUARTER;
  const isEarliestQuarter = year <= MIN_YEAR && quarter === 1;

  function shiftQuarter(delta) {
    setPeriod((prev) => {
      let nextQuarter = prev.quarter + delta;
      let nextYear = prev.year;
      while (nextQuarter < 1) {
        nextQuarter += 4;
        nextYear -= 1;
      }
      while (nextQuarter > 4) {
        nextQuarter -= 4;
        nextYear += 1;
      }
      return { year: nextYear, quarter: nextQuarter };
    });
  }

  return (
    <PageStack spacing={5}>
      <AppBrand subtitle="Din historik" />

      <ScreenCard>
        <VStack spacing={5} align="stretch">
          <Flex align="center" justify="space-between" gap={3}>
            {memberId && !loading && !error ? (
              <StatBlock label="träningar" value={quarterCount} />
            ) : (
              <Box />
            )}
            <Button
              size="sm"
              colorScheme="teal"
              onClick={() => setDialogOpen(true)}
              isDisabled={!memberId}
            >
              Lägg till dag
            </Button>
          </Flex>

          {!memberId ? (
            <Text textAlign="center" color="gray.600" py={4}>
              Registrera dig för att se din historik.
            </Text>
          ) : loading ? (
            <>
              <Skeleton height="20" borderRadius="lg" />
              <Skeleton height="28" borderRadius="lg" />
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
                onClick={() => loadHistory()}
              >
                Försök igen
              </Text>
            </>
          ) : (
            <>
              <HStack spacing={3} justify="center">
                <NavArrow
                  direction="left"
                  label="Tidigare kvartal"
                  onClick={() => shiftQuarter(-1)}
                  disabled={isEarliestQuarter}
                />
                <Text
                  fontWeight="semibold"
                  color="gray.800"
                  fontSize="lg"
                  minW="5rem"
                  textAlign="center"
                >
                  {year} Q{quarter}
                </Text>
                <NavArrow
                  direction="right"
                  label="Nästa kvartal"
                  onClick={() => shiftQuarter(1)}
                  disabled={isLatestQuarter}
                />
              </HStack>

              <CheckinHeatmap
                year={year}
                quarter={quarter}
                entries={quarterEntries}
                today={todayString()}
              />

              {quarterCount === 0 ? (
                <Text fontSize="sm" color="gray.600" textAlign="center">
                  Inga träningar registrerade för {year} Q{quarter} ännu.
                </Text>
              ) : null}
            </>
          )}
        </VStack>
      </ScreenCard>

      {memberId && !loading && !error ? (
        <ScreenCard>
          <VStack spacing={4} align="stretch">
            <Heading size="sm" color="gray.800">
              Incheckningar {year}
            </Heading>
            {entries.length === 0 ? (
              <Text textAlign="center" color="gray.600" py={2}>
                Inga incheckningar ännu.
              </Text>
            ) : (
              <VStack spacing={2} align="stretch" role="list">
                {entries.map((entry, index) => (
                  <Flex
                    key={`${entry.date}-${entry.groupId}-${index}`}
                    align="center"
                    justify="space-between"
                    gap={3}
                    py={2.5}
                    px={3}
                    borderRadius="lg"
                    bg="gray.50"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    <Box minW={0}>
                      <Text fontWeight="semibold" color="gray.800">
                        {formatEntryDate(entry.date)}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {entry.date}
                      </Text>
                    </Box>
                    {myGroups.length > 1 ? (
                      <Badge colorScheme="teal" maxW="50%">
                        <Text noOfLines={1}>{entry.groupName}</Text>
                      </Badge>
                    ) : null}
                  </Flex>
                ))}
              </VStack>
            )}
          </VStack>
        </ScreenCard>
      ) : null}

      <Text fontSize="xs" color="gray.500" textAlign="center">
        Glömde du checka in? Lägg till dagen i efterhand med knappen ovan.
      </Text>

      <AddCheckinDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        member={member}
        groups={myGroups}
        onAdded={() => loadHistory({ silent: true })}
      />
    </PageStack>
  );
}
