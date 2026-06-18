// src/tui/components/MultiSelectInput.tsx
import React, { useState } from 'react';
import { useInput, Text, Box } from 'ink';
import theme from '../theme/index.js';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectInputProps {
  options: MultiSelectOption[];
  initialSelected?: string[];
  onSubmit: (values: string[]) => void;
}

export const MultiSelectInput: React.FC<MultiSelectInputProps> = ({
  options,
  initialSelected = [],
  onSubmit
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedValues, setSelectedValues] = useState<string[]>(initialSelected);

  useInput((input, key) => {
    if (key.upArrow) {
      setActiveIndex((prev) => (prev - 1 + options.length) % options.length);
    } else if (key.downArrow) {
      setActiveIndex((prev) => (prev + 1) % options.length);
    } else if (input === ' ') {
      const activeOption = options[activeIndex];
      if (activeOption) {
        setSelectedValues((prev) => {
          if (prev.includes(activeOption.value)) {
            return prev.filter((v) => v !== activeOption.value);
          } else {
            return [...prev, activeOption.value];
          }
        });
      }
    } else if (key.return) {
      onSubmit(selectedValues);
    }
  });

  return (
    <Box flexDirection="column">
      {options.map((opt, index) => {
        const isActive = index === activeIndex;
        const isChecked = selectedValues.includes(opt.value);
        
        const checkboxIcon = isChecked ? theme.icons.checked : theme.icons.unchecked;
        const checkboxColor = isChecked ? theme.colors.success : theme.colors.gray;

        return (
          <Box key={opt.value} paddingLeft={isActive ? 0 : 2} flexDirection="row">
            {isActive ? (
              <Box flexDirection="row">
                <Text color={theme.colors.primary} bold>
                  {theme.icons.selector}
                </Text>
                <Text color={checkboxColor} bold>
                  {' '}{checkboxIcon}{' '}
                </Text>
                <Text color={theme.colors.primary} bold>
                  {opt.label}
                </Text>
              </Box>
            ) : (
              <Box flexDirection="row">
                <Text color={checkboxColor}>
                  {checkboxIcon}{' '}
                </Text>
                <Text color={theme.colors.white}>
                  {opt.label}
                </Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default MultiSelectInput;
