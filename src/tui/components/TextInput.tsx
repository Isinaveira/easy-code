// src/tui/components/TextInput.tsx
import React from 'react';
import { useInput, Text, Box } from 'ink';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export const TextInput: React.FC<TextInputProps> = ({ value, onChange, onSubmit, placeholder }) => {
  useInput((input, key) => {
    if (key.return) {
      onSubmit();
      return;
    }

    if (key.backspace || key.delete) {
      if (value.length > 0) {
        onChange(value.slice(0, -1));
      }
      return;
    }

    // Capture printable ASCII characters
    if (input && !key.ctrl && !key.meta) {
      const charCode = input.charCodeAt(0);
      if (charCode >= 32 && charCode <= 126) {
        onChange(value + input);
      }
    }
  });

  return (
    <Box borderStyle="single" borderColor="cyan" paddingX={1} minWidth={30}>
      {value.length === 0 ? (
        <Text color="gray">{placeholder || 'Type here...'}</Text>
      ) : (
        <Text color="white">{value}</Text>
      )}
      <Text color="cyan" bold>█</Text>
    </Box>
  );
};

export default TextInput;
