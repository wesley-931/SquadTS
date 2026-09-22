import BasePlugin, { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';

export default class IntervalledBroadcasts extends BasePlugin {
  private intervalHandle?: NodeJS.Timeout;

  static override get description(): string {
    return (
      'The <code>IntervalledBroadcasts</code> plugin allows you to set broadcasts, which will be broadcasted at ' +
      'preset intervals'
    );
  }

  static override get defaultEnabled(): boolean {
    return false;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      broadcasts: {
        required: false,
        description: 'Messages to broadcast.',
        default: [],
        example: ['This server is powered by SquadJS.'],
      },
      interval: {
        required: false,
        description: 'Frequency of the broadcasts in milliseconds.',
        default: 5 * 60 * 1000,
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
  }

  override async mount(): Promise<void> {
    this.intervalHandle = setInterval(
      this.broadcast,
      (this.options.interval as number) || 300000,
    );
  }

  override async unmount(): Promise<void> {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
  }

  async broadcast(): Promise<void> {
    const broadcasts = this.options.broadcasts as string[] | undefined;
    if (!broadcasts || broadcasts.length === 0) return;
    const msg = broadcasts[0];
    await this.server.rcon.broadcast(msg);
    const shifted = broadcasts.shift();
    if (shifted) broadcasts.push(shifted);
  }
}
