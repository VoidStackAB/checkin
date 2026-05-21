import { useCallback, useEffect, useState } from 'react';
import { Flex, Spinner, VStack } from '@chakra-ui/react';
import { getSession } from './api/apiFetch.js';
import PinScreen from './components/PinScreen.jsx';
import ConsentScreen from './components/ConsentScreen.jsx';
import ConsentDeclineScreen from './components/ConsentDeclineScreen.jsx';
import AppShell from './components/AppShell.jsx';
import OnboardingScreen from './components/OnboardingScreen.jsx';
import AppBrand from './components/AppBrand.jsx';
import { hasGdprAccepted } from './storage/gdpr.js';
import { clearMemberIdentity, hasMemberIdentity } from './storage/member.js';

function resolveGate(unlocked) {
  if (!unlocked) {
    return 'pin';
  }
  if (!hasGdprAccepted()) {
    return 'consent';
  }
  if (!hasMemberIdentity()) {
    return 'onboarding';
  }
  return 'app';
}

export default function GatedApp() {
  const [gate, setGate] = useState('loading');
  const [showDecline, setShowDecline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSession()
      .then(({ unlocked }) => {
        if (!cancelled) {
          setGate(resolveGate(unlocked));
          setShowDecline(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGate('pin');
          setShowDecline(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleUnlocked() {
    setGate(resolveGate(true));
    setShowDecline(false);
  }

  function handleConsentAccepted() {
    setGate(resolveGate(true));
    setShowDecline(false);
  }

  function handleOnboardingComplete() {
    setGate('app');
    setShowDecline(false);
  }

  const handleRequireOnboarding = useCallback(() => {
    clearMemberIdentity();
    setGate('onboarding');
    setShowDecline(false);
  }, []);

  if (gate === 'loading') {
    return (
      <Flex
        direction="column"
        minH="100dvh"
        bgGradient="linear(to-b, gray.50, gray.100)"
        align="center"
        justify="center"
        px={4}
      >
        <VStack spacing={8}>
          <AppBrand subtitle="Laddar…" />
          <Spinner size="lg" color="teal.500" thickness="3px" />
        </VStack>
      </Flex>
    );
  }

  if (gate === 'pin') {
    return <PinScreen onUnlocked={handleUnlocked} />;
  }

  if (gate === 'consent') {
    if (showDecline) {
      return (
        <ConsentDeclineScreen
          onReviewConsent={() => setShowDecline(false)}
        />
      );
    }
    return (
      <ConsentScreen
        onAccepted={handleConsentAccepted}
        onDeclined={() => setShowDecline(true)}
      />
    );
  }

  if (gate === 'onboarding') {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return <AppShell onRequireOnboarding={handleRequireOnboarding} />;
}
