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

export async function main() {
  const criticalDeps = ["git", "node", "ollama"];
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

  const detector = HardwareDetector.createDefault();
  const jsonStore = new JsonPersistenceStore();
  const envWriter = new EnvPersistenceWriter();

  const services = { detector, jsonStore, envWriter };

  const { waitUntilExit } = render(React.createElement(App, { services }));
  await waitUntilExit();
}
