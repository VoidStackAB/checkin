import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { getGroupCheckins } from '../api/groups.js';
import { postCheckin, sheetsErrorMessage } from '../api/checkin.js';
import FeedbackAlert from './FeedbackAlert.jsx';

export default function GroupCheckinDialog({
  isOpen,
  onClose,
  member,
  onCheckedIn,
}) {
  const memberId = member?.memberId;
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [busyGroupId, setBusyGroupId] = useState(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!memberId) {
        return;
      }
      setError('');
      if (!silent) {
        setLoading(true);
      }
      try {
        const res = await getGroupCheckins(memberId);
        if (!res.ok) {
          setError(sheetsErrorMessage(res.data.error));
          return;
        }
        setGroups(Array.isArray(res.data.groups) ? res.data.groups : []);
      } catch {
        setError('Nätverksfel — kontrollera anslutningen och försök igen.');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [memberId],
  );

  useEffect(() => {
    if (isOpen) {
      load();
    }
  }, [isOpen, load]);

  async function handleGroupCheckin(group) {
    if (!member || busyGroupId || group.checkedInToday) {
      return;
    }
    setError('');
    setBusyGroupId(group.groupId);
    try {
      const res = await postCheckin({
        memberId: member.memberId,
        firstName: member.firstName,
        lastName: member.lastName,
        groupId: group.groupId,
      });
      if (!res.ok) {
        setError(sheetsErrorMessage(res.data.error));
        return;
      }
      await load({ silent: true });
      onCheckedIn?.();
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setBusyGroupId(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader>Välj grupp att checka in i</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={3} align="stretch">
            {error ? (
              <FeedbackAlert onDismiss={() => setError('')}>
                {error}
              </FeedbackAlert>
            ) : null}

            {loading ? (
              <>
                <Skeleton height="20" borderRadius="xl" />
                <Skeleton height="20" borderRadius="xl" />
              </>
            ) : (
              groups.map((group) => {
                const busy = busyGroupId === group.groupId;
                const done = group.checkedInToday;
                return (
                  <Flex
                    key={group.groupId}
                    as="button"
                    type="button"
                    align="center"
                    justify="space-between"
                    gap={3}
                    py={5}
                    px={5}
                    minH="5rem"
                    w="full"
                    textAlign="left"
                    borderWidth="1px"
                    borderColor={done ? 'green.200' : 'teal.200'}
                    bg={done ? 'green.50' : 'white'}
                    borderRadius="xl"
                    transition="background 0.15s, border-color 0.15s"
                    opacity={busyGroupId && !busy ? 0.6 : 1}
                    onClick={() => handleGroupCheckin(group)}
                    disabled={done || Boolean(busyGroupId)}
                    _hover={done ? undefined : { bg: 'teal.50', borderColor: 'teal.300' }}
                    _active={done ? undefined : { bg: 'teal.100' }}
                    _disabled={{ cursor: 'not-allowed' }}
                  >
                    <Box flex="1" minW={0}>
                      <Text
                        fontSize="lg"
                        fontWeight="bold"
                        color={done ? 'green.800' : 'gray.800'}
                        noOfLines={1}
                      >
                        {group.name}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {group.yearCount} träningar i år
                      </Text>
                    </Box>
                    {busy ? (
                      <Spinner size="md" color="teal.500" />
                    ) : done ? (
                      <Badge colorScheme="green" fontSize="sm" px={2} py={1}>
                        Incheckad
                      </Badge>
                    ) : (
                      <Badge colorScheme="teal" fontSize="sm" px={2} py={1}>
                        Checka in
                      </Badge>
                    )}
                  </Flex>
                );
              })
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Stäng
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
