import EventEmitter from 'events';
import async from 'async';
import moment from 'moment';

import Logger from '../logger.js';

import TailLogReader from './log-readers/tail.js';
import SFTPLogReader from './log-readers/sftp.js';
import FTPLogReader from './log-readers/ftp.js';

export type MatchArray = (string | number | Date)[];

export interface LogParserRule {
  regex: RegExp;
  onMatch: (match: MatchArray, logParser: LogParser) => void;
}

export interface LogParserOptions {
  filename?: string;
  mode?: 'tail' | 'sftp' | 'ftp';
  logDir?: string;
  sftp?: Record<string, unknown>;
  ftp?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface EventStorePlayer {
  controller: string;
  suffix: string;
  steamID: string;
  eosID: string;
  [key: string]: unknown;
}

export interface EventStoreJoinRequest {
  chainID: number | string;
  suffix: string;
}

export interface EventStore {
  disconnected: Record<string, boolean>;
  players: Record<string, EventStorePlayer>;
  session: Record<string, unknown>;
  joinRequests: EventStoreJoinRequest[];
}

export interface ILogReader {
  watch(): Promise<void>;
  unwatch(): Promise<void>;
}

export default class LogParser extends EventEmitter {
  public eventStore: EventStore;
  public linesPerMinute = 0;
  public matchingLinesPerMinute = 0;
  public matchingLatency = 0;
  public parsingStatsInterval: NodeJS.Timeout | null = null;
  public logReader: ILogReader;
  public queue: async.QueueObject<string>;

  constructor(filename = 'filename.log', options: LogParserOptions = {}) {
    super();

    options.filename = filename;

    this.eventStore = {
      disconnected: {},
      players: {},
      session: {},
      joinRequests: [],
    };

    this.processLine = this.processLine.bind(this);
    this.logStats = this.logStats.bind(this);

    this.queue = async.queue(this.processLine);

    switch (options.mode || 'tail') {
      case 'tail':
        this.logReader = new TailLogReader(
          (line) => this.queue.push(line),
          options,
        );
        break;
      case 'sftp':
        this.logReader = new SFTPLogReader(
          (line) => this.queue.push(line),
          options,
        );
        break;
      case 'ftp':
        this.logReader = new FTPLogReader(
          (line) => this.queue.push(line),
          options,
        );
        break;
      default:
        throw new Error('Invalid log reader mode.');
    }
  }

  async processLine(line: string): Promise<void> {
    Logger.verbose('LogParser', 4, `Matching on line: ${line}`);

    for (const rule of this.getRules()) {
      const match = line.match(rule.regex);
      if (!match) continue;

      Logger.verbose('LogParser', 3, `Matched on line: ${match[0]}`);

      const matchArray: MatchArray = Array.from(match);
      matchArray[1] = moment
        .utc(matchArray[1] as string, 'YYYY.MM.DD-hh.mm.ss:SSS')
        .toDate();
      matchArray[2] = parseInt(matchArray[2] as string, 10);

      rule.onMatch(matchArray, this);

      this.matchingLinesPerMinute++;
      this.matchingLatency += Date.now() - (matchArray[1] as Date).getTime();

      break;
    }

    this.linesPerMinute++;
  }

  clearEventStore(): void {
    Logger.verbose('LogParser', 2, 'Cleaning Eventstore');
    for (const player of Object.values(this.eventStore.players)) {
      if (this.eventStore.disconnected[player.eosID] === true) {
        Logger.verbose(
          'LogParser',
          2,
          `Removing ${player.eosID} from eventStore`,
        );
        delete this.eventStore.players[player.eosID];
        delete this.eventStore.disconnected[player.eosID];
      }
    }
    this.eventStore.session = {};
  }

  getRules(): LogParserRule[] {
    return [];
  }

  async watch(): Promise<void> {
    Logger.verbose('LogParser', 1, 'Attempting to watch log file...');
    await this.logReader.watch();
    Logger.verbose('LogParser', 1, 'Watching log file...');

    this.parsingStatsInterval = setInterval(this.logStats, 60 * 1000);
  }

  logStats(): void {
    const avgLatency = this.matchingLinesPerMinute
      ? this.matchingLatency / this.matchingLinesPerMinute
      : 0;
    Logger.verbose(
      'LogParser',
      1,
      `Lines parsed per minute: ${this.linesPerMinute} | Matching lines per minute: ${this.matchingLinesPerMinute} | Average matching latency: ${avgLatency}ms`,
    );
    this.linesPerMinute = 0;
    this.matchingLinesPerMinute = 0;
    this.matchingLatency = 0;
  }

  async unwatch(): Promise<void> {
    await this.logReader.unwatch();

    if (this.parsingStatsInterval) {
      clearInterval(this.parsingStatsInterval);
    }
  }
}
