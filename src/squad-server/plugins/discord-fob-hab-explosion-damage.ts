import DiscordBasePlugin from './discord-base-plugin.js';
import { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';
import { Player } from '../types.js';

export interface DeployableDamagedEvent {
  deployable?: string;
  weapon?: string;
  player?: Player | null;
  time?: Date;
}

export default class DiscordFOBHABExplosionDamage extends DiscordBasePlugin {
  static override get description(): string {
    return (
      'The <code>DiscordFOBHABExplosionDamage</code> plugin logs damage done to FOBs and HABs by ' +
      'explosions to help identify engineers blowing up friendly FOBs and HABs.'
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
        description:
          'The ID of the channel to log FOB/HAB explosion damage to.',
        default: '',
        example: '667741905228136459',
      },
      color: {
        required: false,
        description: 'The color of the embeds.',
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
    this.onDeployableDamaged = this.onDeployableDamaged.bind(this);
  }

  override async mount(): Promise<void> {
    this.server.on('DEPLOYABLE_DAMAGED', this.onDeployableDamaged);
  }

  override async unmount(): Promise<void> {
    this.server.removeListener('DEPLOYABLE_DAMAGED', this.onDeployableDamaged);
  }

  async onDeployableDamaged(info: DeployableDamagedEvent): Promise<void> {
    if (!info.deployable || !info.deployable.match(/(?:FOBRadio|Hab)_/i))
      return;
    if (!info.weapon || !info.weapon.match(/_Deployable_/i)) return;
    if (!info.player) return;

    const fields = [
      {
        name: "Player's Name",
        value: info.player.name || 'Unknown',
        inline: true,
      },
      {
        name: "Player's SteamID",
        value: info.player.steamID
          ? `[${info.player.steamID}](https://steamcommunity.com/profiles/${info.player.steamID})`
          : 'Unknown',
        inline: true,
      },
      {
        name: "Player's EosID",
        value: info.player.eosID || 'Unknown',
        inline: true,
      },
      {
        name: 'Deployable',
        value: info.deployable,
      },
      {
        name: 'Weapon',
        value: info.weapon,
      },
    ];

    await this.sendDiscordMessage({
      embed: {
        title: `FOB/HAB Explosion Damage: ${info.player.name || 'Unknown'}`,
        color: this.options.color as number,
        fields: fields,
        timestamp: info.time
          ? info.time.toISOString()
          : new Date().toISOString(),
      },
    });
  }
}
