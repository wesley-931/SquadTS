import BasePlugin, { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';
import { PlayerWoundedEvent } from '../types.js';

export default class AutoTKWarn extends BasePlugin {
  static override get description(): string {
    return 'The <code>AutoTkWarn</code> plugin will automatically warn players with a message when they teamkill.';
  }

  static override get defaultEnabled(): boolean {
    return true;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      attackerMessage: {
        required: false,
        description: 'The message to warn attacking players with.',
        default: 'Please apologise for ALL TKs in ALL chat!',
      },
      victimMessage: {
        required: false,
        description: 'The message that will be sent to the victim.',
        default: null,
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
    if (info.attacker?.eosID && this.options.attackerMessage) {
      await this.server.rcon.warn(
        info.attacker.eosID,
        this.options.attackerMessage as string,
      );
    }
    if (info.victim?.eosID && this.options.victimMessage) {
      await this.server.rcon.warn(
        info.victim.eosID,
        this.options.victimMessage as string,
      );
    }
  }
}
