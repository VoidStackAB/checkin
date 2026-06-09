import { useCallback, useEffect, useState } from 'react';
import { FormControl, FormLabel, Select, Skeleton, Text, VStack } from '@chakra-ui/react';
import { getLeaderboard } from '../api/leaderboard.js';
import { getAllGroups } from '../api/groups.js';
import { sheetsErrorMessage } from '../api/checkin.js';
import AppBrand from '../components/AppBrand.jsx';
import FeedbackAlert from '../components/FeedbackAlert.jsx';
import LeaderboardRow from '../components/LeaderboardRow.jsx';
import ScreenCard from '../components/ScreenCard.jsx';
import { PageStack } from '../components/PageShell.jsx';

const DEFAULT_GROUP_ID = 'default';

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState(DEFAULT_GROUP_ID);

  useEffect(() => {
    let cancelled = false;
    getAllGroups()
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
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await getLeaderboard(groupId);
      if (!res.ok) {
        setError(sheetsErrorMessage(res.data.error));
        return;
      }
      setEntries(Array.isArray(res.data.entries) ? res.data.entries : []);
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <PageStack spacing={5}>
      <AppBrand subtitle="Topplista i år" />

      <ScreenCard>
        <VStack spacing={4} align="stretch">
          {groups.length > 1 ? (
            <FormControl>
              <FormLabel fontSize="sm" color="gray.600" mb={1}>
                Grupp
              </FormLabel>
              <Select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                focusBorderColor="teal.400"
              >
                {groups.map((group) => (
                  <option key={group.groupId} value={group.groupId}>
                    {group.name}
                  </option>
                ))}
              </Select>
            </FormControl>
          ) : null}

          {!loading && !error && entries.length > 0 ? (
            <Text fontSize="sm" color="gray.600" textAlign="center">
              Sorterat efter antal träningar i år.
            </Text>
          ) : null}

          {loading ? (
            <>
              <Skeleton height="14" borderRadius="lg" />
              <Skeleton height="14" borderRadius="lg" />
              <Skeleton height="14" borderRadius="lg" />
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
                onClick={loadLeaderboard}
              >
                Försök igen
              </Text>
            </>
          ) : entries.length === 0 ? (
            <Text textAlign="center" color="gray.600" py={4}>
              Ingen har checkat in i den här gruppen i år ännu.
            </Text>
          ) : (
            <VStack spacing={3} align="stretch" role="list">
              {entries.map((entry, index) => (
                <LeaderboardRow
                  key={`${entry.rank}-${entry.firstName}-${entry.lastName}-${index}`}
                  entry={entry}
                  index={index}
                  total={entries.length}
                />
              ))}
            </VStack>
          )}
        </VStack>
      </ScreenCard>

      {!loading && !error && entries.length > 0 ? (
        <Text fontSize="xs" color="gray.500" textAlign="center">
          Visar alla med plats 10 eller bättre. Vid lika antal träningar delas
          platsnummer.
        </Text>
      ) : null}
    </PageStack>
  );
}
