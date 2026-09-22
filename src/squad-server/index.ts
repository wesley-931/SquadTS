import EventEmitter from 'events';
import axios from 'axios';

import Logger from '../core/logger.js';
import { SQUADJS_API_DOMAIN } from '../core/constants.js';
import { playerIdNames } from '../core/id-parser.js';

import { Layers } from './layers/index.js';
import Layer from './layers/layer.js';
import LogParser from './log-parser/index.js';
import Rcon from './rcon.js';
import { SQUADJS_VERSION } from './utils/constants.js';
import fetchAdminLists, {
  AdminsMap,
  AdminListSource,
} from './utils/admin-lists.js';
import {
  isPlayerID,
  anyIDToPlayer,
  anyIDsToPlayers,
  Player,
} from './utils/any-id.js';
import BasePlugin from './plugins/base-plugin.js';
import { Squad } from './types.js';

export * from './types.js';

export interface SquadServerOptions {
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

export interface LayerHistoryItem {
  layer: Layer | null;
  time: number | Date;
}

export interface ServerInfo {
  raw: Record<string, unknown>;
  serverName: string;
  maxPlayers: number;
  publicQueueLimit: number;
  reserveSlots: number;
  playerCount: number;
  a2sPlayerCount: number;
  publicQueue: number;
  reserveQueue: number;
  currentLayer: string;
  nextLayer: string;
  teamOne: string;
  teamTwo: string;
  matchTimeout: number;
  matchStartTime: Date;
  gameVersion: string;
}

export default class SquadServer extends EventEmitter {
  public id?: number | string;
  public options: SquadServerOptions;

  public layerHistory: LayerHistoryItem[] = [];
  public layerHistoryMaxLength: number;

  public players: Player[] = [];
  public squads: Squad[] = [];

  public admins: AdminsMap = {};
  public adminsInAdminCam: Record<string, Date> = {};

  public plugins: BasePlugin[] = [];

  public rcon!: Rcon;
  public logParser!: LogParser;

  public serverName = '';
  public maxPlayers = 0;
  public publicSlots = 0;
  public reserveSlots = 0;

  public a2sPlayerCount = 0;
  public playerCount = 0;
  public publicQueue = 0;
  public reserveQueue = 0;

  public matchTimeout = 0;
  public matchStartTime: Date = new Date();
  public gameVersion = '';

  public currentLayer: Layer | null = null;
  public nextLayer: Layer | null = null;
  public nextLayerToBeVoted = false;

  private updatePlayerListInterval = 30 * 1000;
  private updatePlayerListTimeout: NodeJS.Timeout | null = null;

  private updateSquadListInterval = 30 * 1000;
  private updateSquadListTimeout: NodeJS.Timeout | null = null;

  private updateLayerInformationInterval = 30 * 1000;
  private updateLayerInformationTimeout: NodeJS.Timeout | null = null;

  private updateA2SInformationInterval = 30 * 1000;
  private updateA2SInformationTimeout: NodeJS.Timeout | null = null;

  private pingSquadJSAPIInterval = 5 * 60 * 1000;
  private pingSquadJSAPITimeout: NodeJS.Timeout | null = null;

  constructor(options: SquadServerOptions) {
    super();

    if (!options.host) {
      throw new Error('host must be specified.');
    }

    this.id = options.id;
    this.options = options;
    this.layerHistoryMaxLength = options.layerHistoryMaxLength || 20;

    this.setupRCON();
    this.setupLogParser();

    this.updatePlayerList = this.updatePlayerList.bind(this);
    this.updateSquadList = this.updateSquadList.bind(this);
    this.updateLayerInformation = this.updateLayerInformation.bind(this);
    this.updateA2SInformation = this.updateA2SInformation.bind(this);
    this.pingSquadJSAPI = this.pingSquadJSAPI.bind(this);
  }

