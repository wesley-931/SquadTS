import DiscordBasePlugin from './discord-base-plugin.js';
import { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';
import { ChatMessageEvent } from '../types.js';

export default class DiscordChat extends DiscordBasePlugin {
  static override get description(): string {
    return 'The <code>DiscordChat</code> plugin will log in-game chat to a Discord channel.';
  }

  static override get defaultEnabled(): boolean {
    return true;
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
      chatColors: {
        required: false,
        description: 'The color of the embed for each chat.',
        default: {},
        example: { ChatAll: 16761867 },
      },
      color: {
        required: false,
        description: 'The color of the embed.',
        default: 16761867,
      },
      ignoreChats: {
        required: false,
        default: ['ChatSquad'],
        description: 'A list of chat names to ignore.',
      },
    };
  }

  constructor(
    server: SquadServer,
    options: Record<string, unknown>,
    connectors: Record<string, unknown>,
  ) {
    super(server, options, connectors);
    this.onChatMessage = this.onChatMessage.bind(this);
  }

  override async mount(): Promise<void> {
    this.server.on('CHAT_MESSAGE', this.onChatMessage);
  }

  override async unmount(): Promise<void> {
    this.server.removeListener('CHAT_MESSAGE', this.onChatMessage);
  }

  async onChatMessage(info: ChatMessageEvent): Promise<void> {
    const ignoreChats = (this.options.ignoreChats as string[]) || [];
    if (ignoreChats.includes(info.chat)) return;

    const chatColors =
      (this.options.chatColors as Record<string, number>) || {};
    const color = chatColors[info.chat] || (this.options.color as number);

    await this.sendDiscordMessage({
      embed: {
        title: info.chat,
        color: color,
        fields: [
          {
            name: 'Player',
            value: info.player?.name || info.name || 'Unknown',
            inline: true,
          },
          {
            name: 'SteamID',
            value: info.player?.steamID
              ? `[${info.player.steamID}](https://steamcommunity.com/profiles/${info.player.steamID})`
              : 'Unknown',
            inline: true,
          },
          {
            name: 'EosID',
            value: info.player?.eosID || info.eosID || 'Unknown',
            inline: true,
          },
          {
            name: 'Team & Squad',
            value: `Team: ${info.player?.teamID ?? 'N/A'}, Squad: ${
              info.player?.squadID || 'Unassigned'
            }`,
          },
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
