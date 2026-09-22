import EventEmitter from 'events';
import net from 'net';
import util from 'util';

import Logger from './logger.js';

const SERVERDATA_EXECCOMMAND = 0x02;
const SERVERDATA_RESPONSE_VALUE = 0x00;
const SERVERDATA_AUTH = 0x03;
const SERVERDATA_AUTH_RESPONSE = 0x02;
const SERVERDATA_CHAT_VALUE = 0x01;

const MID_PACKET_ID = 0x01;
const END_PACKET_ID = 0x02;

export interface RconOptions {
  host: string;
  port: number;
  password: string;
  autoReconnectDelay?: number;
  autoReconnectInterval?: number;
}

export interface DecodedPacket {
  size: number;
  id: number;
  count: number;
  type: number;
  body: string;
}

export interface CallbackItem {
  id: number;
  cmd: string;
}

export default class Rcon extends EventEmitter {
  public host: string;
  public port: number;
  public password: string;
  public autoReconnectDelay: number;
  public maximumPacketSize = 4096;
  public connected = false;
  public autoReconnect = false;
  public autoReconnectTimeout: NodeJS.Timeout | null = null;
  public loggedin = false;

  private client: net.Socket;
  private incomingData: Buffer = Buffer.from([]);
  private incomingResponse: DecodedPacket[] = [];
  private responseCallbackQueue: Array<
    (res: string | DecodedPacket | Error) => void
  > = [];
  private callbackIds: CallbackItem[] = [];
  private count = 1;

  constructor(options: RconOptions) {
    super();

    for (const option of ['host', 'port', 'password'] as const) {
      if (!(option in options) || options[option] === undefined) {
        throw new Error(`${option} must be specified.`);
      }
    }

    this.host = options.host;
    this.port = options.port;
    this.password = options.password;
    this.autoReconnectDelay =
      options.autoReconnectDelay || options.autoReconnectInterval || 5000;

    this.connect = this.connect.bind(this);
    this.onPacket = this.onPacket.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onError = this.onError.bind(this);
    this.decodeData = this.decodeData.bind(this);
    this.encodePacket = this.encodePacket.bind(this);

    this.client = new net.Socket();
    this.client.on('data', this.decodeData);
    this.client.on('close', this.onClose);
    this.client.on('error', this.onError);
  }

  onPacket(decodedPacket: DecodedPacket): void {
    Logger.verbose(
      'RCON',
      2,
      `Processing decoded packet: ${this.decodedPacketToString(decodedPacket)}`,
    );

    switch (decodedPacket.type) {
      case SERVERDATA_RESPONSE_VALUE:
      case SERVERDATA_AUTH_RESPONSE:
        switch (decodedPacket.id) {
          case MID_PACKET_ID:
            this.incomingResponse.push(decodedPacket);
            break;
          case END_PACKET_ID: {
            this.callbackIds = this.callbackIds.filter(
              (p) => p.id !== decodedPacket.count,
            );

            const callback = this.responseCallbackQueue.shift();
            if (callback) {
              callback(
                this.incomingResponse.map((packet) => packet.body).join(''),
              );
            }
            this.incomingResponse = [];
            break;
          }
          default:
            Logger.verbose(
              'RCON',
              1,
              `Unknown packet ID ${
                decodedPacket.id
              } in: ${this.decodedPacketToString(decodedPacket)}`,
            );
            this.onClose('Unknown Packet');
        }
        break;

      case SERVERDATA_CHAT_VALUE:
        this.processChatPacket(decodedPacket);
        break;

      default:
        Logger.verbose(
          'RCON',
          1,
          `Unknown packet type ${
            decodedPacket.type
          } in: ${this.decodedPacketToString(decodedPacket)}`,
        );
        this.onClose('Unknown Packet');
    }
  }

