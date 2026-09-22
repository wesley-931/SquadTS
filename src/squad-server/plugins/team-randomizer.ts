import BasePlugin, { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';
import { ChatMessageEvent, Player } from '../types.js';

export default class TeamRandomizer extends BasePlugin {
  static override get description(): string {
    return (
      "The <code>TeamRandomizer</code> can be used to randomize teams. It's great for destroying clan stacks or for " +
      'social events. It can be run by typing, by default, <code>!randomize</code> into in-game admin chat'
    );
  }

  static override get defaultEnabled(): boolean {
    return true;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      command: {
        required: false,
        description: 'The command used to randomize the teams.',
        default: 'randomize',
      },
    };
  }

  constructor(
    server: SquadServer,
    options: Record<string, unknown>,
    connectors: Record<string, unknown>,
  ) {
    super(server, options, connectors);
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
    if (info.chat !== 'ChatAdmin') return;

    const players = this.server.players.slice(0);

    let currentIndex = players.length;
    let temporaryValue: Player;
    let randomIndex: number;

    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      temporaryValue = players[currentIndex];
      players[currentIndex] = players[randomIndex];
      players[randomIndex] = temporaryValue;
    }

    let team: number | string = '1';

    for (const player of players) {
      if (player.eosID && `${player.teamID}` !== `${team}`) {
        await this.server.rcon.switchTeam(player.eosID);
      }
      team = `${team}` === '1' ? '2' : '1';
    }
  }
}
