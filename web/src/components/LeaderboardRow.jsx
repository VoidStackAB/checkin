import { Badge, Box, Flex, Text } from '@chakra-ui/react';
import { displayLeaderName, rankPodiumStyle } from './ranking.js';

export default function LeaderboardRow({
  entry,
  index,
  total,
  compact = false,
}) {
  const podium = rankPodiumStyle(entry.rank);
  const isPodium = entry.rank <= 3;

  return (
    <Flex
      role="listitem"
      align="center"
      gap={compact ? 2 : 3}
      py={compact ? 1.5 : 2}
      px={compact ? 2 : 3}
      borderRadius="lg"
      bg={isPodium ? podium.bg : undefined}
      borderWidth={isPodium ? '1px' : '0'}
      borderBottomWidth={
        isPodium ? '1px' : index < total - 1 ? '1px' : '0'
      }
      borderColor={
        isPodium ? podium.borderColor : 'gray.100'
      }
    >
      <Flex
        align="center"
        justify="center"
        minW={compact ? '2.5rem' : '3rem'}
        flexShrink={0}
      >
        <Badge
          bg={podium.badgeBg}
          color={podium.badgeColor}
          fontSize={compact ? 'sm' : 'md'}
          px={2}
          py={0.5}
          borderRadius="md"
          variant="subtle"
        >
          #{entry.rank}
        </Badge>
      </Flex>
      <Box flex="1" minW={0}>
        <Text
          fontWeight={isPodium ? 'bold' : 'semibold'}
          fontSize={compact ? 'sm' : 'md'}
          noOfLines={1}
          color={isPodium ? podium.accent : 'gray.800'}
        >
          {displayLeaderName(entry)}
        </Text>
        <Text fontSize="xs" color="gray.600">
          {entry.yearCount} träningar
        </Text>
      </Box>
    </Flex>
  );
}
