import { Client, Message } from 'discord.js';
import BasePlugin, { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';

export default class DiscordSubsystemRestarter extends BasePlugin {
  static override get description(): string {
    return (
      'The <code>DiscordSubSystemRestarter</code> plugin allows you to manually restart SquadJS subsystems in case ' +
      'an issue arises with them.'
    );
  }

  static override get defaultEnabled(): boolean {
    return false;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      discordClient: {
        required: true,
        description: 'Discord connector name.',
        connector: 'discord',
        default: 'discord',
      },
      role: {
        required: true,
        description:
          'ID of role required to run the sub system restart commands.',
        default: '',
        example: '667741905228136459',
      },
    };
  }

  constructor(
    server: SquadServer,
    options: Record<string, unknown>,
    connectors: Record<string, unknown>,
  ) {
    super(server, options, connectors);
    this.onMessage = this.onMessage.bind(this);
  }

  override async mount(): Promise<void> {
    const client = this.options.discordClient as Client;
    client.on('messageCreate', this.onMessage);
  }

  override async unmount(): Promise<void> {
    const client = this.options.discordClient as Client;
    client.removeListener('messageCreate', this.onMessage);
  }

  async onMessage(message: Message): Promise<void> {
    if (message.author?.bot) return;

    const roles = message.member
      ? Array.from(message.member.roles.cache.keys())
      : [];

    if (message.content.match(/!squadjs restartsubsystem rcon/i)) {
      if (!roles.includes(this.options.role as string)) {
        await message.reply('you do not have permission to do that.');
        return;
      }

      await this.server.restartRCON();
      await message.reply('restarted the SquadJS RCON subsystem.');
    }

    if (message.content.match(/!squadjs restartsubsystem logparser/i)) {
      if (!roles.includes(this.options.role as string)) {
        await message.reply('you do not have permission to do that.');
        return;
      }

      await this.server.restartLogParser();
      await message.reply('restarted the SquadJS LogParser subsystem.');
    }
  }
}