  decodeData(data: Buffer): void {
    Logger.verbose('RCON', 4, `Got data: ${this.bufToHexString(data)}`);

    this.incomingData = Buffer.concat([this.incomingData, data]);

    while (this.incomingData.byteLength >= 4) {
      const size = this.incomingData.readInt32LE(0);
      const packetSize = size + 4;

      if (this.incomingData.byteLength < packetSize) {
        Logger.verbose(
          'RCON',
          4,
          `Waiting for more data... Have: ${this.incomingData.byteLength} Expected: ${packetSize}`,
        );
        break;
      }
      const packet = this.incomingData.subarray(0, packetSize);

      Logger.verbose(
        'RCON',
        4,
        `Processing packet: ${this.bufToHexString(packet)}`,
      );
      const decodedPacket = this.decodePacket(packet);

      const matchCount = this.callbackIds.filter(
        (d) => d.id === decodedPacket.count,
      );

      if (
        matchCount.length > 0 ||
        [SERVERDATA_AUTH_RESPONSE, SERVERDATA_CHAT_VALUE].includes(
          decodedPacket.type,
        )
      ) {
        this.onPacket(decodedPacket);
        this.incomingData = this.incomingData.subarray(packetSize);
        continue;
      }

      const probePacketSize = 21;
      if (size === 10 && this.incomingData.byteLength >= 21) {
        const probeBuf = this.incomingData.subarray(0, probePacketSize);
        const decodedProbePacket = this.decodePacket(probeBuf);

        if (decodedProbePacket.body === '\x00\x00\x00\x01\x00\x00\x00') {
          this.incomingData = this.incomingData.subarray(probePacketSize);
          Logger.verbose(
            'RCON',
            4,
            `Ignoring some data: ${this.bufToHexString(probeBuf)}`,
          );
          continue;
        }
      }

      break;
    }
  }

  decodePacket(packet: Buffer): DecodedPacket {
    return {
      size: packet.readUInt32LE(0),
      id: packet.readUInt8(4),
      count: packet.readUInt16LE(6),
      type: packet.readUInt32LE(8),
      body: packet.toString('utf8', 12, packet.byteLength - 2),
    };
  }

  processChatPacket(_decodedPacket: DecodedPacket): void {}

  onClose(hadError: boolean | string | Error): void {
    this.connected = false;
    this.loggedin = false;
    Logger.verbose(
      'RCON',
      1,
      `Socket closed ${hadError ? 'with' : 'without'} an error. ${hadError}`,
    );

    if (this.incomingData.length > 0) {
      Logger.verbose('RCON', 2, `Clearing Buffered Data`);
      this.incomingData = Buffer.from([]);
    }
    if (this.incomingResponse.length > 0) {
      Logger.verbose('RCON', 2, `Clearing Buffered Response Data`);
      this.incomingResponse = [];
    }
    if (this.responseCallbackQueue.length > 0) {
      Logger.verbose('RCON', 2, `Clearing Pending Callbacks`);
      while (this.responseCallbackQueue.length > 0) {
        const callback = this.responseCallbackQueue.shift();
        if (callback) {
          callback(new Error('RCON DISCONNECTED'));
        }
      }
      this.callbackIds = [];
    }

    if (this.autoReconnect) {
      Logger.verbose(
        'RCON',
        1,
        `Sleeping ${this.autoReconnectDelay}ms before reconnecting.`,
      );
      setTimeout(this.connect, this.autoReconnectDelay);
    }
  }

