import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  styles: {
    global: {
      'html, body, #root': {
        minHeight: '100dvh',
      },
    },
  },
});

export default theme;
