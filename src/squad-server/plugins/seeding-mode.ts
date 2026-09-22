import BasePlugin, { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';

export default class SeedingMode extends BasePlugin {
  private stop = false;
  private intervalHandle?: NodeJS.Timeout;

  static override get description(): string {
    return (
      'The <code>SeedingMode</code> plugin broadcasts seeding rule messages to players at regular intervals ' +
      'when the server is below a specified player count.'
    );
  }

  static override get defaultEnabled(): boolean {
    return true;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      interval: {
        required: false,
        description: 'Frequency of seeding messages in milliseconds.',
        default: 2.5 * 60 * 1000,
      },
      seedingThreshold: {
        required: false,
        description:
          'Player count required for server not to be in seeding mode.',
        default: 50,
      },
      seedingMessage: {
        required: false,
        description: 'Seeding message to display.',
        default:
          'Seeding Rules Active! Fight only over the middle flags! No FOB Hunting!',
      },
      liveEnabled: {
        required: false,
        description: 'Enable "Live" messages for when the server goes live.',
        default: true,
      },
      liveThreshold: {
        required: false,
        description:
          'Player count required for "Live" messages to not be displayed.',
        default: 52,
      },
      liveMessage: {
        required: false,
        description: '"Live" message to display.',
        default: 'Live!',
      },
      waitOnNewGames: {
        required: false,
        description: 'Should the plugin wait to be executed on NEW_GAME event.',
        default: true,
      },
      waitTimeOnNewGame: {
        required: false,
        description: 'The time to wait before check player counts in seconds.',
        default: 30,
      },
    };
  }

  constructor(
    server: SquadServer,
    options: Record<string, unknown>,
    connectors: Record<string, unknown>,
  ) {
    super(server, options, connectors);
    this.broadcast = this.broadcast.bind(this);
    this.onNewGame = this.onNewGame.bind(this);
  }

  override async mount(): Promise<void> {
    if (this.options.waitOnNewGames) {
      this.server.on('NEW_GAME', this.onNewGame);
    }
    this.intervalHandle = setInterval(
      this.broadcast,
      (this.options.interval as number) || 150000,
    );
  }

  override async unmount(): Promise<void> {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
    this.server.removeListener('NEW_GAME', this.onNewGame);
  }

  onNewGame(): void {
    this.stop = true;
    setTimeout(
      () => {
        this.stop = false;
      },
      ((this.options.waitTimeOnNewGame as number) || 30) * 1000,
    );
  }

  async broadcast(): Promise<void> {
    if (this.stop) return;
    const seedingThreshold = (this.options.seedingThreshold as number) || 50;
    const liveThreshold = (this.options.liveThreshold as number) || 52;
    if (
      this.server.a2sPlayerCount !== 0 &&
      this.server.a2sPlayerCount < seedingThreshold
    ) {
      await this.server.rcon.broadcast(this.options.seedingMessage as string);
    } else if (
      this.server.a2sPlayerCount !== 0 &&
      this.options.liveEnabled &&
      this.server.a2sPlayerCount < liveThreshold
    ) {
      await this.server.rcon.broadcast(this.options.liveMessage as string);
    }
  }
}
