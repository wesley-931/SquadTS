import Logger from '../../core/logger.js';
import SquadServer from '../index.js';

export interface PluginOptionSpec {
  required?: boolean;
  description: string;
  default?: unknown;
  example?: unknown;
  connector?: string;
}

export interface PluginOptionsSpecification {
  [optionName: string]: PluginOptionSpec;
}

export default class BasePlugin {
  public server: SquadServer;
  public options: Record<string, unknown> = {};
  public rawOptions: Record<string, unknown>;

  static get description(): string {
    throw new Error('Plugin missing "static get description()" method.');
  }

  static get defaultEnabled(): boolean {
    throw new Error('Plugin missing "static get defaultEnabled()" method.');
  }

  static get optionsSpecification(): PluginOptionsSpecification {
    throw new Error(
      'Plugin missing "static get optionsSpecification()" method.',
    );
  }

  constructor(
    server: SquadServer,
    options: Record<string, unknown>,
    connectors: Record<string, unknown>,
  ) {
    this.server = server;
    this.rawOptions = options;

    const specs = (this.constructor as typeof BasePlugin).optionsSpecification;
    for (const [optionName, option] of Object.entries(specs)) {
      if (option.connector) {
        this.options[optionName] =
          connectors[this.rawOptions[optionName] as string];
      } else {
        if (option.required) {
          if (!(optionName in this.rawOptions)) {
            throw new Error(
              `${
                (this.constructor as typeof BasePlugin).name
              }: ${optionName} is required but missing.`,
            );
          }
          if (option.default === this.rawOptions[optionName]) {
            throw new Error(
              `${
                (this.constructor as typeof BasePlugin).name
              }: ${optionName} is required but is the default value.`,
            );
          }
        }

        this.options[optionName] =
          typeof this.rawOptions[optionName] !== 'undefined'
            ? this.rawOptions[optionName]
            : option.default;
      }
    }
  }

  async prepareToMount(): Promise<void> {}

  async mount(): Promise<void> {}

  async unmount(): Promise<void> {}

  verbose(verboseness: number, message: string, ...extras: unknown[]): void {
    Logger.verbose(
      (this.constructor as typeof BasePlugin).name,
      verboseness,
      message,
      ...extras,
    );
  }
}
