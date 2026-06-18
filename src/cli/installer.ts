// src/cli/installer.ts
import {
  intro,
  outro,
  spinner,
  note,
  select,
  isCancel,
  text,
  multiselect,
} from "@clack/prompts";
import { execa } from "execa";
import picocolors from "picocolors";
import { HardwareDetector } from "../hardware/index.js";
import { JsonPersistenceStore, EnvPersistenceWriter, PersistenceStore, EnvironmentWriter } from "../persistence/index.js";
import { OllamaRegistry } from "../registry/index.js";
import { selectBestModelForAgent, enrichModelDescriptor, AGENT_REQUIREMENTS_MAP, type AgentProfile } from "../agents/index.js";


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

export class NodeInstaller {
  private detector: HardwareDetector;
  private jsonStore: PersistenceStore;
  private envWriter: EnvironmentWriter;

  constructor(
    detector: HardwareDetector,
    jsonStore: PersistenceStore,
    envWriter: EnvironmentWriter
  ) {
    this.detector = detector;
    this.jsonStore = jsonStore;
    this.envWriter = envWriter;
  }

  async run(): Promise<void> {
    outro(picocolors.blue("🌐 Configuración del Nodo."));

    const nodeNameInput = await text({
      message: "¿Qué nombre deseas asignarle a este nodo?",
      placeholder: "master-node-01",
      defaultValue: "master-node-01",
    });

    if (isCancel(nodeNameInput)) {
      outro(picocolors.yellow("Configuración cancelada por el usuario."));
      process.exit(0);
    }

    const nodeName = nodeNameInput as string;

    const roleInput = await select({
      message: "Selecciona el rol de este nodo:",
      options: [
        { value: "master", label: "Master" },
        { value: "worker", label: "Worker" },
      ],
    });

    if (isCancel(roleInput)) {
      outro(picocolors.yellow("Configuración cancelada por el usuario."));
      process.exit(0);
    }

    const role = roleInput as string;

    const selectedAgentsInput = await multiselect({
      message: `Selecciona los agentes que se ejecutarán en este nodo: ${picocolors.dim("(Usa [Espacio] para marcar y [Enter] para confirmar)")}`,
      options: [
        { value: "agentic-orchestrator", label: "agentic-orchestrator (Coordinador)" },
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

    if (isCancel(selectedAgentsInput)) {
      outro(picocolors.yellow("Configuración cancelada por el usuario."));
      process.exit(0);
    }

    const selectedAgents = selectedAgentsInput as string[];

    const hardwareSpinner = spinner();
    hardwareSpinner.start(
      "Interrogando al sistema operativo para calcular recursos...",
    );
    
    // Usamos el detector de hardware DIP que devuelve un perfil de hardware completo.
    const hardwareProfile = await this.detector.detect();
    const detectedVram = hardwareProfile.gpu ? hardwareProfile.gpu.vramGb : hardwareProfile.memory.totalGb;

    hardwareSpinner.stop(
      picocolors.green(
        `Análisis completado: ${detectedVram} GB de memoria asignados al clúster.`,
      ),
    );

    note(
      `${picocolors.cyan("• Sistema Operativo :")} ${hardwareProfile.os}\n` +
      `${picocolors.cyan("• CPU                :")} ${hardwareProfile.cpu.model} (${hardwareProfile.cpu.cores} núcleos, ${hardwareProfile.cpu.architecture})\n` +
      `${picocolors.cyan("• Memoria RAM        :")} ${hardwareProfile.memory.totalGb} GB\n` +
      `${picocolors.cyan("• Acelerador         :")} ${hardwareProfile.accelerator.toUpperCase()}\n` +
      `${picocolors.cyan("• GPU Detectada      :")} ${hardwareProfile.gpu ? `${hardwareProfile.gpu.model} (${hardwareProfile.gpu.vramGb} GB VRAM)` : "Ninguna (Modo CPU)"}`,
      "💻 Recursos del Sistema Detectados"
    );

    // Asignación Cognitiva de Modelos a Agentes
    const registry = new OllamaRegistry();
    const rawHubModels = await registry.listAvailable();
    const cognitiveCatalog = rawHubModels.map(enrichModelDescriptor);

    const modelRecommendations: string[] = [];
    for (const agent of selectedAgents) {
      try {
        const bestModel = selectBestModelForAgent({
          agentProfile: agent as AgentProfile,
          catalogo: cognitiveCatalog,
          availableVramGb: detectedVram
        });
        const reqs = AGENT_REQUIREMENTS_MAP[agent as AgentProfile];
        const minCaps = reqs.requiredCapabilities.length > 0 ? reqs.requiredCapabilities.join(', ') : 'Ninguna';
        
        modelRecommendations.push(
          `${picocolors.bold(picocolors.yellow(`🤖 ${agent}`))}\n` +
          `  • ${picocolors.green("Recomendado    :")} ${bestModel.name}\n` +
          `  • ${picocolors.cyan("Contexto Mín.  :")} ${reqs.minContextWindow} tokens\n` +
          `  • ${picocolors.cyan("Habilidades Mín:")} ${minCaps}\n` +
          `  • ${picocolors.cyan("Métrica Prior. :")} ${reqs.priorityMetric.toUpperCase()}`
        );
      } catch (err: any) {
        modelRecommendations.push(
          `${picocolors.bold(picocolors.red(`🤖 ${agent}`))}\n` +
          `  • ${picocolors.red("⚠️ Sin compatibilidad:")} ${err.message}`
        );
      }
    }

    note(
      modelRecommendations.join('\n\n'),
      "🎯 Asignación Óptima de Modelos por Agente"
    );

    const ip = await getTailscaleIP();


    // 1. Guardar estado estructurado completo en JSON (la base de datos estructurada)
    await this.jsonStore.saveNodeState({
      nodeName,
      nodeRole: role,
      activeAgents: selectedAgents,
      hardwareProfile
    });

    // 2. Guardar la configuración del entorno en el .env tradicional
    const envConfig: Record<string, string> = {
      NODE_NAME: nodeName,
      NODE_ROLE: role,
      ACTIVE_AGENTS: selectedAgents.join(','),
      AVAILABLE_VRAM: detectedVram.toString(),
      ...(ip && { TAILSCALE_IP: ip }),
    };

    await this.envWriter.saveEnv(envConfig);

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
}

export async function main() {
  intro(picocolors.cyan("⚙️ CONFIGURACIÓN DE EASY-CODE ⚙️"));

  await verifySystemDependencies();

  // Componemos el grafo de dependencias en el Composition Root (main)
  const detector = HardwareDetector.createDefault();
  const jsonStore = new JsonPersistenceStore();
  const envWriter = new EnvPersistenceWriter();

  const installer = new NodeInstaller(detector, jsonStore, envWriter);
  await installer.run();

  outro(
    picocolors.green(
      "🚀 ¡Todo listo! Tu entorno de easy-code ha sido inicializado.",
    ),
  );
}
