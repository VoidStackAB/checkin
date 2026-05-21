import { Alert, AlertDescription, CloseButton } from '@chakra-ui/react';

export default function FeedbackAlert({
  status = 'error',
  children,
  onDismiss,
}) {
  if (!children) {
    return null;
  }

  return (
    <Alert
      status={status}
      borderRadius="xl"
      fontSize="sm"
      py={3}
      pr={onDismiss ? 10 : 4}
    >
      <AlertDescription flex="1">{children}</AlertDescription>
      {onDismiss ? (
        <CloseButton
          position="absolute"
          right={2}
          top={2}
          size="sm"
          onClick={onDismiss}
          aria-label="Stäng meddelande"
        />
      ) : null}
    </Alert>
  );
}
