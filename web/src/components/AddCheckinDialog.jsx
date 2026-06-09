import { useEffect, useState } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  VStack,
} from '@chakra-ui/react';
import { addMissedCheckin, sheetsErrorMessage } from '../api/history.js';
import FeedbackAlert from './FeedbackAlert.jsx';

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AddCheckinDialog({
  isOpen,
  onClose,
  member,
  groups = [],
  onAdded,
}) {
  const [date, setDate] = useState(todayString());
  const [groupId, setGroupId] = useState('default');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDate(todayString());
      setError('');
      setInfo('');
      setGroupId(groups[0]?.groupId ?? 'default');
    }
  }, [isOpen, groups]);

  async function handleSubmit() {
    if (!member || submitting) {
      return;
    }
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      const res = await addMissedCheckin({
        memberId: member.memberId,
        firstName: member.firstName,
        lastName: member.lastName,
        groupId,
        date,
      });
      if (!res.ok) {
        if (res.data.error === 'invalid_date') {
          setError('Välj ett giltigt datum som inte ligger i framtiden.');
        } else if (res.data.error === 'not_in_group') {
          setError('Du är inte med i den valda gruppen.');
        } else if (res.data.error === 'invalid_format') {
          setError('Ogiltiga uppgifter — försök igen.');
        } else {
          setError(sheetsErrorMessage(res.data.error));
        }
        return;
      }
      if (res.data.status === 'already_checked_in') {
        setInfo('Du var redan incheckad den dagen.');
        onAdded?.();
        return;
      }
      onAdded?.();
      onClose();
    } catch {
      setError('Nätverksfel — kontrollera anslutningen och försök igen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader>Lägg till en träning</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {error ? (
              <FeedbackAlert onDismiss={() => setError('')}>
                {error}
              </FeedbackAlert>
            ) : null}
            {info ? (
              <FeedbackAlert status="info" onDismiss={() => setInfo('')}>
                {info}
              </FeedbackAlert>
            ) : null}

            <FormControl>
              <FormLabel fontSize="sm" color="gray.600" mb={1}>
                Datum
              </FormLabel>
              <Input
                type="date"
                value={date}
                max={todayString()}
                onChange={(e) => setDate(e.target.value)}
                focusBorderColor="teal.400"
              />
            </FormControl>

            {groups.length > 1 ? (
              <FormControl>
                <FormLabel fontSize="sm" color="gray.600" mb={1}>
                  Grupp
                </FormLabel>
                <Select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  focusBorderColor="teal.400"
                >
                  {groups.map((group) => (
                    <option key={group.groupId} value={group.groupId}>
                      {group.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            ) : null}
          </VStack>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose}>
            Avbryt
          </Button>
          <Button
            colorScheme="teal"
            onClick={handleSubmit}
            isLoading={submitting}
            loadingText="Sparar…"
          >
            Spara
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
