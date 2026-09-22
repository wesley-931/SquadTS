import path from 'path';
import TailModule from 'tail';

export interface TailLogReaderOptions {
  logDir?: string;
  filename?: string;
}

export default class TailLogReader {
  private reader: InstanceType<typeof TailModule.Tail>;

  constructor(
    queueLine: (line: string) => void,
    options: TailLogReaderOptions = {},
  ) {
    if (!options.logDir) {
      throw new Error('logDir must be specified.');
    }
    if (typeof queueLine !== 'function') {
      throw new Error(
        'queueLine argument must be specified and be a function.',
      );
    }

    const filename = options.filename || 'SquadGame.log';
    this.reader = new TailModule.Tail(path.join(options.logDir, filename), {
      useWatchFile: true,
    });

    this.reader.on('line', queueLine);
  }

  async watch(): Promise<void> {
    this.reader.watch();
  }

  async unwatch(): Promise<void> {
    this.reader.unwatch();
  }
}
