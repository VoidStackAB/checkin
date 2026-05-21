import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  Heading,
  Link,
  Text,
  VStack,
} from '@chakra-ui/react';
import {
  CLUB_DISPLAY_NAME,
  PRIVACY_CONTACT_EMAIL,
} from '../content/privacy.js';
import { PageShell, PageStack } from '../components/PageShell.jsx';
import ScreenCard from '../components/ScreenCard.jsx';

function PolicySection({ title, children }) {
  return (
    <Box>
      <Text fontWeight="semibold" fontSize="sm" color="gray.800" mb={1}>
        {title}
      </Text>
      <Text fontSize="sm" color="gray.700" lineHeight="tall">
        {children}
      </Text>
    </Box>
  );
}

export default function PrivacyPage() {
  return (
    <PageShell>
      <PageStack spacing={5}>
        <Heading as="h1" size="lg" letterSpacing="-0.02em">
          Integritetspolicy
        </Heading>

        <ScreenCard>
          <VStack spacing={4} align="stretch" divider={<Divider />}>
            <Text fontSize="sm" color="gray.700" lineHeight="tall">
              {CLUB_DISPLAY_NAME} (
              <Link href={`mailto:${PRIVACY_CONTACT_EMAIL}`} color="teal.600">
                {PRIVACY_CONTACT_EMAIL}
              </Link>
              ) är personuppgiftsansvarig för incheckningsappen Check-in.
            </Text>

            <PolicySection title="Vilka uppgifter?">
              Förnamn, efternamn, intern medlems-ID, incheckningsdatum och
              visningsnamn vid incheckning lagras i ett Google Kalkylark som
              klubben driver.
            </PolicySection>

            <PolicySection title="Varför?">
              För att dokumentera närvaro på träning och visa statistik (t.ex.
              årlig ranking) inom klubben.
            </PolicySection>

            <PolicySection title="Lagring">
              Uppgifterna finns i klubbens Google Kalkylark. En kopia av ditt
              medlems-ID och namn kan sparas lokalt i webbläsaren på din telefon
              för snabb incheckning.
            </PolicySection>

            <PolicySection title="Spårning">
              Appen använder inga marknadsförings- eller analyscookies i den här
              versionen. Klubbens PIN skyddas med en teknisk sessionskaka på
              servern.
            </PolicySection>

            <PolicySection title="Dina rättigheter">
              Kontakta klubben på e-postadressen ovan om du vill veta mer, rätta
              uppgifter eller begära radering enligt GDPR.
            </PolicySection>
          </VStack>
        </ScreenCard>

        <Button as={RouterLink} to="/" variant="outline" size="lg" w="full">
          Tillbaka
        </Button>
      </PageStack>
    </PageShell>
  );
}
