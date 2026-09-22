import { Client, TextChannel } from 'discord.js';
import BasePlugin, { PluginOptionsSpecification } from './base-plugin.js';
import { COPYRIGHT_MESSAGE } from '../utils/constants.js';

export interface DiscordEmbedPayload {
  embed?: {
    title?: string;
    description?: string;
    color?: string | number;
    footer?: { text: string };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export default class DiscordBasePlugin extends BasePlugin {
  public channel: TextChannel | null = null;

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      discordClient: {
        required: true,
        description: 'Discord connector name.',
        connector: 'discord',
        default: 'discord',
      },
    };
  }

  override async prepareToMount(): Promise<void> {
    try {
      const client = this.options.discordClient as Client;
      const channelID = this.options.channelID as string;
      this.channel = (await client.channels.fetch(channelID)) as TextChannel;
    } catch (error: unknown) {
      const err = error as { message?: string; stack?: string };
      this.channel = null;
      this.verbose(
        1,
        `Could not fetch Discord channel with channelID "${this.options.channelID}". Error: ${err?.message}`,
      );
      if (err?.stack) {
        this.verbose(2, `${err.stack}`);
      }
    }
  }

  async sendDiscordMessage(
    message: string | DiscordEmbedPayload,
  ): Promise<void> {
    if (!this.channel) {
      this.verbose(
        1,
        `Could not send Discord Message. Channel not initialized.`,
      );
      return;
    }

    let payload: unknown = message;
    if (typeof message === 'object' && message !== null && 'embed' in message) {
      const embedObj = { ...message.embed };
      embedObj.footer = embedObj.footer || {
        text: COPYRIGHT_MESSAGE,
      };
      if (typeof embedObj.color === 'string') {
        embedObj.color = parseInt(embedObj.color, 16);
      }
      payload = { ...message, embeds: [embedObj] };
    }

    await (
      this.channel as unknown as { send: (msg: unknown) => Promise<unknown> }
    ).send(payload);
  }
}
