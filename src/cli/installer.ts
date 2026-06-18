import {
  intro,
  outro,
  spinner,
  note,
  select,
  isCancel,
  text,
  multiselect,
} from "@clack/prompts"; // ◄ Añadidos text y multiselect
import { execa } from "execa";
import picocolors from "picocolors";
import { saveEnvironment, EnvConfig } from "../environment/env.js";
import { generateNodeTopologyConfig } from "../utils/hardware/hardware.js"; // ◄ Importamos tu topología
import { detectAvailableHardwareVram } from "../utils/hardware/detector.js";

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

async function verifySystemDependencies(): Promise<void> {
  const s = spinner();
  s.start("Iniciando comprobación...");

  const criticalDeps = ["git", "node", "ollama"];

  for (const dep of criticalDeps) {
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
    }
  }
  s.stop(
    picocolors.green(
      "Todas las dependencias críticas están instaladas con éxito.",
    ),
  );
}

export async function getTailscaleIP(): Promise<string | null> {
  try {
    const { stdout } = await execa("tailscale", ["ip", "-4"]);
    return stdout.trim();
  } catch {
    return null;
  }
}

async function configureNode(): Promise<void> {
  outro(picocolors.blue("🌐 Configuración del Nodo."));

  const nodeName = await text({
    message: "¿Qué nombre deseas asignarle a este nodo?",
    placeholder: "master-node-01",
    defaultValue: "master-node-01",
  });

  if (isCancel(nodeName)) {
    outro(picocolors.yellow("Configuración cancelada por el usuario."));
    process.exit(0);
  }

  // 2. Capturar el rol del nodo
  const role = await select({
    message: "Selecciona el rol de este nodo:",
    options: [
      { value: "master", label: "Master" },
      { value: "worker", label: "Worker" },
    ],
  });

  if (isCancel(role)) {
    outro(picocolors.yellow("Configuración cancelada por el usuario."));
    process.exit(0);
  }

  // 3. Seleccionar los agentes activos para este nodo específico
  const selectedAgents = await multiselect({
    message: `Selecciona los agentes que se ejecutarán en este nodo: ${picocolors.dim("(Usa [Espacio] para marcar y [Enter] para confirmar)")}`,
    options: [
      { value: "gentle-orchestrator", label: "gentle-orchestrator (Coordinador)" },
      { value: "phase-init", label: "phase-init" },
      { value: "phase-explore", label: "phase-explore" },
      { value: "phase-propose", label: "phase-propose" },
      { value: "phase-spec", label: "phase-spec" },
      { value: "phase-design", label: "phase-design" },
      { value: "phase-tasks", label: "phase-tasks" },
      { value: "phase-apply", label: "phase-apply" },
      { value: "phase-verify", label: "phase-verify" },
      { value: "phase-archive", label: "phase-archive" },
      { value: "phase-onboard", label: "phase-onboard" },
      { value: "consensus-judge-a", label: "consensus-judge-a" },
      { value: "consensus-judge-b", label: "consensus-judge-b" },
      { value: "consensus-fixer", label: "consensus-fixer" },
    ],
    required: true,
  });

  if (isCancel(selectedAgents)) {
    outro(picocolors.yellow("Configuración cancelada por el usuario."));
    process.exit(0);
  }

  const hardwareSpinner = spinner();
  hardwareSpinner.start(
    "Interrogando al sistema operativo para calcular recursos...",
  );
  const detectedVram = await detectAvailableHardwareVram();
  hardwareSpinner.stop(
    picocolors.green(
      `Análisis completado: ${detectedVram} GB de memoria asignados al clúster.`,
    ),
  );

  const ip = await getTailscaleIP();

  // 4. Integrar con tu función centralizada de topología de hardware
  const topology = generateNodeTopologyConfig({
    nodeName: nodeName as string,
    nodeRole: role as string,
    selectedAgents: selectedAgents as string[],
  });

  // Unificamos todo el objeto final de configuración del entorno
  const config: EnvConfig = {
    ...topology,
    AVAILABLE_VRAM: detectedVram.toString(), // Guardamos el límite elástico real
    ...(ip && { TAILSCALE_IP: ip }),
  };

  await saveEnvironment(config);

  if (!ip) {
    note(
      picocolors.yellow(
        "No se ha detectado una IP activa de Tailscale.\n" +
          "easy-code funcionará en modo local. Recuerda activar Tailscale si vas a enlazar múltiples nodos.",
      ),
      "⚠️ Aviso de Red",
    );
  }

  outro(picocolors.blue("✔ Configuración del nodo completada."));
}

export async function main() {
  intro(picocolors.cyan("⚙️ CONFIGURACIÓN DE EASY-CODE ⚙️"));

  await verifySystemDependencies();
  await configureNode();

  outro(
    picocolors.green(
      "🚀 ¡Todo listo! Tu entorno de easy-code ha sido inicializado.",
    ),
  );
}