  async watch(): Promise<void> {
    Logger.verbose(
      'SquadServer',
      1,
      `Beginning to watch ${this.options.host}:${this.options.queryPort}...`,
    );

    await Layers.pull();

    this.admins = await fetchAdminLists(this.options.adminLists);

    await this.rcon.connect();
    await this.updateSquadList();
    await this.updatePlayerList();
    await this.updateLayerInformation();
    await this.updateA2SInformation();

    await this.logParser.watch();

    Logger.verbose('SquadServer', 1, `Watching ${this.serverName}...`);

    await this.pingSquadJSAPI();
  }

  async unwatch(): Promise<void> {
    await this.rcon.disconnect();
    await this.logParser.unwatch();
  }

  setupRCON(): void {
    this.rcon = new Rcon({
      host: this.options.rconHost || this.options.host,
      port: this.options.rconPort || 21114,
      password: this.options.rconPassword || '',
      autoReconnectInterval: this.options.rconAutoReconnectInterval,
    });

    this.rcon.on('CHAT_MESSAGE', async (data: Record<string, unknown>) => {
      data.player = await this.getPlayerByEOSID(data.eosID as string);
      this.emit('CHAT_MESSAGE', data);

      const msg = data.message as string;
      const command = msg ? msg.match(/!([^ ]+) ?(.*)/) : null;
      if (command) {
        this.emit(`CHAT_COMMAND:${command[1].toLowerCase()}`, {
          ...data,
          message: command[2].trim(),
        });
      }
    });

    this.rcon.on(
      'POSSESSED_ADMIN_CAMERA',
      async (data: Record<string, unknown>) => {
        data.player = await this.getPlayerByEOSID(data.eosID as string);
        this.adminsInAdminCam[data.eosID as string] = data.time as Date;
        this.emit('POSSESSED_ADMIN_CAMERA', data);
      },
    );

    this.rcon.on(
      'UNPOSSESSED_ADMIN_CAMERA',
      async (data: Record<string, unknown>) => {
        data.player = await this.getPlayerByEOSID(data.eosID as string);
        const eosID = data.eosID as string;
        if (this.adminsInAdminCam[eosID]) {
          data.duration =
            (data.time as Date).getTime() -
            this.adminsInAdminCam[eosID].getTime();
        } else {
          data.duration = 0;
        }

        delete this.adminsInAdminCam[eosID];
        this.emit('UNPOSSESSED_ADMIN_CAMERA', data);
      },
    );

    this.rcon.on('RCON_ERROR', (data: unknown) => {
      this.emit('RCON_ERROR', data);
    });

    this.rcon.on('PLAYER_WARNED', async (data: Record<string, unknown>) => {
      data.player = await this.getPlayerByName(data.name as string);
      this.emit('PLAYER_WARNED', data);
    });

    this.rcon.on('PLAYER_KICKED', async (data: Record<string, unknown>) => {
      data.player = await this.getPlayerByEOSID(data.eosID as string);
      this.emit('PLAYER_KICKED', data);
    });

    this.rcon.on('PLAYER_BANNED', async (data: Record<string, unknown>) => {
      data.player = await this.getPlayerByEOSID(data.eosID as string);
      this.emit('PLAYER_BANNED', data);
    });

    this.rcon.on('SQUAD_CREATED', async (data: Record<string, unknown>) => {
      data.player = await this.getPlayerByEOSID(
        data.playerEOSID as string,
        true,
      );
      if (data.player) {
        data.player.squadID = data.squadID as number;
      }

      delete data.playerName;
      for (const k in data) {
        if (k.startsWith('player') && k.endsWith('ID')) delete data[k];
      }

      this.emit('SQUAD_CREATED', data);
    });
  }

  async restartRCON(): Promise<void> {
    try {
      await this.rcon.disconnect();
    } catch (err) {
      Logger.verbose(
        'SquadServer',
        1,
        'Failed to stop RCON instance when restarting.',
        err,
      );
    }

    Logger.verbose('SquadServer', 1, 'Setting up new RCON instance...');
    this.setupRCON();
    await this.rcon.connect();
  }

