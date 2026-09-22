import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { Client, Events, GatewayIntentBits } from 'discord.js';
import sequelize from 'sequelize';
import AwnAPI, { AwnAPIOptions } from './utils/awn-api.js';

import Logger from '../core/logger.js';
import SquadServer from './index.js';
import Plugins from './plugins/index.js';
import { SquadJSConfig, PluginConfigItem } from './types.js';

const { Sequelize } = sequelize;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default class SquadServerFactory {
  static async buildFromConfig(config: SquadJSConfig): Promise<SquadServer> {
    Logger.setTimeStamps(
      config.logger?.timestamps ? config.logger.timestamps : false,
    );

    const plugins = await Plugins.getPlugins();

    for (const plugin of Object.keys(plugins)) {
      Logger.setColor(plugin, 'magentaBright');
    }

    if (config.logger?.verboseness) {
      for (const [module, verboseness] of Object.entries(
        config.logger.verboseness,
      )) {
        Logger.setVerboseness(module, verboseness as number);
      }
    }

    if (config.logger?.colors) {
      for (const [module, color] of Object.entries(config.logger.colors)) {
        Logger.setColor(module, color as string);
      }
    }

    Logger.verbose('SquadServerFactory', 1, 'Creating SquadServer...');
    const server = new SquadServer(config.server);

    Logger.verbose('SquadServerFactory', 1, 'Preparing connectors...');
    const connectors: Record<string, unknown> = {};
    for (const pluginConfig of config.plugins || []) {
      if (!pluginConfig.enabled) continue;

      if (!plugins[pluginConfig.plugin]) {
        throw new Error(`Plugin ${pluginConfig.plugin} does not exist.`);
      }

      const Plugin = plugins[pluginConfig.plugin];
      const specs =
        (Plugin.optionsSpecification as PluginOptionsSpecification) || {};

      for (const [optionName, option] of Object.entries(specs)) {
        if (!option.connector) continue;

        if (!(optionName in pluginConfig)) {
          throw new Error(
            `${Plugin.name}: ${optionName} (${option.connector} connector) is missing.`,
          );
        }

        const connectorName = pluginConfig[optionName] as string;

        if (connectors[connectorName]) continue;

        connectors[connectorName] = await SquadServerFactory.createConnector(
          server,
          option.connector,
          connectorName,
          config.connectors[connectorName],
        );
      }
    }

    Logger.verbose('SquadServerFactory', 1, 'Initialising plugins...');

    for (const pluginConfig of config.plugins || []) {
      if (!pluginConfig.enabled) continue;

      if (!plugins[pluginConfig.plugin]) {
        throw new Error(`Plugin ${pluginConfig.plugin} does not exist.`);
      }

      const Plugin = plugins[pluginConfig.plugin];

      Logger.verbose('SquadServerFactory', 1, `Initialising ${Plugin.name}...`);

      const plugin = new Plugin(server, pluginConfig, connectors);
      await plugin.prepareToMount();
      server.plugins.push(plugin);
    }

    return server;
  }

  static async createConnector(
    _server: SquadServer,
    type: string,
    connectorName: string,
    connectorConfig: unknown,
  ): Promise<Client | Sequelize.Sequelize | AwnAPI> {
    Logger.verbose(
      'SquadServerFactory',
      1,
      `Starting ${type} connector ${connectorName}...`,
    );

    if (type === 'discord') {
      const connector = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMembers,
        ],
      });
      connector.once(Events.ClientReady, (readyClient) => {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`);
      });
      await connector.login(connectorConfig as string);
      connector.on('messageCreate', (message) => {
        connector.emit('message', message);
      });
      return connector;
    }

    if (type === 'sequelize') {
      let connector: Sequelize.Sequelize;

      if (typeof connectorConfig === 'string') {
        connector = new Sequelize(connectorConfig, {
          define: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci',
          },
          logging: (msg: string) => Logger.verbose('Sequelize', 3, msg),
        });
      } else if (
        typeof connectorConfig === 'object' &&
        connectorConfig !== null
      ) {
        connector = new Sequelize({
          ...(connectorConfig as Sequelize.Options),
          logging: (msg: string) => Logger.verbose('Sequelize', 3, msg),
        });
      } else {
        throw new Error('Unknown sequelize connector config type.');
      }

      await connector.authenticate();
      return connector;
    }

    if (type === 'awnAPI') {
      const awnConfig = connectorConfig as AwnAPIOptions;
      const awn = new AwnAPI(awnConfig);
      await awn.auth(awnConfig);
      return awn;
    }

    throw new Error(`${type} is an unsupported connector type.`);
  }

  static parseConfig(configString: string): SquadJSConfig {
    try {
      return JSON.parse(configString);
    } catch (_err) {
      throw new Error('Unable to parse config file.');
    }
  }

  static buildFromConfigString(configString: string): Promise<SquadServer> {
    Logger.verbose('SquadServerFactory', 1, 'Parsing config string...');
    return SquadServerFactory.buildFromConfig(
      SquadServerFactory.parseConfig(configString),
    );
  }

  static readConfigFile(configPath = './config.json'): string {
    const resolvedPath = path.isAbsolute(configPath)
      ? configPath
      : path.resolve(process.cwd(), configPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Config file does not exist at ${resolvedPath}`);
    }
    return fs.readFileSync(resolvedPath, 'utf8');
  }

  static buildFromConfigFile(configPath?: string): Promise<SquadServer> {
    Logger.verbose('SquadServerFactory', 1, 'Reading config file...');
    return SquadServerFactory.buildFromConfigString(
      SquadServerFactory.readConfigFile(configPath),
    );
  }

  static async buildConfig(): Promise<SquadJSConfig> {
    const plugins = await Plugins.getPlugins();

    const templatePath = path.resolve(
      __dirname,
      './templates/config-template.json',
    );
    const templateString = fs.readFileSync(templatePath, 'utf8');
    const template = SquadServerFactory.parseConfig(templateString);

    const pluginKeys = Object.keys(plugins).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );

    for (const pluginKey of pluginKeys) {
      const Plugin = plugins[pluginKey];

      const pluginConfig: PluginConfigItem = {
        plugin: Plugin.name,
        enabled: Plugin.defaultEnabled,
      };
      const specs =
        (Plugin.optionsSpecification as PluginOptionsSpecification) || {};
      for (const [optionName, option] of Object.entries(specs)) {
        pluginConfig[optionName] = option.default;
      }

      template.plugins.push(pluginConfig);
    }

    return template;
  }

  static async buildConfigFile(): Promise<void> {
    const configPath = path.resolve(process.cwd(), 'config.json');
    const config = await SquadServerFactory.buildConfig();

    const configString = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, configString);
  }

  static async buildReadmeFile(): Promise<void> {
    const plugins = await Plugins.getPlugins();

    const pluginKeys = Object.keys(plugins).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );

    const pluginInfo: string[] = [];

    for (const pluginName of pluginKeys) {
      const Plugin = plugins[pluginName];
      const specs =
        (Plugin.optionsSpecification as PluginOptionsSpecification) || {};

      const options: string[] = [];
      for (const [optionName, option] of Object.entries(specs)) {
        let optionInfo = `<li><h4>${optionName}${
          option.required ? ' (Required)' : ''
        }</h4>
           <h6>Description</h6>
           <p>${option.description}</p>
           <h6>Default</h6>
           <pre><code>${
             typeof option.default === 'object'
               ? JSON.stringify(option.default, null, 2)
               : option.default
           }</code></pre></li>`;

        if (option.example) {
          optionInfo += `<h6>Example</h6>
           <pre><code>${
             typeof option.example === 'object'
               ? JSON.stringify(option.example, null, 2)
               : option.example
           }</code></pre>`;
        }

        options.push(optionInfo);
      }

      pluginInfo.push(
        `<details>
          <summary>${Plugin.name}</summary>
          <h2>${Plugin.name}</h2>
          <p>${Plugin.description}</p>
          <h3>Options</h3>
          <ul>${options.join('\n')}</ul>
        </details>`,
      );
    }

    const pluginInfoText = pluginInfo.join('\n\n');

    const templatePath = path.resolve(
      __dirname,
      './templates/readme-template.md',
    );
    const template = fs.readFileSync(templatePath, 'utf8');

    const readmePath = path.resolve(process.cwd(), 'README.md');
    const readme = template.replace(/\/\/PLUGIN-INFO\/\//, pluginInfoText);

    fs.writeFileSync(readmePath, readme);
  }
}
