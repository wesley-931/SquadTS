import { Client, Message } from 'discord.js';
import BasePlugin, { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';

export default class DiscordRcon extends BasePlugin {
  static override get description(): string {
    return (
      'The <code>DiscordRcon</code> plugin allows a specified Discord channel to be used as a RCON console to ' +
      'run RCON commands.'
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
      channelID: {
        required: true,
        description: 'ID of channel to turn into RCON console.',
        default: '',
        example: '667741905228136459',
      },
      permissions: {
        required: false,
        description: 'Dictionary of roles and a list of permissions.',
        default: {},
        example: {
          '123456789123456789': [
            'AdminBroadcast',
            'AdminForceTeamChange',
            'AdminDemoteCommander',
          ],
        },
      },
      prependAdminNameInBroadcast: {
        required: false,
        description: 'Prepend admin names when making announcements.',
        default: false,
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
    if (
      message.author?.bot ||
      message.channel?.id !== (this.options.channelID as string)
    )
      return;

    let command: string = message.content;

    if (this.options.prependAdminNameInBroadcast) {
      const displayName =
        message.member?.displayName || message.author?.username || 'Admin';
      command = command.replace(
        /^AdminBroadcast /i,
        `AdminBroadcast ${displayName}: `,
      );
    }

    const permissions = (this.options.permissions || {}) as Record<
      string,
      string[]
    >;
    if (Object.keys(permissions).length !== 0) {
      const commandPrefix = command.match(/([^ ]+)/);

      let hasPermission = false;
      if (commandPrefix && message.member) {
        const roles = Array.from(message.member.roles.cache.keys());
        for (const [role, allowedCommands] of Object.entries(permissions)) {
          if (!roles.includes(role)) continue;
          for (const allowedCommand of allowedCommands) {
            if (
              commandPrefix[1].toLowerCase() === allowedCommand.toLowerCase()
            ) {
              hasPermission = true;
            }
          }
        }
      }

      if (!hasPermission) {
        await message.reply('you do not have permission to run that command.');
        return;
      }
    }

    const response = await this.server.rcon.execute(command);
    await this.respondToMessage(message, response);
  }

  async respondToMessage(message: Message, response: string): Promise<void> {
    for (const splitResponse of this.splitLongResponse(response)) {
      await (
        message.channel as unknown as {
          send: (msg: string) => Promise<unknown>;
        }
      ).send(`\`\`\`${splitResponse}\`\`\``);
    }
  }

  splitLongResponse(response: string): string[] {
    const responseMessages: string[] = [''];

    for (const line of (response || '').split('\n')) {
      if (
        responseMessages[responseMessages.length - 1].length + line.length >
        1994
      ) {
        responseMessages.push(line);
      } else {
        responseMessages[responseMessages.length - 1] = `${
          responseMessages[responseMessages.length - 1]
        }\n${line}`;
      }
    }

    return responseMessages;
  }
}