  setupLogParser(): void {
    this.logParser = new LogParser({
      mode: this.options.logReaderMode,
      logDir: this.options.logDir,
      sftp: this.options.sftp,
      ftp: this.options.ftp,
    });

    this.logParser.on('ADMIN_BROADCAST', (data: Record<string, unknown>) => {
      this.emit('ADMIN_BROADCAST', data);
    });

    this.logParser.on(
      'DEPLOYABLE_DAMAGED',
      async (data: Record<string, unknown>) => {
        data.player = await this.getPlayerByNameSuffix(
          data.playerSuffix as string,
        );
        delete data.playerSuffix;
        this.emit('DEPLOYABLE_DAMAGED', data);
      },
    );

    this.logParser.on('NEW_GAME', async (data: Record<string, unknown>) => {
      data.layer = await Layers.getLayerByClassname(
        data.layerClassname as string,
      );

      this.layerHistory.unshift({
        layer: data.layer as Layer,
        time: data.time as Date,
      });
      this.layerHistory = this.layerHistory.slice(
        0,
        this.layerHistoryMaxLength,
      );

      this.currentLayer = data.layer as Layer;
      await this.updateAdmins();
      this.emit('NEW_GAME', data);
    });

    this.logParser.on(
      'JOIN_SUCCEEDED',
      async (data: Record<string, unknown>) => {
        Logger.verbose(
          'SquadServer',
          1,
          `Player connected ${data.playerSuffix} - SteamID: ${data.steamID} - EOSID: ${data.eosID} - IP: ${data.ip}`,
        );

        data.player = await this.getPlayerByEOSID(data.eosID as string);
        if (data.player) data.player.suffix = data.playerSuffix as string;

        for (const k in data) {
          if ((playerIdNames as readonly string[]).includes(k)) delete data[k];
        }
        delete data.playerSuffix;

        this.emit('PLAYER_CONNECTED', data);
      },
    );

    this.logParser.on(
      'PLAYER_DISCONNECTED',
      async (data: Record<string, unknown>) => {
        data.player = await this.getPlayerByEOSID(data.eosID as string);

        for (const k in data) {
          if ((playerIdNames as readonly string[]).includes(k)) delete data[k];
        }

        this.emit('PLAYER_DISCONNECTED', data);
      },
    );

    this.logParser.on(
      'PLAYER_DAMAGED',
      async (data: Record<string, unknown>) => {
        data.victim = await this.getPlayerByName(data.victimName as string);
        data.attacker = await this.getPlayerByEOSID(
          data.attackerEOSID as string,
        );

        if (
          data.attacker &&
          !data.attacker.playercontroller &&
          data.attackerController
        ) {
          data.attacker.playercontroller = data.attackerController as string;
        }

        if (data.victim && data.attacker) {
          data.teamkill =
            data.victim.teamID === data.attacker.teamID &&
            data.victim.eosID !== data.attacker.eosID;
        }

        delete data.victimName;
        delete data.attackerName;

        this.emit('PLAYER_DAMAGED', data);
      },
    );

    this.logParser.on(
      'PLAYER_WOUNDED',
      async (data: Record<string, unknown>) => {
        data.victim = await this.getPlayerByName(data.victimName as string);
        data.attacker = await this.getPlayerByEOSID(
          data.attackerEOSID as string,
        );
        if (!data.attacker) {
          data.attacker = await this.getPlayerByController(
            data.attackerPlayerController as string,
          );
        }

        if (data.victim && data.attacker) {
          data.teamkill =
            data.victim.teamID === data.attacker.teamID &&
            data.victim.eosID !== data.attacker.eosID;
        }

        delete data.victimName;
        delete data.attackerName;

        this.emit('PLAYER_WOUNDED', data);
        if (data.teamkill) this.emit('TEAMKILL', data);
      },
    );

    this.logParser.on('PLAYER_DIED', async (data: Record<string, unknown>) => {
      data.victim = await this.getPlayerByName(data.victimName as string);
      data.attacker = await this.getPlayerByEOSID(data.attackerEOSID as string);
      if (!data.attacker) {
        data.attacker = await this.getPlayerByController(
          data.attackerPlayerController as string,
        );
      }

      if (data.victim && data.attacker) {
        data.teamkill =
          data.victim.teamID === data.attacker.teamID &&
          data.victim.eosID !== data.attacker.eosID;
      }

      delete data.victimName;
      delete data.attackerName;

      this.emit('PLAYER_DIED', data);
    });

    this.logParser.on(
      'PLAYER_REVIVED',
      async (data: Record<string, unknown>) => {
        data.victim = await this.getPlayerByEOSID(data.victimEOSID as string);
        data.attacker = await this.getPlayerByEOSID(
          data.attackerEOSID as string,
        );
        data.reviver = await this.getPlayerByEOSID(data.reviverEOSID as string);

        delete data.victimName;
        delete data.attackerName;
        delete data.reviverName;

        this.emit('PLAYER_REVIVED', data);
      },
    );

    this.logParser.on(
      'PLAYER_POSSESS',
      async (data: Record<string, unknown>) => {
        data.player = await this.getPlayerByEOSID(data.playerEOSID as string);
        if (data.player)
          data.player.possessClassname = data.possessClassname as string;
        delete data.playerSuffix;

        this.emit('PLAYER_POSSESS', data);
      },
    );

    this.logParser.on(
      'PLAYER_UNPOSSESS',
      async (data: Record<string, unknown>) => {
        data.player = await this.getPlayerByEOSID(data.playerEOSID as string);
        delete data.playerSuffix;

        this.emit('PLAYER_UNPOSSESS', data);
      },
    );

    this.logParser.on('ROUND_ENDED', async (data: Record<string, unknown>) => {
      this.emit('ROUND_ENDED', data);
    });

    this.logParser.on('TICK_RATE', (data: Record<string, unknown>) => {
      this.emit('TICK_RATE', data);
    });
  }

