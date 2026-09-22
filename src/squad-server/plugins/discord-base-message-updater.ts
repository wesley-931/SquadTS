import Sequelize, { ModelCtor, Model } from 'sequelize';
import { Client, Message } from 'discord.js';
import BasePlugin, { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';

const { DataTypes } = Sequelize;

export default class DiscordBaseMessageUpdater extends BasePlugin {
  public SubscribedMessage: ModelCtor<Model>;

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      discordClient: {
        required: true,
        description: 'Discord connector name.',
        connector: 'discord',
        default: 'discord',
      },
      messageStore: {
        required: true,
        description: 'Sequelize connector name.',
        connector: 'sequelize',
        default: 'sqlite',
      },
      command: {
        required: true,
        description: 'Command name to get message.',
        default: '',
        example: '!command',
      },
      disableSubscriptions: {
        required: false,
        description:
          'Whether to allow messages to be subscribed to automatic updates.',
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

    const sequelizeConn = this.options.messageStore as Sequelize.Sequelize;
    this.SubscribedMessage = sequelizeConn.define(
      `${(this.constructor as typeof BasePlugin).name}_SubscribedMessage`,
      {
        channelID: DataTypes.STRING,
        messageID: DataTypes.STRING,
        server: DataTypes.INTEGER,
      },
      { timestamps: false },
    );

    this.onDiscordMessage = this.onDiscordMessage.bind(this);
  }

  override async prepareToMount(): Promise<void> {
    await this.SubscribedMessage.sync();
  }

  override async mount(): Promise<void> {
    const client = this.options.discordClient as Client;
    client.on('messageCreate', this.onDiscordMessage);
  }

  override async unmount(): Promise<void> {
    const client = this.options.discordClient as Client;
    client.removeListener('messageCreate', this.onDiscordMessage);
  }

  async generateMessage(): Promise<unknown> {
    throw new Error('generateMessage method must be defined.');
  }

  async onDiscordMessage(message: Message): Promise<void> {
    const commandMatch = message.content.match(
      new RegExp(
        `^${this.options.command}(?: (subscribe)| (unsubscribe) ([0-9]+) ([0-9]+))?$`,
        'i',
      ),
    );

    if (!commandMatch) return;

    const [subscribe, unsubscribe, channelID, messageID] =
      commandMatch.slice(1);

    if (subscribe === undefined && unsubscribe === undefined) {
      this.verbose(1, 'Generating message content...');
      const generatedMessage = await this.generateMessage();

      this.verbose(1, 'Sending non-subscription message...');
      await message.channel.send(generatedMessage);
      this.verbose(1, 'Sent non-subscription message.');

      return;
    }

    if (subscribe !== undefined) {
      if (this.options.disableSubscriptions) {
        await message.reply('automated updates is disabled.');
        return;
      }

      this.verbose(1, 'Generating message content...');
      const generatedMessage = await this.generateMessage();

      this.verbose(1, 'Sending subscription message...');
      const newMessage = await message.channel.send(generatedMessage);
      this.verbose(1, 'Sent subscription message.');

      const newChannelID = newMessage.channel.id;
      const newMessageID = newMessage.id;

      this.verbose(
        1,
        `Subscribing message (Channel ID: ${newChannelID}, Message ID: ${newMessageID}) to automated updates...`,
      );
      await this.SubscribedMessage.create({
        channelID: newChannelID,
        messageID: newMessageID,
        server: this.server.id,
      });
      this.verbose(
        1,
        `Subscribed message (Channel ID: ${newChannelID}, Message ID: ${newMessageID}) to automated updates.`,
      );

      return;
    }

    if (unsubscribe !== undefined) {
      this.verbose(
        1,
        `Unsubscribing message (Channel ID: ${channelID}, Message ID: ${messageID}) from automated updates...`,
      );
      await this.SubscribedMessage.destroy({
        where: {
          channelID: channelID,
          messageID: messageID,
          server: this.server.id,
        },
      });
      this.verbose(
        1,
        `Unsubscribed message (Channel ID: ${channelID}, Message ID: ${messageID}) from automated updates.`,
      );

      this.verbose(1, 'Sending acknowledgement message...');
      await message.reply('unsubscribed message from automated updates.');
      this.verbose(1, 'Sent acknowledgement message.');
    }
  }

  async updateMessages(): Promise<void> {
    this.verbose(1, 'Generating message content for update...');
    const generatedMessage = await this.generateMessage();

    const subscribedMessages = await this.SubscribedMessage.findAll({
      where: { server: this.server.id },
    });

    this.verbose(1, `Updating ${subscribedMessages.length} messages...`);
    for (const subscribedMessage of subscribedMessages) {
      const { channelID, messageID } = subscribedMessage;

      try {
        this.verbose(
          1,
          `Getting message (Channel ID: ${channelID}, Message ID: ${messageID})...`,
        );
        const channel =
          await this.options.discordClient.channels.fetch(channelID);
        const message = await channel.messages.fetch(messageID);

        this.verbose(
          1,
          `Updating message (Channel ID: ${channelID}, Message ID: ${messageID})...`,
        );
        await message.edit(generatedMessage);
        this.verbose(
          1,
          `Updated message (Channel ID: ${channelID}, Message ID: ${messageID}).`,
        );
      } catch (err: unknown) {
        const errorObj = err as { code?: number };
        if (errorObj.code === 10008) {
          this.verbose(
            1,
            `Message (Channel ID: ${channelID}, Message ID: ${messageID}) was deleted. Removing from automated updates...`,
          );
          await subscribedMessage.destroy();
        } else {
          this.verbose(
            1,
            `Message (Channel ID: ${channelID}, Message ID: ${messageID}) could not be updated: `,
            err,
          );
        }
      }
    }
  }
}
