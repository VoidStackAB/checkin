import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  fonts: {
    heading:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    body: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  colors: {
    brand: {
      50: '#e6fffa',
      100: '#b2f5ea',
      500: '#319795',
      600: '#2c7a7b',
      700: '#285e61',
    },
  },
  radii: {
    xl: '1rem',
    '2xl': '1.25rem',
  },
  shadows: {
    card: '0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04)',
    elevated: '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  styles: {
    global: {
      'html, body, #root': {
        minHeight: '100dvh',
      },
      body: {
        bg: 'gray.50',
        color: 'gray.800',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'teal',
      },
      baseStyle: {
        fontWeight: 'semibold',
        borderRadius: 'xl',
      },
    },
    Input: {
      defaultProps: {
        size: 'lg',
      },
      variants: {
        outline: {
          field: {
            bg: 'white',
            borderRadius: 'xl',
            _focusVisible: {
              borderColor: 'teal.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-teal-500)',
            },
          },
        },
      },
    },
    Heading: {
      baseStyle: {
        fontWeight: '700',
        letterSpacing: '-0.02em',
      },
    },
  },
});

export default theme;
