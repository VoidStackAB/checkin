import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Link, ListItem, Text, UnorderedList } from '@chakra-ui/react';
import { PageShell, PageStack } from './PageShell.jsx';
import AppBrand from './AppBrand.jsx';
import ScreenCard from './ScreenCard.jsx';
import { setGdprAccepted } from '../storage/gdpr.js';

export default function ConsentScreen({ onAccepted, onDeclined }) {
  function handleAccept() {
    setGdprAccepted();
    onAccepted();
  }

  return (
    <PageShell>
      <PageStack>
        <AppBrand subtitle="Samtycke till behandling av personuppgifter" />

        <ScreenCard>
          <Text fontSize="sm" color="gray.700" mb={3} fontWeight="medium">
            Innan du fortsätter
          </Text>
          <UnorderedList spacing={3} pl={4} fontSize="sm" color="gray.700">
            <ListItem>
              Klubben sparar ditt namn och närvaro i Google Kalkylark för
              träningsstatistik.
            </ListItem>
            <ListItem>
              Uppgifterna används för incheckning och statistik i klubben — inte
              för marknadsföring.
            </ListItem>
            <ListItem>
              Vi använder inga marknadsförings- eller analyscookies i den här
              versionen av appen.
            </ListItem>
          </UnorderedList>
        </ScreenCard>

        <Link
          as={RouterLink}
          to="/privacy"
          fontSize="sm"
          color="teal.600"
          fontWeight="medium"
          textAlign="center"
          _hover={{ color: 'teal.700', textDecoration: 'underline' }}
        >
          Läs integritetspolicyn
        </Link>

        <Button size="lg" height="3.5rem" onClick={handleAccept}>
          Godkänn
        </Button>
        <Button size="lg" variant="outline" height="3.5rem" onClick={onDeclined}>
          Neka
        </Button>
      </PageStack>
    </PageShell>
  );
}
