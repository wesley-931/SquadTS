import path from 'path';
import { SFTPTail } from 'ftp-tail';

export interface SFTPLogReaderOptions {
  sftp?: Record<string, unknown>;
  logDir?: string;
  filename?: string;
  fetchInterval?: number;
  maxTempFileSize?: number;
}

export default class SFTPLogReader {
  private options: SFTPLogReaderOptions;
  private reader: InstanceType<typeof SFTPTail>;

  constructor(
    queueLine: (line: string) => void,
    options: SFTPLogReaderOptions = {},
  ) {
    if (!options.sftp || !options.logDir) {
      throw new Error('sftp and logDir must be specified.');
    }
    if (typeof queueLine !== 'function') {
      throw new Error(
        'queueLine argument must be specified and be a function.',
      );
    }

    this.options = options;

    this.reader = new SFTPTail({
      sftp: options.sftp,
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
