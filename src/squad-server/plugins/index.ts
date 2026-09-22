import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../../core/logger.js';
import BasePlugin from './base-plugin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type PluginClass = typeof BasePlugin;

export class Plugins {
  private plugins: Record<string, PluginClass> | null = null;

  async getPlugins(force = false): Promise<Record<string, PluginClass>> {
    if (this.plugins && !force) {
      return this.plugins;
    }

    this.plugins = {};

    const dir = await fs.promises.opendir(path.join(__dirname, './'));

    const pluginFilenames: string[] = [];
    const excluded = [
      'index.js',
      'index.ts',
      'base-plugin.js',
      'base-plugin.ts',
      'discord-base-message-updater.js',
      'discord-base-message-updater.ts',
      'discord-base-plugin.js',
      'discord-base-plugin.ts',
      'readme.md',
    ];

    for await (const dirent of dir) {
      if (!dirent.isFile()) continue;
      if (!dirent.name.endsWith('.js') && !dirent.name.endsWith('.ts'))
        continue;
      if (dirent.name.endsWith('.d.ts')) continue;
      if (excluded.includes(dirent.name)) continue;

      pluginFilenames.push(dirent.name);
    }

    for (const pluginFilename of pluginFilenames) {
      Logger.verbose('Plugins', 1, `Loading plugin file ${pluginFilename}...`);
      const module = await import(`./${pluginFilename}`);
      const Plugin = module.default;
      if (Plugin && Plugin.name) {
        this.plugins[Plugin.name] = Plugin;
      }
    }

    return this.plugins;
  }
}

const pluginsInstance = new Plugins();
export default pluginsInstance;
