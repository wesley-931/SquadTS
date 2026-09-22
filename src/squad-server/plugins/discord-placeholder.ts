import { Client, Message } from 'discord.js';
import BasePlugin, { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';

export default class DiscordPlaceholder extends BasePlugin {
  private escapeRegex = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  static override get description(): string {
    return (
      'The <code>DiscordPlaceholder</code> plugin allows you to make your bot create placeholder messages that ' +
      'can be used when configuring other plugins.'
    );
  }

  static override get defaultEnabled(): boolean {
    return true;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      discordClient: {
        required: true,
        description: 'Discord connector name.',
        connector: 'discord',
        default: 'discord',
      },
      command: {
        required: false,
        description: 'Command to create Discord placeholder.',
        default: '!placeholder',
      },
      channelID: {
        required: true,
        description:
          'The bot will only answer with a placeholder on this channel',
        default: '',
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
    if (message.channel?.id !== (this.options.channelID as string)) return;
    const command = (this.options.command as string) || '!placeholder';
    const prefixRegex = new RegExp(`^(${this.escapeRegex(command)})\\s*`);
    if (!prefixRegex.test(message.content)) return;
    await (
      message.channel as unknown as { send: (msg: string) => Promise<unknown> }
    ).send('Placeholder.');
  }
}
