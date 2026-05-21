import { useState } from 'react';
import {
  Box,
  Button,
  Radio,
  RadioGroup,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import AppBrand from './AppBrand.jsx';
import ScreenCard from './ScreenCard.jsx';
import { PageShell, PageStack } from './PageShell.jsx';

export default function FuzzyMatchConfirm({
  candidates,
  onBack,
  onConfirmLink,
  onCreateNew,
  submitting,
  error,
}) {
  const [selectedId, setSelectedId] = useState('');

  return (
    <PageShell centered>
      <PageStack>
        <AppBrand subtitle="Är det här du?" size="lg" />

        <ScreenCard>
          <VStack spacing={5} align="stretch" w="full">
            <RadioGroup value={selectedId} onChange={setSelectedId}>
              <Stack spacing={3}>
                {candidates.map((candidate) => (
                  <Box
                    key={candidate.memberId}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor={
                      selectedId === candidate.memberId
                        ? 'blue.500'
                        : 'gray.200'
                    }
                    p={4}
                  >
                    <Radio value={candidate.memberId} w="full">
                      <Box ml={2}>
                        <Text fontWeight="semibold" fontSize="lg">
                          {candidate.displayName}
                        </Text>
                        <Text color="gray.600" fontSize="sm">
                          {candidate.yearCount} träningar i år
                        </Text>
                      </Box>
                    </Radio>
                  </Box>
                ))}
              </Stack>
            </RadioGroup>

            {error ? (
              <Text color="red.500" fontSize="sm">
                {error}
              </Text>
            ) : null}

            <Button
              size="lg"
              height="3.75rem"
              fontSize="lg"
              onClick={() => onConfirmLink(selectedId)}
              isLoading={submitting}
              loadingText="Sparar…"
              isDisabled={!selectedId || submitting}
            >
              Det är jag
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={onCreateNew}
              isDisabled={submitting}
            >
              Ingen av dessa
            </Button>

            <Button variant="ghost" onClick={onBack} isDisabled={submitting}>
              Tillbaka
            </Button>
          </VStack>
        </ScreenCard>
      </PageStack>
    </PageShell>
  );
}
