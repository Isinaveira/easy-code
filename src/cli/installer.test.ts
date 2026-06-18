import { beforeEach, describe, expect, it, vi } from "vitest";
import { execa } from "execa";
import { checkDependency, main, getTailscaleIP } from "./installer.js";
import { saveEnvironment, EnvConfig } from "../environment/env.js";
import { select, text, multiselect } from "@clack/prompts";
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
  vi.mocked(text).mockResolvedValue("default-node");
  vi.mocked(select).mockResolvedValue("worker");
  vi.mocked(multiselect).mockResolvedValue(["phase-init"]);
});


describe("checkDependency", () => {
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

describe("main flow", () => {
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
    vi.mocked(execa).mockResolvedValue({ stdout: "success" } as any);

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    await main();

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("debe solicitar nombre, rol y agentes del nodo y escribir la topología completa en el .env", async () => {
  vi.mocked(execa).mockImplementation((command) => {
    if (command === "tailscale") return Promise.reject(new Error("Not active"));
    return Promise.resolve({ stdout: "v1.0.0" }) as any;
  });

  // Configuramos las respuestas de Clack usando los mocks globales
  vi.mocked(text).mockResolvedValue("master-node-01");
  vi.mocked(select).mockResolvedValue("master");
  vi.mocked(multiselect).mockResolvedValue(["phase-init", "phase-explore"]);

  const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

  await main();

  // Ahora sí, esperamos la estructura de la topología distribuida
  const expectedEnvContent = "NODE_NAME=master-node-01\nNODE_ROLE=master\nACTIVE_AGENTS=phase-init,phase-explore\n";
  expect(fs.writeFile).toHaveBeenCalledWith(".env", expectedEnvContent);

  exitSpy.mockRestore();
});
});

describe("getTailscaleIP", () => {
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
