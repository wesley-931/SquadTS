import path from 'path';
import { FTPTail } from 'ftp-tail';

export interface FTPLogReaderOptions {
  ftp?: Record<string, unknown>;
  logDir?: string;
  filename?: string;
  fetchInterval?: number;
  maxTempFileSize?: number;
}

export default class FTPLogReader {
  private options: FTPLogReaderOptions;
  private reader: InstanceType<typeof FTPTail>;

  constructor(
    queueLine: (line: string) => void,
    options: FTPLogReaderOptions = {},
  ) {
    if (!options.ftp || !options.logDir) {
      throw new Error('ftp and logDir must be specified.');
    }
    if (typeof queueLine !== 'function') {
      throw new Error(
        'queueLine argument must be specified and be a function.',
      );
    }

    this.options = options;

    this.reader = new FTPTail({
      ftp: options.ftp,
      fetchInterval: options.fetchInterval || 0,
      maxTempFileSize: options.maxTempFileSize || 5 * 1000 * 1000,
    });

    this.reader.on('line', queueLine);
  }

  async watch(): Promise<void> {
    const filename = this.options.filename || 'SquadGame.log';
    await this.reader.watch(
      path.join(this.options.logDir!, filename).replace(/\\/g, '/'),
    );
  }

  async unwatch(): Promise<void> {
    await this.reader.unwatch();
  }
}
