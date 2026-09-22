import DiscordBasePlugin from './discord-base-plugin.js';
import { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';
import { PlayerWoundedEvent } from '../types.js';

export default class DiscordTeamkill extends DiscordBasePlugin {
  static override get description(): string {
    return (
      'The <code>DiscordTeamkill</code> plugin logs teamkills and related information to a Discord channel for ' +
      'admins to review.'
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
        description: 'The ID of the channel to log teamkills to.',
        default: '',
        example: '667741905228136459',
      },
      color: {
        required: false,
        description: 'The color of the embeds.',
        default: 16761867,
      },
      disableCBL: {
        required: false,
        description: 'Disable Community Ban List information.',
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
    this.onTeamkill = this.onTeamkill.bind(this);
  }

  override async mount(): Promise<void> {
    this.server.on('TEAMKILL', this.onTeamkill);
  }

  override async unmount(): Promise<void> {
    this.server.removeListener('TEAMKILL', this.onTeamkill);
  }

  async onTeamkill(info: PlayerWoundedEvent): Promise<void> {
    if (!info.attacker) return;

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [
      {
        name: "Attacker's Name",
        value: info.attacker.name || 'Unknown',
        inline: true,
      },
      {
        name: "Attacker's SteamID",
        value: info.attacker.steamID
          ? `[${info.attacker.steamID}](https://steamcommunity.com/profiles/${info.attacker.steamID})`
          : 'Unknown',
        inline: true,
      },
      {
        name: "Attacker's EosID",
        value: info.attacker.eosID || 'Unknown',
        inline: true,
      },
      {
        name: 'Weapon',
        value: info.weapon,
      },
      {
        name: "Victim's Name",
        value: info.victim ? info.victim.name || 'Unknown' : 'Unknown',
        inline: true,
      },
      {
        name: "Victim's SteamID",
        value: info.victim?.steamID
          ? `[${info.victim.steamID}](https://steamcommunity.com/profiles/${info.victim.steamID})`
          : 'Unknown',
        inline: true,
      },
      {
        name: "Victim's EosID",
        value: info.victim ? info.victim.eosID || 'Unknown' : 'Unknown',
        inline: true,
      },
    ];

    if (!this.options.disableCBL && info.attacker.steamID) {
      fields.push({
        name: 'Community Ban List',
        value: `[Attacker's Bans](https://communitybanlist.com/search/${info.attacker.steamID})`,
      });
    }

    await this.sendDiscordMessage({
      embed: {
        title: `Teamkill: ${info.attacker.name}`,
        color: this.options.color,
        fields: fields,
        timestamp: info.time
          ? info.time.toISOString()
          : new Date().toISOString(),
      },
    });
  }
}
