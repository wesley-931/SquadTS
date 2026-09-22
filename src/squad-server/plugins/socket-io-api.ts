import { createServer, Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import BasePlugin, { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';

const eventsToBroadcast = [
  'CHAT_MESSAGE',
  'POSSESSED_ADMIN_CAMERA',
  'UNPOSSESSED_ADMIN_CAMERA',
  'RCON_ERROR',
  'ADMIN_BROADCAST',
  'DEPLOYABLE_DAMAGED',
  'NEW_GAME',
  'PLAYER_CONNECTED',
  'PLAYER_DISCONNECTED',
  'PLAYER_DAMAGED',
  'PLAYER_WOUNDED',
  'PLAYER_DIED',
  'PLAYER_REVIVED',
  'TEAMKILL',
  'PLAYER_POSSESS',
  'PLAYER_UNPOSSESS',
  'TICK_RATE',
  'PLAYER_TEAM_CHANGE',
  'PLAYER_SQUAD_CHANGE',
  'UPDATED_PLAYER_INFORMATION',
  'UPDATED_LAYER_INFORMATION',
  'UPDATED_A2S_INFORMATION',
  'PLAYER_AUTO_KICKED',
  'PLAYER_WARNED',
  'PLAYER_KICKED',
  'PLAYER_BANNED',
  'SQUAD_CREATED',
];

export default class SocketIOAPI extends BasePlugin {
  private httpServer: HTTPServer;
  private io: SocketIOServer;

  static override get description(): string {
    return 'The <code>SocketIOAPI</code> plugin allows remote access to a SquadJS instance via Socket.IO';
  }

  static override get defaultEnabled(): boolean {
    return false;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      websocketPort: {
        required: true,
        description: 'The port for the websocket.',
        default: '',
        example: '3000',
      },
      securityToken: {
        required: true,
        description: 'Your secret token/password for connecting.',
        default: '',
        example: 'MySecretPassword',
      },
    };
  }

  constructor(
    server: SquadServer,
    options: Record<string, unknown>,
    connectors: Record<string, unknown>,
  ) {
    super(server, options, connectors);

    this.httpServer = createServer();

    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    this.io.use((socket, next) => {
      if (
        socket.handshake.auth &&
        socket.handshake.auth.token === this.options.securityToken
      ) {
        next();
      } else {
        next(new Error('Invalid token.'));
      }
    });

    this.io.on('connection', (socket) => {
      this.verbose(1, 'New Connection Made.');
      this.bindListeners(socket, this.server);
      this.bindListeners(socket, this.server.rcon, 'rcon.');

      for (const eventToBroadcast of eventsToBroadcast) {
        this.server.on(eventToBroadcast, (...args: unknown[]) => {
          socket.emit(eventToBroadcast, ...args);
        });
      }
    });
  }

  override async mount(): Promise<void> {
    const port = parseInt(this.options.websocketPort as string, 10);
    this.httpServer.listen(port);
  }

  override async unmount(): Promise<void> {
    this.httpServer.close();
  }

  bindListeners(socket: Socket, obj: Record<string, unknown>, prefix = '') {
    const ignore = [
      'options',
      'constructor',
      'watch',
      'unwatch',
      'setupRCON',
      'setupLogParser',
      'getPlayerByCondition',
      'pingSquadJSAPI',
      '_events',
      '_eventsCount',
      '_maxListeners',
      'plugins',
      'rcon',
      'logParser',
      'updatePlayerListInterval',
      'updatePlayerListTimeout',
      'updateLayerInformationInterval',
      'updateLayerInformationTimeout',
      'updateA2SInformationInterval',
      'updateA2SInformationTimeout',
      'pingSquadJSAPIInterval',
      'pingSquadJSAPI',
      'pingSquadJSAPITimeout',
      'rcon.constructor',
      'rcon.processChatPacket',
      'rcon._events',
      'rcon._eventsCount',
      'rcon._maxListeners',
      'rcon.password',
      'rcon.connect',
      'rcon.onData',
      'rcon.onClose',
      'rcon.onError',
      'rcon.client',
      'rcon.autoReconnect',
      'rcon.autoReconnectTimeout',
      'rcon.incomingData',
      'rcon.incomingResponse',
      'rcon.responseCallbackQueue',
    ];

    const proto = Object.getPrototypeOf(obj);
    if (proto) {
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (ignore.includes(`${prefix}${key}`)) continue;
        this.verbose(1, `Setting method listener for ${prefix}${key}...`);
        socket.on(`${prefix}${key}`, async (...rawArgs: unknown[]) => {
          const args = rawArgs.slice(0, rawArgs.length - 1);
          const callback = rawArgs[rawArgs.length - 1];
          this.verbose(1, `Call to ${prefix}${key}(${args.join(', ')})`);
          if (typeof obj[key] === 'function') {
            const response = await (
              obj[key] as (...a: unknown[]) => Promise<unknown>
            )(...args);
            if (typeof callback === 'function') callback(response);
          }
        });
      }
    }

    for (const key of Object.getOwnPropertyNames(obj)) {
      if (ignore.includes(`${prefix}${key}`)) continue;
      this.verbose(1, `Setting properties listener for ${prefix}${key}...`);
      socket.on(`${prefix}${key}`, (...rawArgs: unknown[]) => {
        const callback = rawArgs[0];
        this.verbose(1, `Call to ${prefix}${key}...`);
        const response = obj[key];
        if (typeof callback === 'function')
          (callback as (res: unknown) => void)(response);
      });
    }
  }
}
