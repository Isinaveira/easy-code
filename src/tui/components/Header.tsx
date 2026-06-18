// src/tui/components/Header.tsx
import React from 'react';
import { Box, Text } from 'ink';
import theme from '../theme/index.js';

export const Header: React.FC = () => {
  return (
    <Box flexDirection="column" width="100%" marginBottom={1}>
      <Box borderStyle="round" borderColor={theme.colors.primary} paddingX={2} flexDirection="column" alignItems="center">
        <Text bold color={theme.colors.primary}>
          easy-code
        </Text>
        <Text color={theme.colors.gray}>
          Terminal Setup Wizard
        </Text>
      </Box>
    </Box>
  );
};

export default Header;
