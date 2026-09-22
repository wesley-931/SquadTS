import BasePlugin, { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';

export default class FogOfWar extends BasePlugin {
  static override get description(): string {
    return 'The <code>FogOfWar</code> plugin can be used to automate setting fog of war mode.';
  }

  static override get defaultEnabled(): boolean {
    return false;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      mode: {
        required: false,
        description: 'Fog of war mode to set.',
        default: 1,
      },
      delay: {
        required: false,
        description: 'Delay before setting fog of war mode.',
        default: 10 * 1000,
      },
    };
  }

  constructor(
    server: SquadServer,
    options: Record<string, unknown>,
    connectors: Record<string, unknown>,
  ) {
    super(server, options, connectors);
    this.onNewGame = this.onNewGame.bind(this);
  }

  override async mount(): Promise<void> {
    this.server.on('NEW_GAME', this.onNewGame);
  }

  override async unmount(): Promise<void> {
    this.server.removeListener('NEW_GAME', this.onNewGame);
  }

  async onNewGame(): Promise<void> {
    setTimeout(
      () => {
        this.server.rcon.setFogOfWar(String(this.options.mode));
      },
      (this.options.delay as number) || 10000,
    );
  }
}
