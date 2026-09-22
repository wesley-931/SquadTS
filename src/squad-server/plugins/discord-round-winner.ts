import DiscordBasePlugin from './discord-base-plugin.js';
import { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';
import { NewGameEvent } from '../types.js';

export default class DiscordRoundWinner extends DiscordBasePlugin {
  static override get description(): string {
    return 'The <code>DiscordRoundWinner</code> plugin will send the round winner to a Discord channel.';
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
    this.onNewGame = this.onNewGame.bind(this);
  }

  override async mount(): Promise<void> {
    this.server.on('NEW_GAME', this.onNewGame);
  }

  override async unmount(): Promise<void> {
    this.server.removeListener('NEW_GAME', this.onNewGame);
  }

  async onNewGame(info: NewGameEvent): Promise<void> {
    const layerName =
      this.server.layerHistory[1]?.layer?.name || 'Unknown Layer';
    await this.sendDiscordMessage({
      embed: {
        title: 'Round Winner',
        color: this.options.color as number,
        fields: [
          {
            name: 'Message',
            value: `${info.winner || 'Unknown'} won on ${layerName}.`,
          },
        ],
        timestamp: info.time
          ? info.time.toISOString()
          : new Date().toISOString(),
      },
    });
  }
}
