import { intro, outro, spinner, note, select, isCancel } from "@clack/prompts";
import { execa } from "execa";
import picocolors from "picocolors";
import fs from 'fs/promises';

export async function checkDependency(
  command: string,
  args: string[] = ["--version"],
): Promise<boolean> {
  try {
    await execa(command, args);
    return true;
  } catch (error) {
    return false;
  }
}

async function verifySystemDependencies(): Promise<void> {
  const s = spinner();
  s.start("Iniciando comprobación...");

  const criticalDeps = ["git", "node", "ollama"];

  for (const dep of criticalDeps) {
    // 1. Actualizamos el mensaje del spinner en cada iteración para que sea dinámico
    s.message(`Verificando dependencia: [${dep}]...`);

    const isInstalled = await checkDependency(dep);

    if (!isInstalled) {
      s.stop(picocolors.red(`Error en la verificación`));

      note(
        picocolors.red(
          `La dependencia crítica [${dep}] no está instalada o no es accesible en el PATH.`,
        ),
        "⚠️ Requisito Faltante",
      );

      process.exit(1);
      return;
    }
  }

  s.stop(
    picocolors.green(
      "Todas las dependencias críticas están instaladas con éxito.",
    ),
  );

  
}




async function askNodeRole(): Promise<string> {
  const role = await select({
    message: 'Selecciona el rol de este nodo. MASTER si el nodo es tu equipo más potente o  WORKER en caso contrario',
    options: [
      {value: 'master', label: 'Master'},
      {value: 'worker', label: 'Worker'}
    ]
  });

  if(isCancel(role)){
    outro(picocolors.yellow('Configuración cancelada por el usuario.'));
    process.exit(0);
  }

  return role as string;
}

async function saveEnvironment(role: string): Promise<void> {
  await fs.writeFile('.env', `NODE_ROLE=${role}\n`);
}






export async function main() {
  intro(picocolors.cyan("⚙️ CONFIGURACIÓN DE EASY-CODE ⚙️"));
  await verifySystemDependencies();
  outro(picocolors.blue("✔ Comprobación inicial completada."));
  
  outro(picocolors.blue("🌐 Configuración del Nodo."));
  const role = await askNodeRole();
  await saveEnvironment(role);
  outro(picocolors.blue("✔ Configuración del nodo completada."))

}