  async restartLogParser(): Promise<void> {
    try {
      await this.logParser.unwatch();
    } catch (err) {
      Logger.verbose(
        'SquadServer',
        1,
        'Failed to stop LogParser instance when restarting.',
        err,
      );
    }

    Logger.verbose('SquadServer', 1, 'Setting up new LogParser instance...');
    this.setupLogParser();
    await this.logParser.watch();
  }

  getAdminPermsBySteamID(steamID: string): Record<string, boolean> | undefined {
    return this.getAdminPermsByAnyID(steamID);
  }

  getAdminPermsByAnyID(anyID: string): Record<string, boolean> | undefined {
    const player = anyIDToPlayer(anyID, this.players);
    if (player === undefined) return undefined;
    for (const idName of playerIdNames) {
      const idVal = player[idName] as string | undefined;
      if (idVal && idVal in this.admins) {
        return this.admins[idVal];
      }
    }
    return undefined;
  }

  getAdminsWithPermission(
    perm: string,
    type: 'steamID' | 'eosID' | 'anyID' | 'player' = 'steamID',
  ): string[] | Player[] {
    const steamRgx = /^\d{17}$/;
    const ret: string[] = [];
    for (const [anyID, perms] of Object.entries(this.admins)) {
      if (perm in perms) ret.push(anyID);
    }
    let filter = (ID: string) => ID.match(steamRgx) !== null;
    switch (type) {
      case 'anyID':
        return [
          ...new Set(
            ret.map((ID) => {
              for (const adm of this.players) {
                if (isPlayerID(ID, adm)) return adm.eosID || ID;
              }
              return ID;
            }),
          ),
        ];
      case 'player':
        return anyIDsToPlayers(ret, this.players);
      case 'eosID':
        filter = (ID: string) => ID.match(steamRgx) === null;
        break;
      case 'steamID':
        break;
      default:
        throw new Error(
          `Expected type == 'steamID'|'eosID'|'anyID'|'player', got '${type}'.`,
        );
    }

    const matches: string[] = [];
    const fails: string[] = [];
    ret.forEach((ID) => (filter(ID) ? matches : fails).push(ID));
    if (fails.length) {
      const remappedIDs = anyIDsToPlayers(fails, this.players)
        .map((player) => player[type])
        .filter(Boolean) as string[];
      return [...new Set(matches.concat(remappedIDs))];
    }
    return matches;
  }

