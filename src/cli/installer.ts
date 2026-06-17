import { intro, outro, spinner, note, select, isCancel } from '@clack/prompts';
import { execa } from 'execa';
import picocolors from 'picocolors';
import { saveEnvironment, EnvConfig } from '../utils/env.js';

export async function checkDependency(command: string, args: string[] = ['--version']): Promise<boolean> {
  try {
    await execa(command, args);
    return true;
  } catch {
    return false;    
  }
}

async function verifySystemDependencies(): Promise<void> {
  const s = spinner();
  s.start('Iniciando comprobación...');

  const criticalDeps = ["git", "node", "ollama"];

  for (const dep of criticalDeps) {
    s.message(`Verificando dependencia: [${dep}]...`);
    const isInstalled = await checkDependency(dep);
    
    if (!isInstalled) {
      s.stop(picocolors.red(`Error en la verificación`));
      note(
        picocolors.red(`La dependencia crítica [${dep}] no está instalada o no es accesible en el PATH.`),
        '⚠️ Requisito Faltante'
      );
      process.exit(1);
    }
  }
  s.stop(picocolors.green('Todas las dependencias críticas están instaladas con éxito.'));
}

export async function getTailscaleIP(): Promise<string | null> {
  try {
    const { stdout } = await execa('tailscale', ['ip', '-4']);
    return stdout.trim();
  } catch {
    return null;
  }
}

async function configureNode(): Promise<void> {
  outro(picocolors.blue("🌐 Configuración del Nodo."));

  const role = await select({
    message: 'Selecciona el rol de este nodo:',
    options: [
      { value: 'master', label: 'Master' },
      { value: 'worker', label: 'Worker' },
    ],
  });

  if (isCancel(role)) {
    outro(picocolors.yellow('Configuración cancelada por el usuario.'));
    process.exit(0);
  }

  
  const ip = await getTailscaleIP();

  // 3. Persistencia agnóstica
  const config: EnvConfig = {
    NODE_ROLE: role as string,
    ...(ip && { TAILSCALE_IP: ip })
  };
  await saveEnvironment(config);

  
  if (!ip) {
    note(
      picocolors.yellow(
        "No se ha detectado una IP activa de Tailscale.\n" +
        "easy-code funcionará en modo local. Recuerda activar Tailscale si vas a enlazar múltiples nodos."
      ),
      "⚠️ Aviso de Red"
    );
  }

  outro(picocolors.blue("✔ Configuración del nodo completada."));
}

// === EL ORQUESTADOR PRINCIPAL (AHORA SÍ, 100% PURO) ===
export async function main() {
  intro(picocolors.cyan("⚙️ CONFIGURACIÓN DE EASY-CODE ⚙️"));

  await verifySystemDependencies();
  await configureNode();

  outro(picocolors.green("🚀 ¡Todo listo! Tu entorno de easy-code ha sido inicializado."));
}