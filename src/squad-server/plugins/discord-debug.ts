import DiscordBasePlugin from './discord-base-plugin.js';
import { PluginOptionsSpecification } from './base-plugin.js';

export default class DiscordDebug extends DiscordBasePlugin {
  static override get description(): string {
    return (
      'The <code>DiscordDebug</code> plugin can be used to help debug SquadJS by dumping SquadJS events to a ' +
      'Discord channel.'
    );
  }

  static override get defaultEnabled(): boolean {
    return false;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      ...DiscordBasePlugin.optionsSpecification,
      channelID: {
        required: true,
        description: 'The ID of the channel to log events to.',
        default: '',
        example: '667741905228136459',
      },
      events: {
        required: true,
        description: 'A list of events to dump.',
        default: [],
        example: ['PLAYER_DIED'],
      },
    };
  }

  override async mount(): Promise<void> {
    for (const event of this.options.events as string[]) {
      this.server.on(event, async (info: unknown) => {
        await this.sendDiscordMessage(
          `\`\`\`json\n${JSON.stringify(
            typeof info === 'object' && info !== null
              ? { ...info, event }
              : { data: info, event },
            null,
            2,
          )}\n\`\`\``,
        );
      });
    }
  }
}
