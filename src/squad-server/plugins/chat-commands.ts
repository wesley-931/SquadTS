import BasePlugin, { PluginOptionsSpecification } from './base-plugin.js';
import { ChatMessageEvent } from '../types.js';

export interface CommandConfig {
  command: string;
  type: 'warn' | 'broadcast';
  response: string;
  ignoreChats: string[];
}

export default class ChatCommands extends BasePlugin {
  static override get description(): string {
    return (
      'The <code>ChatCommands</code> plugin can be configured to make chat commands that broadcast or warn the ' +
      'caller with present messages.'
    );
  }

  static override get defaultEnabled(): boolean {
    return true;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      commands: {
        required: false,
        description: 'An array of command objects.',
        default: [
          {
            command: 'squadjs',
            type: 'warn',
            response: 'This server is powered by SquadJS.',
            ignoreChats: [],
          },
        ],
      },
    };
  }

  override async mount(): Promise<void> {
    for (const command of this.options.commands as CommandConfig[]) {
      this.server.on(
        `CHAT_COMMAND:${command.command.toLowerCase()}`,
        async (data: ChatMessageEvent) => {
          if (command.ignoreChats && command.ignoreChats.includes(data.chat))
            return;

          if (command.type === 'broadcast') {
            await this.server.rcon.broadcast(command.response);
          } else if (command.type === 'warn') {
            const eosID = data.player?.eosID || data.eosID;
            if (eosID) {
              await this.server.rcon.warn(eosID, command.response);
            }
          }
        },
      );
    }
  }
}
