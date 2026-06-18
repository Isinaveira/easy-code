// src/cli/installer.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { execa } from "execa";
import { checkDependency, main, getTailscaleIP } from "./installer.js";
import { HardwareDetector } from "../hardware/index.js";
import { render } from "ink";

vi.mock("execa");
vi.mock("ink", () => ({
  render: vi.fn(() => ({
    waitUntilExit: vi.fn().mockResolvedValue(undefined)
  }))
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

describe("main flow integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(render).toHaveBeenCalled();

    detectSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
