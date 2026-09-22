import tinygradient from 'tinygradient';
import { COPYRIGHT_MESSAGE } from '../utils/constants.js';
import DiscordBaseMessageUpdater from './discord-base-message-updater.js';
import { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';

export default class DiscordServerStatus extends DiscordBaseMessageUpdater {
  private updateIntervalHandle?: NodeJS.Timeout;
  private updateStatusIntervalHandle?: NodeJS.Timeout;

  static override get description(): string {
    return 'The <code>DiscordServerStatus</code> plugin can be used to get the server status in Discord.';
  }

  static override get defaultEnabled(): boolean {
    return true;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      ...DiscordBaseMessageUpdater.optionsSpecification,
      command: {
        required: false,
        description: 'Command name to get message.',
        default: '!status',
      },
      updateInterval: {
        required: false,
        description: 'How frequently to update the time in Discord.',
        default: 60 * 1000,
      },
      setBotStatus: {
        required: false,
        description:
          "Whether to update the bot's status with server information.",
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
    this.updateMessages = this.updateMessages.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
  }

  override async mount(): Promise<void> {
    await super.mount();
    this.updateIntervalHandle = setInterval(
      this.updateMessages,
      this.options.updateInterval as number,
    );
    this.updateStatusIntervalHandle = setInterval(
      this.updateStatus,
      this.options.updateInterval as number,
    );
  }

  override async unmount(): Promise<void> {
    await super.unmount();
    if (this.updateIntervalHandle) clearInterval(this.updateIntervalHandle);
    if (this.updateStatusIntervalHandle)
      clearInterval(this.updateStatusIntervalHandle);
  }

  override async generateMessage(): Promise<unknown> {
    let players = `${this.server.a2sPlayerCount}`;
    if (this.server.publicQueue + this.server.reserveQueue > 0) {
      players += ` (+${this.server.publicQueue + this.server.reserveQueue})`;
    }

    players += ` / ${this.server.publicSlots}`;
    if (this.server.reserveSlots > 0)
      players += ` (+${this.server.reserveSlots})`;

    const layerName = this.server.currentLayer
      ? this.server.currentLayer.name
      : (await this.server.rcon.getCurrentMap()).layer;

    const ratio =
      this.server.a2sPlayerCount /
      ((this.server.publicSlots || 1) + (this.server.reserveSlots || 0));
    const clampedRatio = Math.min(1, Math.max(0, ratio));

    const color = parseInt(
      tinygradient([
        { color: '#ff0000', pos: 0 },
        { color: '#ffff00', pos: 0.5 },
        { color: '#00ff00', pos: 1 },
      ])
        .rgbAt(clampedRatio)
        .toHex(),
      16,
    );

    const embedobj = {
      title: this.server.serverName,
      fields: [
        {
          name: 'Players',
          value: players,
        },
        {
          name: 'Current Layer',
          value: `\`\`\`${layerName || 'Unknown'}\`\`\``,
          inline: true,
        },
        {
          name: 'Next Layer',
          value: `\`\`\`${
            this.server.nextLayer?.name ||
            (this.server.nextLayerToBeVoted ? 'To be voted' : 'Unknown')
          }\`\`\``,
          inline: true,
        },
      ],
      color: color,
      footer: { text: COPYRIGHT_MESSAGE },
      timestamp: new Date(),
      image: {
        url: this.server.currentLayer
          ? `https://raw.githubusercontent.com/Squad-Wiki/squad-wiki-pipeline-map-data/master/completed_output/_Current%20Version/images/${this.server.currentLayer.layerid}.jpg`
          : undefined,
      },
    };

    return { embeds: [embedobj] };
  }

  async updateStatus(): Promise<void> {
    if (!this.options.setBotStatus) return;

    let playersStr = `${this.server.a2sPlayerCount}`;
    if (this.server.publicQueue || this.server.reserveQueue) {
      playersStr += `+${this.server.publicQueue + this.server.reserveQueue}`;
    }

    let slotsStr = `${this.server.publicSlots}`;
    if (this.server.reserveSlots) slotsStr += `+${this.server.reserveSlots}`;

    await this.options.discordClient.user?.setActivity(
      `(${playersStr}/${slotsStr}) ${
        this.server.currentLayer?.name || 'Unknown'
      }`,
      { type: 4 },
    );
  }
}