  onError(err: Error | unknown): void {
    Logger.verbose('RCON', 1, `Socket had error:`, err);
    this.emit('RCON_ERROR', err);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      Logger.verbose('RCON', 1, `Connecting to: ${this.host}:${this.port}`);

      const onConnect = async () => {
        this.client.removeListener('error', onError);
        this.connected = true;

        Logger.verbose('RCON', 1, `Connected to: ${this.host}:${this.port}`);

        try {
          await this.write(SERVERDATA_AUTH, this.password);
          this.autoReconnect = true;
          resolve();
        } catch (err) {
          reject(err);
        }
      };

      const onError = (err: Error | unknown) => {
        this.client.removeListener('connect', onConnect);
        Logger.verbose(
          'RCON',
          1,
          `Failed to connect to: ${this.host}:${this.port}`,
          err,
        );
        reject(err);
      };

      this.client.once('connect', onConnect);
      this.client.once('error', onError);

      this.client.connect(this.port, this.host);
    });
  }

  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      Logger.verbose(
        'RCON',
        1,
        `Disconnecting from: ${this.host}:${this.port}`,
      );

      const onClose = () => {
        this.client.removeListener('error', onError);
        Logger.verbose(
          'RCON',
          1,
          `Disconnected from: ${this.host}:${this.port}`,
        );
        resolve();
      };

      const onError = (err: Error | unknown) => {
        this.client.removeListener('close', onClose);
        Logger.verbose(
          'RCON',
          1,
          `Failed to disconnect from: ${this.host}:${this.port}`,
          err,
        );
        resolve();
      };

      this.client.once('close', onClose);
      this.client.once('error', onError);

      this.autoReconnect = false;
      if (this.autoReconnectTimeout) {
        clearTimeout(this.autoReconnectTimeout);
      }

      this.client.end();
    });
  }

  execute(command: string): Promise<string> {
    return this.write(SERVERDATA_EXECCOMMAND, command);
  }

  write(type: number, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected.'));
        return;
      }

      if (!this.client.writable) {
        reject(new Error('Unable to write to socket.'));
        return;
      }

      if (!this.loggedin && type !== SERVERDATA_AUTH) {
        reject(new Error('RCON not Logged in'));
        return;
      }

      Logger.verbose(
        'RCON',
        2,
        `Writing packet with type "${type}" and body "${body}".`,
      );

      const encodedPacket = this.encodePacket(
        type,
        type !== SERVERDATA_AUTH ? MID_PACKET_ID : END_PACKET_ID,
        body,
      );

      const encodedEmptyPacket = this.encodePacket(type, END_PACKET_ID, '');

      if (this.maximumPacketSize < encodedPacket.length) {
        reject(new Error('Packet too long.'));
        return;
      }

      const onError = (err: Error | unknown) => {
        Logger.verbose(
          'RCON',
          1,
          'Error occurred. Wiping response action queue.',
          err,
        );
        this.responseCallbackQueue = [];
        reject(err);
      };

      if (type === SERVERDATA_AUTH) {
        this.callbackIds.push({ id: this.count, cmd: body });

        this.responseCallbackQueue.push(() => {});
        this.responseCallbackQueue.push(
          (decodedPacket: string | DecodedPacket | Error) => {
            this.client.removeListener('error', onError);
            if (
              typeof decodedPacket === 'object' &&
              'id' in decodedPacket &&
              decodedPacket.id === -1
            ) {
              Logger.verbose('RCON', 1, 'Authentication failed.');
              reject(new Error('Authentication failed.'));
            } else {
              Logger.verbose('RCON', 1, 'Authentication succeeded.');
              this.loggedin = true;
              resolve('');
            }
          },
        );
      } else {
        this.callbackIds.push({ id: this.count, cmd: body });
        this.responseCallbackQueue.push(
          (response: string | DecodedPacket | Error) => {
            this.client.removeListener('error', onError);

            if (response instanceof Error) {
              reject(response);
            } else {
              const respStr =
                typeof response === 'string'
                  ? response
                  : (response as DecodedPacket).body || '';
              Logger.verbose(
                'RCON',
                2,
                `Returning complete response: ${respStr.replace(
                  /\r\n|\r|\n/g,
                  '\\n',
                )}`,
              );
              resolve(respStr);
            }
          },
        );
      }

      this.client.once('error', onError);

      if (this.count + 1 > 65535) {
        this.count = 1;
      }

      Logger.verbose(
        'RCON',
        4,
        `Sending packet: ${this.bufToHexString(encodedPacket)}`,
      );
      this.client.write(encodedPacket);

      if (type !== SERVERDATA_AUTH) {
        Logger.verbose(
          'RCON',
          4,
          `Sending empty packet: ${this.bufToHexString(encodedEmptyPacket)}`,
        );
        this.client.write(encodedEmptyPacket);
        this.count++;
      }
    });
  }

  encodePacket(
    type: number,
    id: number,
    body: string,
    encoding: BufferEncoding = 'utf8',
  ): Buffer {
    const size = Buffer.byteLength(body) + 14;
    const buf = Buffer.alloc(size);

    buf.writeUInt32LE(size - 4, 0);
    buf.writeUInt8(id, 4);
    buf.writeUInt8(0, 5);
    buf.writeUInt16LE(this.count, 6);
    buf.writeUInt32LE(type, 8);
    buf.write(body, 12, size - 2, encoding);
    buf.writeUInt16LE(0, size - 2);

    return buf;
  }

  bufToHexString(buf: Buffer): string {
    const hex = buf.toString('hex').match(/../g);
    return hex ? hex.join(' ') : '';
  }

  decodedPacketToString(decodedPacket: DecodedPacket): string {
    return util.inspect(decodedPacket, { breakLength: Infinity });
  }

  async warn(anyID: string, message: string): Promise<void> {
    await this.execute(`AdminWarn "${anyID}" ${message}`);
  }
}
