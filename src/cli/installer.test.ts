import { beforeEach, describe, expect, it, vi } from "vitest";
import { execa } from "execa";
import { checkDependency, main, getTailscaleIP } from "./installer.js";
import { saveEnvironment, EnvConfig } from "../utils/env.js";
import { select } from "@clack/prompts";
import fs from "fs/promises";

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
});

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
  isCancel: vi.fn(),
}));

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

  it("debe solicitar el rol de nodo y escribir el archivo .env correspondiente", async () => {
    // ◄ Forzamos a que la función del mock devuelva 'any' para evitar las 22 propiedades que faltan
    vi.mocked(execa).mockImplementation((command) => {
      if (command === "tailscale") {
        return Promise.reject(new Error("Not active"));
      }
      return Promise.resolve({ stdout: "v1.0.0" }) as any; // ◄ El secreto está en este 'as any'
    });

    vi.mocked(select).mockResolvedValue("master");

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    await main();

    expect(fs.writeFile).toHaveBeenCalledWith(".env", "NODE_ROLE=master\n");

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
