export function rankPodiumStyle(rank) {
  if (rank === 1) {
    return {
      bg: 'yellow.50',
      borderColor: 'yellow.300',
      badgeBg: 'yellow.100',
      badgeColor: 'yellow.800',
      accent: 'yellow.700',
    };
  }
  if (rank === 2) {
    return {
      bg: 'gray.50',
      borderColor: 'gray.300',
      badgeBg: 'gray.100',
      badgeColor: 'gray.700',
      accent: 'gray.700',
    };
  }
  if (rank === 3) {
    return {
      bg: 'orange.50',
      borderColor: 'orange.200',
      badgeBg: 'orange.100',
      badgeColor: 'orange.800',
      accent: 'orange.700',
    };
  }
  return {
    bg: 'white',
    borderColor: 'gray.100',
    badgeBg: 'teal.50',
    badgeColor: 'teal.800',
    accent: 'teal.700',
  };
}

export function displayLeaderName(entry) {
  return `${entry.firstName} ${entry.lastName}`.trim();
}
