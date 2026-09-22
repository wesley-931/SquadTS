import chalk from 'chalk';

export class Logger {
  private verboseness: Record<string, number> = {};
  private colors: Record<string, string> = {};
  private includeTimestamps = false;

  verbose(
    module: string,
    verboseness: number,
    message: string,
    ...extras: unknown[]
  ): void {
    const colorName = this.colors[module] || 'white';
    const chalkRecord = chalk as unknown as Record<
      string,
      (text: string) => string
    >;
    let colorFunc = chalkRecord[colorName];
    if (typeof colorFunc !== 'function') {
      colorFunc = chalk.white;
    }

    if ((this.verboseness[module] || 1) >= verboseness) {
      const timestamp = this.includeTimestamps
        ? `[${new Date().toISOString()}]`
        : '';
      console.log(
        `${timestamp}[${colorFunc(module)}][${verboseness}] ${message}`,
        ...extras,
      );
    }
  }

  setVerboseness(module: string, verboseness: number): void {
    this.verboseness[module] = verboseness;
  }

  setColor(module: string, color: string): void {
    this.colors[module] = color;
  }

  setTimeStamps(option: boolean): void {
    this.includeTimestamps = option;
  }
}

const loggerInstance = new Logger();
export default loggerInstance;
