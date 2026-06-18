// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;
import { describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { Console } from 'node:console';
if (!console.Console) {
  // @ts-ignore
  console.Console = Console;
}
import { render } from 'ink-testing-library';
import { TextInput } from './TextInput.js';
import { SelectInput } from './SelectInput.js';
import { MultiSelectInput } from './MultiSelectInput.js';

const waitTick = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('TUI Interactive Inputs', () => {
  it('TextInput should capture standard keystrokes and submit on Enter', async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();

    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <TextInput value="" onChange={onChange} onSubmit={onSubmit} />
      );
    });

    const { stdin, unmount } = renderResult;

    // Simulate typing 'm'
    await act(async () => {
      stdin.write('m');
      await waitTick();
    });
    expect(onChange).toHaveBeenCalledWith('m');

    // Simulate submit
    await act(async () => {
      stdin.write('\r');
      await waitTick();
    });
    expect(onSubmit).toHaveBeenCalled();

    await act(async () => {
      unmount();
    });
  });

  it('SelectInput should navigate with Arrow keys and submit selection on Enter', async () => {
    const onSubmit = vi.fn();
    const options = [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2' }
    ];

    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <SelectInput options={options} onSubmit={onSubmit} />
      );
    });

    const { stdin, unmount } = renderResult;

    // Down Arrow to highlight Option 2 (\u001b[B)
    await act(async () => {
      stdin.write('\u001b[B');
      await waitTick();
    });

    // Enter to submit
    await act(async () => {
      stdin.write('\r');
      await waitTick();
    });

    expect(onSubmit).toHaveBeenCalledWith('opt2');
    
    await act(async () => {
      unmount();
    });
  });

  it('MultiSelectInput should toggle option on Space and return values on Enter', async () => {
    const onSubmit = vi.fn();
    const options = [
      { value: 'agent1', label: 'Agent 1' },
      { value: 'agent2', label: 'Agent 2' }
    ];

    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <MultiSelectInput options={options} onSubmit={onSubmit} initialSelected={[]} />
      );
    });

    const { stdin, unmount } = renderResult;

    // Press Space on index 0 to select Agent 1
    await act(async () => {
      stdin.write(' ');
      await waitTick();
    });

    // Press Down to go to index 1
    await act(async () => {
      stdin.write('\u001b[B');
      await waitTick();
    });

    // Press Space to select Agent 2
    await act(async () => {
      stdin.write(' ');
      await waitTick();
    });

    // Press Enter to submit
    await act(async () => {
      stdin.write('\r');
      await waitTick();
    });

    expect(onSubmit).toHaveBeenCalledWith(['agent1', 'agent2']);
    
    await act(async () => {
      unmount();
    });
  });
});
