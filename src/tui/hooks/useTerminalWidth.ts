import { useState, useEffect } from 'react';
import { useStdout } from 'ink';

export function useTerminalWidth(defaultWidth = 80): number {
  const { stdout } = useStdout();
  const [width, setWidth] = useState(stdout ? stdout.columns : defaultWidth);

  useEffect(() => {
    if (!stdout) return;

    const handleResize = () => {
      setWidth(stdout.columns);
    };

    stdout.on('resize', handleResize);
    return () => {
      stdout.off('resize', handleResize);
    };
  }, [stdout]);

  return width;
}
