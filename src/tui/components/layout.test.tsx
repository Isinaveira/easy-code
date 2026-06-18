import { describe, expect, it } from 'vitest';
import React from 'react';
import { Console } from 'node:console';
import { Writable } from 'node:stream';
if (!console.Console) {
  // @ts-ignore
  console.Console = Console;
}
import { render } from 'ink';
import { Header } from './Header.js';
import { Footer } from './Footer.js';
import { StatusBar } from './StatusBar.js';

class MockStream extends Writable {
  frames: string[] = [];
  override _write(chunk: any, encoding: string, callback: () => void) {
    this.frames.push(chunk.toString());
    callback();
  }
}

describe('TUI Foundational Components', () => {
  it('should render Header component without crashing', () => {
    const stream = new MockStream();
    const { unmount } = render(<Header />, { stdout: stream as any });
    unmount();
    const output = stream.frames.join('');
    expect(output).toContain('easy-code');
    expect(output).toContain('Terminal Setup Wizard');
  });

  it('should render Footer component with default instructions', () => {
    const stream = new MockStream();
    const { unmount } = render(<Footer />, { stdout: stream as any });
    unmount();
    const output = stream.frames.join('');
    expect(output).toContain('Use Arrows to navigate');
    expect(output).toContain('Ctrl+C to Exit');
  });

  it('should render Footer component with custom instructions', () => {
    const stream = new MockStream();
    const { unmount } = render(<Footer instructions="Custom control text" />, { stdout: stream as any });
    unmount();
    const output = stream.frames.join('');
    expect(output).toContain('Custom control text');
  });

  it('should render StatusBar component showing progress', () => {
    const stream = new MockStream();
    const { unmount } = render(<StatusBar currentStep={2} totalSteps={5} statusText="Testing" />, { stdout: stream as any });
    unmount();
    const output = stream.frames.join('');
    expect(output).toContain('STATUS: Testing');
    expect(output).toContain('Step 2/5');
  });
});