  async updateAdmins(): Promise<void> {
    this.admins = await fetchAdminLists(this.options.adminLists);
  }

  async updatePlayerList(): Promise<void> {
    if (this.updatePlayerListTimeout)
      clearTimeout(this.updatePlayerListTimeout);

    Logger.verbose('SquadServer', 1, `Updating player list...`);

    try {
      const oldPlayerInfo: Record<string, Player> = {};
      for (const player of this.players) {
        if (player.eosID) oldPlayerInfo[player.eosID] = player;
      }

      const players: Player[] = [];
      const rconPlayers = await this.rcon.getListPlayers(this);
      for (const player of rconPlayers) {
        const eosID = player.eosID;
        const controller = this.logParser.eventStore.players[eosID]
          ? this.logParser.eventStore.players[eosID].controller
          : null;
        const squad = await this.getSquadByID(player.teamID, player.squadID);

        players.push({
          ...(eosID ? oldPlayerInfo[eosID] : {}),
          ...player,
          playercontroller: controller,
          squad: squad,
        });
      }

      this.players = players;

      for (const player of this.players) {
        if (!player.eosID) continue;
        const oldInfo = oldPlayerInfo[player.eosID];
        if (oldInfo === undefined) continue;

        if (player.teamID !== oldInfo.teamID) {
          this.emit('PLAYER_TEAM_CHANGE', {
            player: player,
            oldTeamID: oldInfo.teamID,
            newTeamID: player.teamID,
          });
        }
        if (player.squadID !== oldInfo.squadID) {
          this.emit('PLAYER_SQUAD_CHANGE', {
            player: player,
            oldSquadID: oldInfo.squadID,
            newSquadID: player.squadID,
          });
        }
      }

      if (this.a2sPlayerCount > 0 && players.length === 0) {
        Logger.verbose(
          'SquadServer',
          1,
          `Real Player Count: ${this.a2sPlayerCount} but loaded ${players.length}`,
        );
      }

      this.emit('UPDATED_PLAYER_INFORMATION');
    } catch (err) {
      Logger.verbose('SquadServer', 1, 'Failed to update player list.', err);
    }

    Logger.verbose('SquadServer', 1, `Updated player list.`);

    this.updatePlayerListTimeout = setTimeout(
      this.updatePlayerList,
      this.updatePlayerListInterval,
    );
  }

  async updateSquadList(): Promise<void> {
    if (this.updateSquadListTimeout) clearTimeout(this.updateSquadListTimeout);

    Logger.verbose('SquadServer', 1, `Updating squad list...`);

    try {
      this.squads = await this.rcon.getSquads();
    } catch (err) {
      Logger.verbose('SquadServer', 1, 'Failed to update squad list.', err);
    }

    Logger.verbose('SquadServer', 1, `Updated squad list.`);

    this.updateSquadListTimeout = setTimeout(
      this.updateSquadList,
      this.updateSquadListInterval,
    );
  }

  async updateLayerInformation(): Promise<void> {
    if (this.updateLayerInformationTimeout)
      clearTimeout(this.updateLayerInformationTimeout);

    Logger.verbose('SquadServer', 1, `Updating layer information...`);

    try {
      const currentMap = await this.rcon.getCurrentMap();
      const nextMap = await this.rcon.getNextMap();
      const nextMapToBeVoted = nextMap.layer === 'To be voted';

      const currentLayer = await Layers.getLayerById(currentMap.layer);
      const nextLayer =
        nextMapToBeVoted || !nextMap.layer
          ? null
          : await Layers.getLayerById(nextMap.layer);

      if (this.layerHistory.length === 0) {
        this.layerHistory.unshift({ layer: currentLayer, time: Date.now() });
        this.layerHistory = this.layerHistory.slice(
          0,
          this.layerHistoryMaxLength,
        );
      }

      this.currentLayer = currentLayer;
      this.nextLayer = nextLayer;
      this.nextLayerToBeVoted = nextMapToBeVoted;

      this.emit('UPDATED_LAYER_INFORMATION');
    } catch (err) {
      Logger.verbose(
        'SquadServer',
        1,
        'Failed to update layer information.',
        err,
      );
    }

    Logger.verbose('SquadServer', 1, `Updated layer information.`);

    this.updateLayerInformationTimeout = setTimeout(
      this.updateLayerInformation,
      this.updateLayerInformationInterval,
    );
  }

