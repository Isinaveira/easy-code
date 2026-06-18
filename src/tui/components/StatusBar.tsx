// src/tui/components/StatusBar.tsx
import React from 'react';
import { Box, Text } from 'ink';
import theme from '../theme/index.js';

interface StatusBarProps {
  currentStep: number;
  totalSteps: number;
  statusText?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ currentStep, totalSteps, statusText }) => {
  return (
    <Box width="100%" paddingX={1} backgroundColor="gray" flexDirection="row" justifyContent="space-between" marginBottom={1}>
      <Text color="black" bold>
        STATUS: {statusText || 'Setting up Easy Code Node'}
      </Text>
      <Text color="black">
        Step {currentStep}/{totalSteps}
      </Text>
    </Box>
  );
};

export default StatusBar;
