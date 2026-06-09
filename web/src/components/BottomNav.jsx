import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Box, Flex, Text } from '@chakra-ui/react';
import { BOTTOM_NAV_HEIGHT } from './layoutConstants.js';

const NAV_ITEMS = [
  { id: 'home', label: 'Hem', to: '/' },
  { id: 'history', label: 'Historik', to: '/history' },
  { id: 'leaderboard', label: 'Topplista', to: '/leaderboard' },
  { id: 'settings', label: 'Inställningar', to: '/settings' },
];

function isActive(pathname, to) {
  if (to === '/') {
    return pathname === '/';
  }
  return pathname.startsWith(to);
}

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <Box
      as="nav"
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      minH={BOTTOM_NAV_HEIGHT}
      borderTopWidth="1px"
      borderColor="gray.200"
      bg="white"
      pb="env(safe-area-inset-bottom, 0)"
      boxShadow="0 -4px 16px rgba(0, 0, 0, 0.04)"
      aria-label="Huvudnavigering"
    >
      <Flex maxW="container.sm" mx="auto" minH={BOTTOM_NAV_HEIGHT} align="stretch">
        {NAV_ITEMS.map((item) => {
          const active = !item.soon && isActive(pathname, item.to);
          const content = (
            <>
              <Text
                fontSize="sm"
                fontWeight={active ? 'semibold' : 'medium'}
                lineHeight="short"
              >
                {item.label}
              </Text>
              {item.soon ? (
                <Text fontSize="xs" color="gray.400" mt={0.5} lineHeight="1">
                  Snart
                </Text>
              ) : null}
            </>
          );

          if (item.soon) {
            return (
              <Box
                key={item.id}
                flex="1"
                py={4}
                px={2}
                minH={BOTTOM_NAV_HEIGHT}
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                textAlign="center"
                color="gray.400"
                aria-disabled
              >
                {content}
              </Box>
            );
          }

          return (
            <Box
              key={item.id}
              as={RouterLink}
              to={item.to}
              flex="1"
              py={4}
              px={2}
              minH={BOTTOM_NAV_HEIGHT}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
              color={active ? 'teal.600' : 'gray.500'}
              aria-current={active ? 'page' : undefined}
              _hover={{ color: 'teal.700', textDecoration: 'none' }}
            >
              {content}
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}