  updateA2SInformation(): Promise<void> {
    return this.updateServerInformation();
  }

  async updateServerInformation(): Promise<void> {
    if (this.updateA2SInformationTimeout)
      clearTimeout(this.updateA2SInformationTimeout);

    Logger.verbose('SquadServer', 1, `Updating server information...`);

    try {
      const rawData = await this.rcon.execute(`ShowServerInfo`);
      Logger.verbose('SquadServer', 3, `Server information raw data`, rawData);
      const data = JSON.parse(rawData);

      const info: ServerInfo = {
        raw: data,
        serverName: data.ServerName_s,
        maxPlayers: parseInt(data.MaxPlayers, 10),
        publicQueueLimit: parseInt(data.PublicQueueLimit_I, 10),
        reserveSlots: parseInt(data.PlayerReserveCount_I, 10),
        playerCount: parseInt(data.PlayerCount_I, 10),
        a2sPlayerCount: parseInt(data.PlayerCount_I, 10),
        publicQueue: parseInt(data.PublicQueue_I, 10),
        reserveQueue: parseInt(data.ReservedQueue_I, 10),
        currentLayer: data.MapName_s,
        nextLayer: data.NextLayer_s,
        teamOne:
          data.TeamOne_s?.replace(new RegExp(data.MapName_s, 'i'), '') || '',
        teamTwo:
          data.TeamTwo_s?.replace(new RegExp(data.MapName_s, 'i'), '') || '',
        matchTimeout: parseFloat(data.MatchTimeout_d),
        matchStartTime: this.getMatchStartTimeByPlaytime(data.PLAYTIME_I),
        gameVersion: data.GameVersion_s,
      };

      this.serverName = info.serverName;
      this.maxPlayers = info.maxPlayers;
      this.publicSlots = info.maxPlayers - info.reserveSlots;
      this.reserveSlots = info.reserveSlots;
      this.a2sPlayerCount = info.playerCount;
      this.playerCount = info.playerCount;
      this.publicQueue = info.publicQueue;
      this.reserveQueue = info.reserveQueue;
      this.matchTimeout = info.matchTimeout;
      this.matchStartTime = info.matchStartTime;
      this.gameVersion = info.gameVersion;

      if (!this.currentLayer)
        this.currentLayer = await Layers.getLayerByClassname(info.currentLayer);
      if (!this.nextLayer)
        this.nextLayer = await Layers.getLayerByClassname(info.nextLayer);

      this.emit('UPDATED_A2S_INFORMATION', info);
      this.emit('UPDATED_SERVER_INFORMATION', info);
    } catch (err) {
      Logger.verbose(
        'SquadServer',
        1,
        'Failed to update server information.',
        err,
      );
    }

    Logger.verbose('SquadServer', 1, `Updated server information.`);

    this.updateA2SInformationTimeout = setTimeout(
      this.updateA2SInformation,
      this.updateA2SInformationInterval,
    );
  }

  async getPlayerByCondition(
    condition: (player: Player) => boolean,
    forceUpdate = false,
    retry = true,
  ): Promise<Player | null> {
    let matches: Player[];

    if (!forceUpdate) {
      matches = this.players.filter(condition);
      if (matches.length === 1) return matches[0];
      if (!retry) return null;
    }

    await this.updatePlayerList();

    matches = this.players.filter(condition);
    if (matches.length === 1) return matches[0];

    return null;
  }

