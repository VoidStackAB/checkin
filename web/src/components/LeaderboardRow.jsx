import { Badge, Box, Flex, Text } from '@chakra-ui/react';
import { displayLeaderName, rankPodiumStyle } from './ranking.js';

export default function LeaderboardRow({
  entry,
  index,
  total,
  compact = false,
}) {
  const style = rankPodiumStyle(entry.rank);

  return (
    <Flex
      role="listitem"
      align="center"
      gap={compact ? 2 : 3}
      py={compact ? 1.5 : 2}
      px={compact ? 2 : 3}
      borderRadius="lg"
      borderBottomWidth={index < total - 1 ? '1px' : '0'}
      borderColor="gray.100"
    >
      <Flex
        align="center"
        justify="center"
        minW={compact ? '2.5rem' : '3rem'}
        flexShrink={0}
      >
        <Badge
          bg={style.badgeBg}
          color={style.badgeColor}
          fontSize={compact ? 'sm' : 'md'}
          px={2}
          py={0.5}
          borderRadius="md"
          variant={entry.rank > 3 ? 'solid' : 'subtle'}
          fontWeight="semibold"
        >
          #{entry.rank}
        </Badge>
      </Flex>
      <Box flex="1" minW={0}>
        <Text
          fontWeight="semibold"
          fontSize={compact ? 'sm' : 'md'}
          noOfLines={1}
          color="gray.800"
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
