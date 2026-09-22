import DiscordBasePlugin from './discord-base-plugin.js';
import { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';

export interface TeamScoreInfo {
  team: number | string;
  subfaction?: string;
  faction?: string;
  tickets: number;
  layer?: string;
  level?: string;
}

export interface RoundEndEvent {
  winner?: TeamScoreInfo | null;
  loser?: TeamScoreInfo | null;
  time?: Date;
}

export default class DiscordRoundEnded extends DiscordBasePlugin {
  static override get description(): string {
    return 'The <code>DiscordRoundEnded</code> plugin will send the round winner to a Discord channel.';
  }

  static override get defaultEnabled(): boolean {
    return true;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      ...DiscordBasePlugin.optionsSpecification,
      channelID: {
        required: true,
        description: 'The ID of the channel to log round end events to.',
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
    this.onRoundEnd = this.onRoundEnd.bind(this);
  }

  override async mount(): Promise<void> {
    this.server.on('ROUND_ENDED', this.onRoundEnd);
  }

  override async unmount(): Promise<void> {
    this.server.removeListener('ROUND_ENDED', this.onRoundEnd);
  }

  async onRoundEnd(info: RoundEndEvent): Promise<void> {
    if (!info.winner || !info.loser) {
      await this.sendDiscordMessage({
        embed: {
          title: 'Round Ended',
          description: 'This match Ended in a Draw',
          color: this.options.color as number,
          timestamp: info.time
            ? info.time.toISOString()
            : new Date().toISOString(),
        },
      });
      return;
    }

    await this.sendDiscordMessage({
      embed: {
        title: 'Round Ended',
        description: `${info.winner.layer || ''} - ${info.winner.level || ''}`,
        color: this.options.color as number,
        fields: [
          {
            name: `Team ${info.winner.team} Won`,
            value: `${info.winner.subfaction || ''}\n ${
              info.winner.faction || ''
            }\n won with ${info.winner.tickets} tickets.`,
          },
          {
            name: `Team ${info.loser.team} Lost`,
            value: `${info.loser.subfaction || ''}\n ${
              info.loser.faction || ''
            }\n lost with ${info.loser.tickets} tickets.`,
          },
          {
            name: 'Ticket Difference',
            value: `${info.winner.tickets - info.loser.tickets}.`,
          },
        ],
        timestamp: info.time
          ? info.time.toISOString()
          : new Date().toISOString(),
      },
    });
  }
}
