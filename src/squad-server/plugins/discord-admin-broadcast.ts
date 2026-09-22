import DiscordBasePlugin from './discord-base-plugin.js';
import { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';
import { AdminBroadcastEvent } from '../types.js';

export default class DiscordAdminBroadcast extends DiscordBasePlugin {
  static override get description(): string {
    return 'The <code>DiscordAdminBroadcast</code> plugin will send a copy of admin broadcasts made in game to a Discord channel.';
  }

  static override get defaultEnabled(): boolean {
    return false;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      ...DiscordBasePlugin.optionsSpecification,
      channelID: {
        required: true,
        description: 'The ID of the channel to log admin broadcasts to.',
        default: '',
        example: '667741905228136459',
      },
      color: {
        required: false,
        description: 'The color of the embed.',
        default: 16761867,
      },
    };
  }

  constructor(
    server: SquadServer,
    options: Record<string, unknown>,
    connectors: Record<string, unknown>,
  ) {
    super(server, options, connectors);
    this.onAdminBroadcast = this.onAdminBroadcast.bind(this);
  }

  override async mount(): Promise<void> {
    this.server.on('ADMIN_BROADCAST', this.onAdminBroadcast);
  }

  override async unmount(): Promise<void> {
    this.server.removeListener('ADMIN_BROADCAST', this.onAdminBroadcast);
  }

  async onAdminBroadcast(info: AdminBroadcastEvent): Promise<void> {
    await this.sendDiscordMessage({
      embed: {
        title: 'Admin Broadcast',
        color: this.options.color as number,
        fields: [
          {
            name: 'Message',
            value: `${info.message}`,
          },
        ],
        timestamp: info.time
          ? info.time.toISOString()
          : new Date().toISOString(),
      },
    });
  }
}
