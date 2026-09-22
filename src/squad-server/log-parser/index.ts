import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import LogParser, {
  LogParserOptions,
  LogParserRule,
} from '../../core/log-parser/index.js';
import Logger from '../../core/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default class SquadLogParser extends LogParser {
  private _rules: LogParserRule[] = [];

  constructor(options: LogParserOptions = {}) {
    super('SquadGame.log', options);
  }

  override async watch(): Promise<void> {
    await this.setupRules();
    return super.watch();
  }

  async setupRules(): Promise<void> {
    this._rules = [];
    const files = await fs.promises.opendir(path.resolve(__dirname, './'));
    for await (const file of files) {
      if (!file.isFile()) continue;
      if (!file.name.endsWith('.js') && !file.name.endsWith('.ts')) continue;
      if (file.name.endsWith('.d.ts') || file.name.startsWith('index.'))
        continue;

      Logger.verbose(
        'SquadLogParser',
        1,
        `Loading parser file ${file.name}...`,
      );
      const filePath = path.join(__dirname, file.name);
      const module = await import(pathToFileURL(filePath).href);
      if (
        module &&
        'default' in module &&
        'regex' in module.default &&
        'onMatch' in module.default
      ) {
        this._rules.push(module.default);
      }
    }
  }

  override getRules(): LogParserRule[] {
    return this._rules;
  }
}
