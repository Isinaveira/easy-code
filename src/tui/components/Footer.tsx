// src/tui/components/Footer.tsx
import React from 'react';
import { Box, Text } from 'ink';
import theme from '../theme/index.js';

interface FooterProps {
  instructions?: string;
}

export const Footer: React.FC<FooterProps> = ({ instructions }) => {
  return (
    <Box flexDirection="column" marginTop={1} width="100%">
      <Box borderStyle="single" borderColor={theme.colors.gray} paddingX={1} flexDirection="row" justifyContent="space-between">
        <Text color={theme.colors.gray}>
          {instructions || 'Use Arrows to navigate • Enter to confirm'}
        </Text>
        <Text color={theme.colors.error}>
          Ctrl+C to Exit
        </Text>
      </Box>
    </Box>
  );
};

export default Footer;
