// src/tui/theme/index.ts

export const theme = {
  colors: {
    primary: 'cyan' as const,
    secondary: 'magenta' as const,
    success: 'green' as const,
    warning: 'yellow' as const,
    error: 'red' as const,
    gray: 'gray' as const,
    white: 'white' as const,
    black: 'black' as const,
    muted: 'blue' as const, // muted blue for highlights
  },
  icons: {
    success: '✔',
    warning: '⚠️',
    error: '✖',
    star: '⭐',
    info: 'ℹ',
    agent: '🤖',
    hardware: '💻',
    selector: '❯',
    checked: '☒',
    unchecked: '☐'
  }
};

export type AppTheme = typeof theme;
export default theme;
