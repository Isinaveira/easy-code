import fs from 'fs/promises';

export interface EnvConfig {
    NODE_ROLE: string;
    TAILSCALE_IP?: string;
    [key: string]: string | undefined;
}



export async function saveEnvironment(config: EnvConfig): Promise <void> {
    const content = Object.entries(config)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n';

    await fs.writeFile('.env', content);
}


