// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true;
import { describe, expect, it, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { Console } from 'node:console';
import { execa } from 'execa';
if (!console.Console) {
  // @ts-ignore
  console.Console = Console;
}
import { render } from 'ink-testing-library';
import App from '../App.js';
import { HardwareProfile } from '../../hardware/index.js';

vi.mock('execa');

const mockFetch = vi.fn();
global.fetch = mockFetch;

const waitTick = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

describe('TUI Screen Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    
    // Mock execa for tailscale check
    vi.mocked(execa).mockImplementation((command) => {
      if (command === 'tailscale') return Promise.resolve({ stdout: '10.0.0.5\n' }) as any;
      return Promise.resolve({ stdout: 'v1.0.0' }) as any;
    });
  });

  it('should complete the entire wizard flow and save successfully', async () => {
    // 1. Setup mock services
    const mockDetector = {
      detect: vi.fn().mockResolvedValue({
        os: 'linux',
        cpu: { model: 'Ryzen 7', cores: 8, architecture: 'x64' },
        memory: { totalGb: 32, freeGb: 16 },
        accelerator: 'cuda',
        gpu: { model: 'RTX 4090', vramGb: 24 }
      } as HardwareProfile)
    };

    const mockJsonStore = {
      saveNodeState: vi.fn().mockResolvedValue(undefined),
      loadNodeState: vi.fn().mockResolvedValue(null)
    };

    const mockEnvWriter = {
      saveEnv: vi.fn().mockResolvedValue(undefined)
    };

    const mockServices = {
      detector: mockDetector as any,
      jsonStore: mockJsonStore as any,
      envWriter: mockEnvWriter as any
    };

    // 2. Mock llmfit API endpoints
    // First call: health check (healthy)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200
    });
    // Second call: get models
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [
        { name: 'phi3:mini', sizeGb: 2.2, description: 'Phi3 Mini model' }
      ]
    });

    let renderResult: any;
    await act(async () => {
      renderResult = render(<App services={mockServices} />);
    });

    const { stdin, lastFrame, unmount } = renderResult;

    // Verify initial screen: NodeNameScreen
    expect(lastFrame()).toContain('¿Qué nombre deseas asignarle a este nodo?');

    // Step 1: Submit default node name ("master-node-01") by pressing Enter
    await act(async () => {
      stdin.write('\r');
      await waitTick();
    });

    // Verify step 2: NodeRoleScreen
    expect(lastFrame()).toContain('Selecciona el rol de este nodo:');

    // Press Down to select 'worker', and Enter to confirm
    await act(async () => {
      stdin.write('\u001b[B'); // Down Arrow
      await waitTick();
    });
    await act(async () => {
      stdin.write('\r'); // Enter
      await waitTick();
    });

    // Verify step 3: AgentSelectionScreen
    expect(lastFrame()).toContain('Selecciona los agentes que se ejecutarán en este nodo:');

    // Press Space on index 0 to select agentic-orchestrator, then Enter to confirm
    await act(async () => {
      stdin.write(' '); // Space
      await waitTick();
    });
    await act(async () => {
      stdin.write('\r'); // Enter
      await waitTick();
    });

    // Hardware Detection Screen handles itself asynchronously and navigates to ModelSelectionScreen.
    // Wait for the async detect calls and API catalog fetches to settle.
    await act(async () => {
      await waitTick(150);
    });

    // Verify step 5: ModelSelectionScreen
    expect(lastFrame()).toContain('Select model for agentic-orchestrator:');
    expect(lastFrame()).toContain('phi3:mini');

    // Select phi3:mini (first option) by pressing Enter
    await act(async () => {
      stdin.write('\r'); // Enter
      await waitTick(150); // Give save async calls time to run
    });

    // Verify step 6: SaveScreen (successful config save)
    expect(lastFrame()).toContain('Resumen de Asignaciones:');
    expect(lastFrame()).toContain('agentic-orchestrator → phi3:mini');
    expect(lastFrame()).toContain('¡Todo listo! Tu entorno de easy-code ha sido inicializado.');
    expect(lastFrame()).toContain('Tailscale IP detectada: 10.0.0.5');

    // Verify the mock service calls
    expect(mockDetector.detect).toHaveBeenCalled();
    expect(mockJsonStore.saveNodeState).toHaveBeenCalledWith(expect.objectContaining({
      nodeName: 'master-node-01',
      nodeRole: 'worker',
      activeAgents: ['agentic-orchestrator']
    }));
    expect(mockEnvWriter.saveEnv).toHaveBeenCalledWith(expect.objectContaining({
      NODE_NAME: 'master-node-01',
      NODE_ROLE: 'worker',
      ACTIVE_AGENTS: 'agentic-orchestrator',
      AVAILABLE_VRAM: '24',
      TAILSCALE_IP: '10.0.0.5'
    }));

    await act(async () => {
      unmount();
    });
  });
});
