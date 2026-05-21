import { Box } from '@chakra-ui/react';

export default function ScreenCard({ children, ...rest }) {
  return (
    <Box
      bg="white"
      borderRadius="2xl"
      boxShadow="card"
      borderWidth="1px"
      borderColor="gray.100"
      p={{ base: 5, sm: 6 }}
      w="full"
      {...rest}
    >
      {children}
    </Box>
  );
}
