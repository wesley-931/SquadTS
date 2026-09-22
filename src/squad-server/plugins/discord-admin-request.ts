import DiscordBasePlugin from './discord-base-plugin.js';
import { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';
import { ChatMessageEvent } from '../types.js';

export default class DiscordAdminRequest extends DiscordBasePlugin {
  public lastPing: number;

  static override get description(): string {
    return (
      'The <code>DiscordAdminRequest</code> plugin will ping admins in a Discord channel when a player requests ' +
      'an admin via the <code>!admin</code> command in in-game chat.'
    );
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
      ignoreChats: {
        required: false,
        description: 'A list of chat names to ignore.',
        default: [],
        example: ['ChatSquad'],
      },
      ignorePhrases: {
        required: false,
        description: 'A list of phrases to ignore.',
        default: [],
        example: ['switch'],
      },
      command: {
        required: false,
        description: 'The command that calls an admin.',
        default: 'admin',
      },
      pingGroups: {
        required: false,
        description: 'A list of Discord role IDs to ping.',
        default: [],
        example: ['500455137626554379'],
      },
      pingHere: {
        required: false,
        description: 'Ping @here.',
        default: false,
      },
      pingDelay: {
        required: false,
        description: 'Cooldown for pings in milliseconds.',
        default: 60 * 1000,
      },
      color: {
        required: false,
        description: 'The color of the embed.',
        default: 16761867,
      },
      warnInGameAdmins: {
        required: false,
        description:
          'Should in-game admins be warned after a player uses the command.',
        default: false,
      },
      showInGameAdmins: {
        required: false,
        description: 'Should players know how many in-game admins are online?',
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
    this.lastPing = Date.now() - ((this.options.pingDelay as number) || 60000);
    this.onChatCommand = this.onChatCommand.bind(this);
  }

  override async mount(): Promise<void> {
    this.server.on(`CHAT_COMMAND:${this.options.command}`, this.onChatCommand);
  }

  override async unmount(): Promise<void> {
    this.server.removeListener(
      `CHAT_COMMAND:${this.options.command}`,
      this.onChatCommand,
    );
  }

  async onChatCommand(info: ChatMessageEvent): Promise<void> {
    const ignoreChats = (this.options.ignoreChats as string[]) || [];
    if (ignoreChats.includes(info.chat)) return;

    const ignorePhrases = (this.options.ignorePhrases as string[]) || [];
    for (const ignorePhrase of ignorePhrases) {
      if (info.message.includes(ignorePhrase)) return;
    }

    if (info.message.length === 0 && info.player?.eosID) {
      await this.server.rcon.warn(
        info.player.eosID,
        `Please specify what you would like help with when requesting an admin.`,
      );
      return;
    }

    const admins = this.server.getAdminsWithPermission(
      'canseeadminchat',
      'eosID',
    );
    let amountAdmins = 0;
    for (const player of this.server.players) {
      if (!player.eosID || !admins.includes(player.eosID)) continue;
      amountAdmins++;
      if (this.options.warnInGameAdmins) {
        await this.server.rcon.warn(
          player.eosID,
          `[${info.player.name}] - ${info.message}`,
        );
      }
    }

    const message: Record<string, unknown> = {
      embed: {
        title: `${info.player?.name || info.name} has requested admin support!`,
        color: this.options.color as number,
        fields: [
          {
            name: 'Player',
            value: info.player?.name || info.name,
            inline: true,
          },
          {
            name: 'SteamID',
            value: `[${info.player?.steamID}](https://steamcommunity.com/profiles/${info.player?.steamID})`,
            inline: true,
          },
          {
            name: "Player's EosID",
            value: info.player.eosID,
            inline: true,
          },
          {
            name: 'Team & Squad',
            value: `Team: ${info.player.teamID}, Squad: ${
              info.player.squadID || 'Unassigned'
            }`,
          },
          {
            name: 'Message',
            value: info.message,
          },
          {
            name: 'Admins Online',
            value: amountAdmins,
          },
        ],
        timestamp: info.time
          ? info.time.toISOString()
          : new Date().toISOString(),
      },
    };

    if (
      this.options.pingGroups.length > 0 &&
      Date.now() - this.options.pingDelay > this.lastPing
    ) {
      const pingGroupsStr = this.options.pingGroups
        .map((groupID: string) => `<@&${groupID}>`)
        .join(' ');
      if (
        this.options.pingHere === true &&
        this.options.pingGroups.length === 0
      ) {
        message.content = `@here - Admin Requested in ${this.server.serverName}`;
      } else if (
        this.options.pingHere === true &&
        this.options.pingGroups.length > 0
      ) {
        message.content = `@here - Admin Requested in ${this.server.serverName} - ${pingGroupsStr}`;
      } else if (
        this.options.pingHere === false &&
        this.options.pingGroups.length === 0
      ) {
        message.content = `Admin Requested in ${this.server.serverName}`;
      } else if (
        this.options.pingHere === false &&
        this.options.pingGroups.length > 0
      ) {
        message.content = `Admin Requested in ${this.server.serverName} - ${pingGroupsStr}`;
      }
      this.lastPing = Date.now();
    }

    await this.sendDiscordMessage(message);

    if (amountAdmins === 0 && this.options.showInGameAdmins) {
      await this.server.rcon.warn(
        info.player.eosID,
        `There are no in-game admins, however, an admin has been notified via Discord. Please wait for us to get back to you.`,
      );
    } else if (this.options.showInGameAdmins) {
      await this.server.rcon.warn(
        info.player.eosID,
        `There ${
          amountAdmins > 1 ? 'are' : 'is'
        } ${amountAdmins} in-game admin${
          amountAdmins > 1 ? 's' : ''
        }. Please wait for us to get back to you.`,
      );
    } else {
      await this.server.rcon.warn(
        info.player.eosID,
        `An admin has been notified. Please wait for us to get back to you.`,
      );
    }
  }
}
