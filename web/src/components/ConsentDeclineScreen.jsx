import { Link as RouterLink } from 'react-router-dom';
import { Button, Link, Text } from '@chakra-ui/react';
import { PageShell, PageStack } from './PageShell.jsx';
import AppBrand from './AppBrand.jsx';
import ScreenCard from './ScreenCard.jsx';

export default function ConsentDeclineScreen({ onReviewConsent }) {
  return (
    <PageShell centered>
      <PageStack>
        <AppBrand />

        <ScreenCard>
          <Text color="gray.700" fontSize="md" lineHeight="tall" textAlign="center">
            Utan samtycke kan du inte checka in eller använda appen. Du kan läsa
            vår integritetspolicy eller stänga sidan och prata med en tränare om
            du har frågor.
          </Text>
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
          Integritetspolicy
        </Link>

        <Button size="lg" variant="outline" height="3.5rem" onClick={onReviewConsent}>
          Tillbaka till samtycke
        </Button>
      </PageStack>
    </PageShell>
  );
}
