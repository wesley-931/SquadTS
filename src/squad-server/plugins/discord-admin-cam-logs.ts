import DiscordBasePlugin from './discord-base-plugin.js';
import { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';
import { Player } from '../types.js';

export interface AdminCamEvent {
  player?: Player | null;
  name?: string;
  duration?: number;
  time?: Date;
}

export default class DiscordAdminCamLogs extends DiscordBasePlugin {
  public adminsInCam: Record<string, Date> = {};

  static override get description(): string {
    return 'The <code>DiscordAdminCamLogs</code> plugin will log in game admin camera usage to a Discord channel.';
  }

  static override get defaultEnabled(): boolean {
    return false;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      ...DiscordBasePlugin.optionsSpecification,
      channelID: {
        required: true,
        description: 'The ID of the channel to log admin camera usage to.',
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
    this.onEntry = this.onEntry.bind(this);
    this.onExit = this.onExit.bind(this);
  }

  override async mount(): Promise<void> {
    this.server.on('POSSESSED_ADMIN_CAMERA', this.onEntry);
    this.server.on('UNPOSSESSED_ADMIN_CAMERA', this.onExit);
  }

  override async unmount(): Promise<void> {
    this.server.removeListener('POSSESSED_ADMIN_CAMERA', this.onEntry);
    this.server.removeListener('UNPOSSESSED_ADMIN_CAMERA', this.onExit);
  }

  async onEntry(info: AdminCamEvent): Promise<void> {
    await this.sendDiscordMessage({
      embed: {
        title: `Admin Entered Admin Camera`,
        color: this.options.color as number,
        fields: [
          {
            name: "Admin's Name",
            value: info.player?.name || info.name || 'Unknown',
            inline: true,
          },
          {
            name: "Admin's SteamID",
            value: info.player?.steamID
              ? `[${info.player.steamID}](https://steamcommunity.com/profiles/${info.player.steamID})`
              : 'Unknown',
            inline: true,
          },
          {
            name: "Admin's EosID",
            value: info.player?.eosID || 'Unknown',
            inline: true,
          },
        ],
        timestamp: info.time
          ? info.time.toISOString()
          : new Date().toISOString(),
      },
    });
  }

  async onExit(info: AdminCamEvent): Promise<void> {
    await this.sendDiscordMessage({
      embed: {
        title: `Admin Left Admin Camera`,
        color: this.options.color as number,
        fields: [
          {
            name: "Admin's Name",
            value: info.player?.name || info.name || 'Unknown',
            inline: true,
          },
          {
            name: "Admin's SteamID",
            value: info.player?.steamID
              ? `[${info.player.steamID}](https://steamcommunity.com/profiles/${info.player.steamID})`
              : 'Unknown',
            inline: true,
          },
          {
            name: "Admin's EosID",
            value: info.player?.eosID || 'Unknown',
            inline: true,
          },
          {
            name: 'Time in Admin Camera',
            value: `${Math.round((info.duration || 0) / 60000)} mins`,
          },
        ],
        timestamp: info.time
          ? info.time.toISOString()
          : new Date().toISOString(),
      },
    });
  }
}
