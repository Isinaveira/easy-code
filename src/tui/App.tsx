// src/tui/App.tsx
import React from 'react';
import { Box } from 'ink';
import { AppStateProvider, useAppState } from './providers/AppStateProvider.js';
import { ServiceProvider, Services } from './providers/ServiceProvider.js';
import Header from './components/Header.js';
import Footer from './components/Footer.js';
import StatusBar from './components/StatusBar.js';

import NodeNameScreen from './screens/NodeNameScreen.js';
import NodeRoleScreen from './screens/NodeRoleScreen.js';
import AgentSelectionScreen from './screens/AgentSelectionScreen.js';
import HardwareDetectionScreen from './screens/HardwareDetectionScreen.js';
import HFTokenScreen from './screens/HFTokenScreen.js';
import ModelSelectionScreen from './screens/ModelSelectionScreen.js';
import SaveScreen from './screens/SaveScreen.js';
import { useTerminalWidth } from './hooks/useTerminalWidth.js';

const SCREEN_STEPS: Record<string, number> = {
  NODE_NAME: 1,
  NODE_ROLE: 2,
  AGENT_SELECTION: 3,
  HF_TOKEN: 4,
  HARDWARE_DETECTION: 5,
  MODEL_SELECTION: 6,
  SAVE_CONFIG: 7
};

const AppContent: React.FC = () => {
  const { state } = useAppState();
  const width = Math.max(80, useTerminalWidth());

  const renderActiveScreen = () => {
    switch (state.activeScreen) {
      case 'NODE_NAME':
        return <NodeNameScreen />;
      case 'NODE_ROLE':
        return <NodeRoleScreen />;
      case 'AGENT_SELECTION':
        return <AgentSelectionScreen />;
      case 'HF_TOKEN':
        return <HFTokenScreen />;
      case 'HARDWARE_DETECTION':
        return <HardwareDetectionScreen />;
      case 'MODEL_SELECTION':
        return <ModelSelectionScreen />;
      case 'SAVE_CONFIG':
        return <SaveScreen />;
      default:
        return <NodeNameScreen />;
    }
  };

  const currentStep = SCREEN_STEPS[state.activeScreen] || 1;
  const statusText = state.loadingMessage || `Configurando nodo - ${state.activeScreen}`;

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} width={width}>
      <Header />
      <StatusBar currentStep={currentStep} totalSteps={7} statusText={statusText} />
      <Box minHeight={12} borderStyle="double" borderColor="cyan" padding={1} flexDirection="column">
        {renderActiveScreen()}
      </Box>
      <Footer instructions={state.activeScreen === 'NODE_NAME' ? 'Escribe el nombre y presiona Enter' : undefined} />
    </Box>
  );
};

interface AppProps {
  services: Services;
}

export const App: React.FC<AppProps> = ({ services }) => {
  return (
    <ServiceProvider services={services}>
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </ServiceProvider>
  );
};

export default App;
