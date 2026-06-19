// src/cli/installer.ts
import React from 'react';
import { render } from 'ink';
import { execa } from 'execa';
import picocolors from 'picocolors';
import { App } from '../tui/App.js';
import { HardwareDetector } from '../hardware/index.js';
import { JsonPersistenceStore, EnvPersistenceWriter } from '../persistence/index.js';

export async function checkDependency(
  command: string,
  args: string[] = ["--version"],
): Promise<boolean> {
  try {
    await execa(command, args);
    return true;
  } catch {
    return false;
  }
}

export async function getTailscaleIP(): Promise<string | null> {
  try {
    const { stdout } = await execa("tailscale", ["ip", "-4"]);
    return stdout.trim();
  } catch {
    return null;
  }
}

async function checkLlmfitHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8787/health', {
      signal: AbortSignal.timeout(1000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function main() {
  const criticalDeps = ["git", "node", "ollama", "llmfit"];
  console.log(picocolors.cyan("⚙️ CONFIGURACIÓN DE EASY-CODE ⚙️"));
  console.log(picocolors.blue("Verificando dependencias críticas..."));
  
  for (const dep of criticalDeps) {
    const isInstalled = await checkDependency(dep);
    if (!isInstalled) {
      console.error(
        picocolors.red(
          `La dependencia crítica [${dep}] no está instalada o no es accesible en el PATH.`,
        ),
      );
      process.exit(1);
    }
  }
  
  console.log(picocolors.green("Todas las dependencias críticas están instaladas con éxito."));
  console.log("");

  // Start llmfit serve if it's not running (skip in test environment)
  if (!process.env.VITEST) {
    const isHealthy = await checkLlmfitHealth();
    if (!isHealthy) {
      console.log(picocolors.yellow("Llmfit daemon no está corriendo. Iniciando servicio local en puerto 8787..."));
      try {
        const child = execa('llmfit', ['serve', '--host', '0.0.0.0', '--port', '8787'], {
          detached: true,
          stdio: 'ignore'
        });
        if (child && typeof child.unref === 'function') {
          child.unref();
        }

        // Wait and verify health (up to 5 seconds)
        let retries = 5;
        let started = false;
        while (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (await checkLlmfitHealth()) {
            started = true;
            break;
          }
          retries--;
        }

        if (started) {
          console.log(picocolors.green("Servicio llmfit iniciado con éxito."));
        } else {
          console.warn(picocolors.yellow("Advertencia: No se pudo verificar que llmfit se haya iniciado correctamente en el puerto 8787."));
        }
      } catch (err: any) {
        console.error(picocolors.red(`Error al iniciar llmfit serve: ${err.message}`));
      }
      console.log("");
    }
  }
  
  const detector = HardwareDetector.createDefault();
  const jsonStore = new JsonPersistenceStore();
  const envWriter = new EnvPersistenceWriter();

  const services = { detector, jsonStore, envWriter };

  const { waitUntilExit } = render(React.createElement(App, { services }));
  await waitUntilExit();
}
