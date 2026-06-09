import { useState } from 'react';
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  VStack,
} from '@chakra-ui/react';
import { unlockTrainer } from '../api/trainer.js';
import AppBrand from './AppBrand.jsx';
import ScreenCard from './ScreenCard.jsx';
import { PageShell, PageStack } from './PageShell.jsx';

const ERROR_COPY = {
  invalid_pin: 'Fel lösenord — försök igen.',
  invalid_format: 'Ange lösenord.',
  rate_limited: 'För många försök — vänta en stund och försök igen.',
};

export default function TrainerPinScreen({ onUnlocked }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { ok, data } = await unlockTrainer(pin);
      if (ok) {
        onUnlocked();
        return;
      }
      setError(ERROR_COPY[data.error] ?? 'Kunde inte låsa upp — försök igen.');
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell centered>
      <PageStack spacing={6}>
        <AppBrand subtitle="Tränarrapport — ange lösenord" />

        <ScreenCard>
          <VStack
            as="form"
            spacing={5}
            align="stretch"
            onSubmit={handleSubmit}
            w="full"
          >
            <FormControl isInvalid={Boolean(error)}>
              <FormLabel htmlFor="trainer-pin">Tränarlösenord</FormLabel>
              <Input
                id="trainer-pin"
                name="pin"
                type="password"
                autoComplete="off"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
              />
              {error ? <FormErrorMessage>{error}</FormErrorMessage> : null}
            </FormControl>

            <Button
              type="submit"
              size="lg"
              height="3.75rem"
              fontSize="lg"
              isLoading={submitting}
              loadingText="Kontrollerar…"
            >
              Lås upp
            </Button>
          </VStack>
        </ScreenCard>
      </PageStack>
    </PageShell>
  );
}
