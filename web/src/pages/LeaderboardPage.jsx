import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Flex,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react';
import { getLeaderboard } from '../api/leaderboard.js';
import { sheetsErrorMessage } from '../api/checkin.js';
import AppBrand from '../components/AppBrand.jsx';
import FeedbackAlert from '../components/FeedbackAlert.jsx';
import ScreenCard from '../components/ScreenCard.jsx';
import { PageStack } from '../components/PageShell.jsx';

function displayName(entry) {
  return `${entry.firstName} ${entry.lastName}`.trim();
}

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
                <Flex
                  key={`${entry.rank}-${entry.firstName}-${entry.lastName}-${index}`}
                  role="listitem"
                  align="center"
                  gap={3}
                  py={2}
                  px={1}
                  borderBottomWidth={
                    index < entries.length - 1 ? '1px' : undefined
                  }
                  borderColor="gray.100"
                >
                  <Badge
                    colorScheme="teal"
                    fontSize="md"
                    px={2}
                    py={1}
                    borderRadius="md"
                    flexShrink={0}
                  >
                    #{entry.rank}
                  </Badge>
                  <Box flex="1" minW={0}>
                    <Text fontWeight="semibold" noOfLines={1}>
                      {displayName(entry)}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {entry.yearCount} träningar
                    </Text>
                  </Box>
                </Flex>
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
