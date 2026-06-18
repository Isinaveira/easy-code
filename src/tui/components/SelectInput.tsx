// src/tui/components/SelectInput.tsx
import React, { useState } from 'react';
import { useInput, Text, Box } from 'ink';
import theme from '../theme/index.js';

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface SelectInputProps {
  options: SelectOption[];
  onSubmit: (value: string) => void;
}

export const SelectInput: React.FC<SelectInputProps> = ({ options, onSubmit }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev - 1 + options.length) % options.length);
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev + 1) % options.length);
    } else if (key.return) {
      if (options[selectedIndex]) {
        onSubmit(options[selectedIndex].value);
      }
    }
  });

  return (
    <Box flexDirection="column">
      {options.map((opt, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={opt.value} paddingLeft={isSelected ? 0 : 2} flexDirection="row">
            {isSelected ? (
              <Text color={theme.colors.primary} bold>
                {theme.icons.selector} {opt.label}
              </Text>
            ) : (
              <Text color={theme.colors.white}>{opt.label}</Text>
            )}
            {opt.hint && (
              <Text color={theme.colors.gray}> ({opt.hint})</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default SelectInput;
