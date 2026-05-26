export function rankPodiumStyle(rank) {
  if (rank === 1) {
    return {
      badgeBg: 'yellow.200',
      badgeColor: 'yellow.900',
    };
  }
  if (rank === 2) {
    return {
      badgeBg: 'gray.200',
      badgeColor: 'gray.800',
    };
  }
  if (rank === 3) {
    return {
      badgeBg: 'orange.200',
      badgeColor: 'orange.900',
    };
  }
  return {
    badgeBg: 'teal.500',
    badgeColor: 'white',
  };
}

export function displayLeaderName(entry) {
  return `${entry.firstName} ${entry.lastName}`.trim();
}
