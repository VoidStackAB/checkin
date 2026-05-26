import { useCallback, useEffect, useState } from 'react';
import {
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react';
import { getLeaderboard } from '../api/leaderboard.js';
import { sheetsErrorMessage } from '../api/checkin.js';
import AppBrand from '../components/AppBrand.jsx';
import FeedbackAlert from '../components/FeedbackAlert.jsx';
import LeaderboardRow from '../components/LeaderboardRow.jsx';
import ScreenCard from '../components/ScreenCard.jsx';
import { PageStack } from '../components/PageShell.jsx';

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');

  const loadLeaderboard = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const res = await getLeaderboard();
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
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <PageStack spacing={5}>
      <AppBrand subtitle="Topplista i år" />

      <ScreenCard>
        <VStack spacing={4} align="stretch">
          {!loading && !error && entries.length > 0 ? (
            <Text fontSize="sm" color="gray.600" textAlign="center">
              Sorterat efter antal träningar. Vid lika antal delas platsnummer.
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
              Ingen har checkat in i år ännu.
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
          Visar medlemmar som checkat in minst en gång i år.
        </Text>
      ) : null}
    </PageStack>
  );
}
