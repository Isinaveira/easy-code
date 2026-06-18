// src/tui/providers/ServiceProvider.tsx
import React, { createContext, useContext } from 'react';
import { HardwareDetector } from '../../hardware/index.js';
import { PersistenceStore, EnvironmentWriter } from '../../persistence/index.js';

export interface Services {
  detector: HardwareDetector;
  jsonStore: PersistenceStore;
  envWriter: EnvironmentWriter;
}

const ServiceContext = createContext<Services | undefined>(undefined);

export const ServiceProvider: React.FC<{ services: Services; children: React.ReactNode }> = ({ services, children }) => {
  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};

export const useServices = (): Services => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
};

export default ServiceProvider;
