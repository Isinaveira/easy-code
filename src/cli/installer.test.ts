// src/cli/installer.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { execa } from "execa";
import { checkDependency, main, getTailscaleIP, NodeInstaller } from "./installer.js";
import { select, text, multiselect, note } from "@clack/prompts";
import { HardwareDetector } from "../hardware/index.js";
import { JsonPersistenceStore, EnvPersistenceWriter } from "../persistence/index.js";
import fs from "fs/promises";

vi.mock("execa");
vi.mock("fs/promises");
vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    message: vi.fn(),
    stop: vi.fn(),
  })),
  select: vi.fn(),
  text: vi.fn(),
  multiselect: vi.fn(),
  isCancel: vi.fn(),
}));

describe("checkDependency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true if command exists", async () => {
    vi.mocked(execa).mockResolvedValue({ stdout: "v1.0.0" } as any);
    const result = await checkDependency("git");
    expect(result).toBe(true);
    expect(execa).toHaveBeenCalledWith("git", ["--version"]);
  });

  it("returns false if command does not exist", async () => {
    vi.mocked(execa).mockRejectedValue(new Error());
    const result = await checkDependency("gt");
    expect(result).toBe(false);
  });
});

describe("getTailscaleIP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe devolver la IP si tailscale está activo y devuelve una dirección", async () => {
    vi.mocked(execa).mockResolvedValue({ stdout: "100.64.0.1\n" } as any);
    const ip = await getTailscaleIP();
    expect(ip).toBe("100.64.0.1");
    expect(execa).toHaveBeenCalledWith("tailscale", ["ip", "-4"]);
  });

  it("debe devolver null si el comando falla o tailscale está desconectado", async () => {
    vi.mocked(execa).mockRejectedValue(new Error("Tailscale is down"));
    const ip = await getTailscaleIP();
    expect(ip).toBeNull();
  });
});

describe("NodeInstaller Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(text).mockResolvedValue("test-node");
    vi.mocked(select).mockResolvedValue("worker");
    vi.mocked(multiselect).mockResolvedValue(["phase-init"]);
  });

  it("should run installer flow, query detector, and write to both JSON state and ENV file", async () => {
    const mockDetector = {
      detect: vi.fn().mockResolvedValue({
        os: "linux",
        cpu: { cores: 8, model: "Intel", architecture: "x64" },
        gpu: { vendor: "nvidia", model: "RTX 3080", vramGb: 10 },
        memory: { totalGb: 32 },
        accelerator: "cuda"
      })
    } as any;

    const mockJsonStore = {
      saveNodeState: vi.fn().mockResolvedValue(undefined),
      loadNodeState: vi.fn().mockResolvedValue(null)
    };

    const mockEnvWriter = {
      saveEnv: vi.fn().mockResolvedValue(undefined)
    };

    vi.mocked(execa).mockImplementation((command) => {
      if (command === "tailscale") return Promise.resolve({ stdout: "10.0.0.5\n" }) as any;
      return Promise.resolve({ stdout: "v1.0.0" }) as any;
    });

    const installer = new NodeInstaller(mockDetector, mockJsonStore, mockEnvWriter);
    await installer.run();

    expect(mockDetector.detect).toHaveBeenCalled();
    expect(note).toHaveBeenCalledWith(expect.any(String), "💻 Recursos del Sistema Detectados");
    expect(note).toHaveBeenCalledWith(expect.any(String), "🎯 Asignación Óptima de Modelos por Agente");
    expect(mockJsonStore.saveNodeState).toHaveBeenCalledWith({
      nodeName: "test-node",
      nodeRole: "worker",
      activeAgents: ["phase-init"],
      hardwareProfile: {
        os: "linux",
        cpu: { cores: 8, model: "Intel", architecture: "x64" },
        gpu: { vendor: "nvidia", model: "RTX 3080", vramGb: 10 },
        memory: { totalGb: 32 },
        accelerator: "cuda"
      }
    });

    expect(mockEnvWriter.saveEnv).toHaveBeenCalledWith({
      NODE_NAME: "test-node",
      NODE_ROLE: "worker",
      ACTIVE_AGENTS: "phase-init",
      AVAILABLE_VRAM: "10",
      TAILSCALE_IP: "10.0.0.5"
    });
  });
});

describe("main flow integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(text).mockResolvedValue("master-node-01");
    vi.mocked(select).mockResolvedValue("master");
    vi.mocked(multiselect).mockResolvedValue(["phase-init", "phase-explore"]);
  });

  it("debe detener el proceso con código 1 si falta alguna dependencia crítica", async () => {
    vi.mocked(execa).mockRejectedValue(new Error("Missing dependency"));

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    await main();

    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it("debe continuar el proceso si todas las dependencias están instaladas", async () => {
    vi.mocked(execa).mockImplementation((command) => {
      if (command === "tailscale") return Promise.reject(new Error("Not active"));
      return Promise.resolve({ stdout: "success" }) as any;
    });

    // Mockeamos la factory estática del detector para controlar la VRAM devuelta en el main
    const detectSpy = vi.spyOn(HardwareDetector.prototype, "detect").mockResolvedValue({
      os: "win32",
      cpu: { cores: 4, model: "Intel", architecture: "x64" },
      gpu: { vendor: "nvidia", model: "RTX 4070", vramGb: 12 },
      memory: { totalGb: 16 },
      accelerator: "cuda"
    });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await main();

    expect(exitSpy).not.toHaveBeenCalled();
    
    // El EnvPersistenceWriter escribe el env.
    const expectedEnvContent = "NODE_NAME=master-node-01\nNODE_ROLE=master\nACTIVE_AGENTS=phase-init,phase-explore\nAVAILABLE_VRAM=12\n";
    expect(fs.writeFile).toHaveBeenCalledWith(".env", expectedEnvContent);

    detectSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