  async getSquadByCondition(
    condition: (squad: Squad) => boolean,
    forceUpdate = false,
    retry = true,
  ): Promise<Squad | null> {
    let matches: Squad[];

    if (!forceUpdate) {
      matches = this.squads.filter(condition);
      if (matches.length === 1) return matches[0];
      if (!retry) return null;
    }

    await this.updateSquadList();

    matches = this.squads.filter(condition);
    if (matches.length === 1) return matches[0];

    return null;
  }

  async getSquadByID(
    teamID: number,
    squadID: number | null,
  ): Promise<Squad | null> {
    if (squadID === null) return null;
    return this.getSquadByCondition(
      (squad) => squad.teamID === teamID && squad.squadID === squadID,
    );
  }

  async getPlayerBySteamID(
    steamID: string,
    forceUpdate?: boolean,
  ): Promise<Player | null> {
    return this.getPlayerByCondition(
      (player) => player.steamID === steamID,
      forceUpdate,
    );
  }

  async getPlayerByEOSID(
    eosID: string,
    forceUpdate?: boolean,
  ): Promise<Player | null> {
    return this.getPlayerByCondition(
      (player) => player.eosID === eosID,
      forceUpdate,
    );
  }

  async getPlayerByAnyID(
    anyID: string,
    forceUpdate?: boolean,
  ): Promise<Player | null> {
    return this.getPlayerByCondition(
      (player) =>
        Object.entries(player).filter(
          ([parm, val]) => parm.endsWith('ID') && val === anyID,
        ).length > 0,
      forceUpdate,
    );
  }

  async getPlayerByName(
    name: string,
    forceUpdate?: boolean,
  ): Promise<Player | null> {
    return this.getPlayerByCondition(
      (player) => player.name === name,
      forceUpdate,
    );
  }

  async getPlayerByNameSuffix(
    suffix: string,
    forceUpdate?: boolean,
  ): Promise<Player | null> {
    return this.getPlayerByCondition(
      (player) => player.suffix === suffix,
      forceUpdate,
      false,
    );
  }

  async getPlayerByController(
    controller: string,
    forceUpdate?: boolean,
  ): Promise<Player | null> {
    return this.getPlayerByCondition(
      (player) => player.playercontroller === controller,
      forceUpdate,
    );
  }

  async pingSquadJSAPI(): Promise<void> {
    if (this.pingSquadJSAPITimeout) clearTimeout(this.pingSquadJSAPITimeout);

    Logger.verbose('SquadServer', 1, 'Pinging SquadJS API...');

    const payload = {
      server: {
        host: this.options.host,
        queryPort: this.options.queryPort,
        name: this.serverName,
        playerCount: this.a2sPlayerCount + this.publicQueue + this.reserveQueue,
      },
      squadjs: {
        version: SQUADJS_VERSION,
        logReaderMode: this.options.logReaderMode,
        plugins: this.plugins.map((plugin) => ({
          ...plugin.rawOptions,
          plugin: plugin.constructor.name,
        })),
      },
    };

    try {
      const { data } = await axios.post(
        SQUADJS_API_DOMAIN + '/api/v1/ping',
        payload,
      );

      if (data.error) {
        Logger.verbose(
          'SquadServer',
          1,
          `Successfully pinged the SquadJS API. Got back error: ${data.error}`,
        );
      } else {
        Logger.verbose(
          'SquadServer',
          1,
          `Successfully pinged the SquadJS API. Got back message: ${data.message}`,
        );
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || String(err);
      Logger.verbose('SquadServer', 1, 'Failed to ping the SquadJS API: ', msg);
    }

    this.pingSquadJSAPITimeout = setTimeout(
      this.pingSquadJSAPI,
      this.pingSquadJSAPIInterval,
    );
  }

  getMatchStartTimeByPlaytime(playtime: number | string): Date {
    return new Date(Date.now() - +playtime * 1000);
  }
}
