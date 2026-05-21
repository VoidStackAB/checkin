import { Box, Flex, Text } from '@chakra-ui/react';

const NAV_ITEMS = [
  { id: 'home', label: 'Hem', active: true },
  { id: 'leaderboard', label: 'Topplista', soon: true },
  { id: 'settings', label: 'Inställningar', soon: true },
];

export default function BottomNav() {
  return (
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
      boxShadow="0 -4px 16px rgba(0, 0, 0, 0.04)"
      aria-label="Huvudnavigering"
    >
      <Flex maxW="container.sm" mx="auto">
        {NAV_ITEMS.map((item) => (
          <Box
            key={item.id}
            flex="1"
            py={3}
            px={2}
            textAlign="center"
            color={item.active ? 'teal.600' : 'gray.400'}
            aria-current={item.active ? 'page' : undefined}
            aria-disabled={item.soon ? true : undefined}
          >
            <Text
              fontSize="sm"
              fontWeight={item.active ? 'semibold' : 'medium'}
              lineHeight="short"
            >
              {item.label}
            </Text>
            {item.soon ? (
              <Text fontSize="xs" color="gray.400" mt={0.5} lineHeight="1">
                Snart
              </Text>
            ) : null}
          </Box>
        ))}
      </Flex>
    </Box>
  );
}
