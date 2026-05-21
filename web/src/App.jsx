import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { getSession } from './api/apiFetch.js';
import PinScreen from './components/PinScreen.jsx';

const NAV_ITEMS = [
  { id: 'home', label: 'Hem' },
  { id: 'leaderboard', label: 'Topplista' },
  { id: 'settings', label: 'Inställningar' },
];

export default function App() {
  const [gate, setGate] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    getSession()
      .then(({ unlocked }) => {
        if (!cancelled) {
          setGate(unlocked ? 'app' : 'pin');
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

  if (gate === 'loading') {
    return (
      <Flex
        direction="column"
        minH="100dvh"
        bg="gray.50"
        align="center"
        justify="center"
      >
        <Spinner size="lg" color="teal.500" />
      </Flex>
    );
  }

  if (gate === 'pin') {
    return (
      <Flex direction="column" minH="100dvh" bg="gray.50" align="center">
        <PinScreen onUnlocked={() => setGate('app')} />
      </Flex>
    );
  }

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
            <Text mt={2} color="gray.600" fontSize="md">
              Träningscheck-in för klubben
            </Text>
          </Box>

          <Button
            size="lg"
            colorScheme="teal"
            height="4rem"
            fontSize="lg"
            isDisabled
          >
            Incheckning
          </Button>

          <Text textAlign="center" fontSize="sm" color="gray.500">
            Kommer snart — incheckning i nästa steg.
          </Text>
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
