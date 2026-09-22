import Layer from './layers/layer.js';
import { AdminListSource } from './utils/admin-lists.js';

export interface Player {
  eosID?: string;
  steamID?: string;
  name?: string;
  playercontroller?: string;
  suffix?: string;
  teamID?: number;
  squadID?: number | null;
  isLeader?: boolean;
  role?: string;
  possessClassname?: string;
  squad?: Squad | null;
  [key: string]: unknown;
}

export interface Squad {
  squadID: number;
  squadName: string;
  size: number;
  locked: boolean;
  creatorName: string;
  creatorSteamID?: string;
  creatorEOSID?: string;
  teamID?: number;
  teamName?: string;
  [key: string]: unknown;
}

export interface ChatMessageEvent {
  raw: string;
  chat: 'ChatAll' | 'ChatTeam' | 'ChatSquad' | 'ChatAdmin' | string;
  name: string;
  message: string;
  time: Date;
  steamID?: string;
  eosID?: string;
  player?: Player | null;
}

export interface NewGameEvent {
  raw: string;
  time: Date;
  chainID: number;
  dlc: string;
  layerClassname: string;
  layer?: Layer | null;
  winner?: string;
}

export interface PlayerConnectedEvent {
  raw: string;
  time: Date;
  chainID: number;
  playerController: string;
  ip: string;
  eosID: string;
  steamID: string;
  player?: Player | null;
}

export interface PlayerDisconnectedEvent {
  raw: string;
  time: Date;
  chainID: number;
  name: string;
  eosID: string;
  steamID: string;
  player?: Player | null;
}

export interface PlayerDamagedEvent {
  raw: string;
  time: Date;
  chainID: number;
  damage: number;
  weapon: string;
  healthRemaining: number;
  victim?: Player | null;
  attacker?: Player | null;
  teamkill?: boolean;
}

export interface PlayerWoundedEvent {
  raw: string;
  time: Date;
  chainID: number;
  damage: number;
  weapon: string;
  damageDealer: string;
  victimWeapon?: string;
  victim?: Player | null;
  attacker?: Player | null;
  teamkill?: boolean;
}

export interface PlayerDiedEvent {
  raw: string;
  time: Date;
  chainID: number;
  damage: number;
  weapon: string;
  damageDealer: string;
  victimWeapon?: string;
  victim?: Player | null;
  attacker?: Player | null;
  teamkill?: boolean;
}

export interface PlayerRevivedEvent {
  raw: string;
  time: Date;
  chainID: number;
  victim?: Player | null;
  attacker?: Player | null;
  reviver?: Player | null;
}

export interface AdminBroadcastEvent {
  raw: string;
  time: Date;
  chainID: number;
  message: string;
  from: string;
}

export interface SquadCreatedEvent {
  time: Date;
  squadID: number;
  squadName: string;
  teamName: string;
  player?: Player | null;
}

export interface ServerConfig {
  id?: number | string;
  host: string;
  queryPort?: number;
  rconHost?: string;
  rconPort?: number;
  rconPassword?: string;
  rconAutoReconnectInterval?: number;
  layerHistoryMaxLength?: number;
  adminLists?: AdminListSource[];
  logReaderMode?: 'tail' | 'sftp' | 'ftp';
  logDir?: string;
  sftp?: Record<string, unknown>;
  ftp?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LoggerConfig {
  timestamps?: boolean;
  verboseness?: Record<string, number>;
  colors?: Record<string, string>;
}

export interface PluginConfigItem {
  plugin: string;
  enabled: boolean;
  [key: string]: unknown;
}

export interface SquadJSConfig {
  logger: LoggerConfig;
  server: ServerConfig;
  connectors: Record<string, unknown>;
  plugins: PluginConfigItem[];
}
