import DiscordBasePlugin from './discord-base-plugin.js';
import { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';
import { SquadCreatedEvent } from '../types.js';

export default class DiscordSquadCreated extends DiscordBasePlugin {
  static override get description(): string {
    return 'The <code>SquadCreated</code> plugin will log Squad Creation events to a Discord channel.';
  }

  static override get defaultEnabled(): boolean {
    return false;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      ...DiscordBasePlugin.optionsSpecification,
      channelID: {
        required: true,
        description: 'The ID of the channel to log Squad Creation events to.',
        default: '',
        example: '667741905228136459',
      },
      color: {
        required: false,
        description: 'The color of the embed.',
        default: 16761867,
      },
      useEmbed: {
        required: false,
        description: `Send message as Embed`,
        default: true,
      },
    };
  }

  constructor(
    server: SquadServer,
    options: Record<string, unknown>,
    connectors: Record<string, unknown>,
  ) {
    super(server, options, connectors);
    this.onSquadCreated = this.onSquadCreated.bind(this);
  }

  override async mount(): Promise<void> {
    this.server.on('SQUAD_CREATED', this.onSquadCreated);
  }

  override async unmount(): Promise<void> {
    this.server.removeListener('SQUAD_CREATED', this.onSquadCreated);
  }

  async onSquadCreated(info: SquadCreatedEvent): Promise<void> {
    if (this.options.useEmbed) {
      await this.sendDiscordMessage({
        embed: {
          title: `Squad Created`,
          color: this.options.color as number,
          fields: [
            {
              name: 'Player',
              value: info.player?.name || 'Unknown',
              inline: true,
            },
            {
              name: 'Team',
              value: info.teamName || 'Unknown',
              inline: true,
            },
            {
              name: 'Squad Number & Squad Name',
              value: `${info.player?.squadID ?? info.squadID} : ${
                info.squadName
              }`,
            },
          ],
          timestamp: info.time
            ? info.time.toISOString()
            : new Date().toISOString(),
        },
      });
    } else {
      await this.sendDiscordMessage(
        ` \`\`\`Player: ${info.player?.name || 'Unknown'}\n created Squad ${
          info.player?.squadID ?? info.squadID
        } : ${info.squadName}\n on ${info.teamName}\`\`\` `,
      );
    }
  }
}
