import Sequelize, {
  ModelCtor,
  Model,
  ModelAttributes,
  ModelOptions,
} from 'sequelize';
import BasePlugin, { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';
import {
  NewGameEvent,
  PlayerConnectedEvent,
  PlayerDiedEvent,
  PlayerRevivedEvent,
  PlayerWoundedEvent,
  ServerInfo,
} from '../types.js';

const { DataTypes, QueryTypes } = Sequelize;

export default class DBLog extends BasePlugin {
  public models: Record<string, ModelCtor<Model>> = {};
  public match: Model | null = null;

  static override get description(): string {
    return 'The <code>db-log</code> plugin will log various server statistics and events to a database.';
  }

  static override get defaultEnabled(): boolean {
    return false;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      database: {
        required: true,
        connector: 'sequelize',
        description: 'The Sequelize connector to log server information to.',
        default: 'mysql',
      },
      overrideServerID: {
        required: false,
        description: 'An overridden server ID.',
        default: null,
      },
    };
  }

  constructor(
    server: SquadServer,
    options: Record<string, unknown>,
    connectors: Record<string, unknown>,
  ) {
    super(server, options, connectors);

    this.createModel('Server', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING },
    });

    this.createModel('Match', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      dlc: { type: DataTypes.STRING },
      mapClassname: { type: DataTypes.STRING },
      layerClassname: { type: DataTypes.STRING },
      map: { type: DataTypes.STRING },
      layer: { type: DataTypes.STRING },
      startTime: { type: DataTypes.DATE, allowNull: false },
      endTime: { type: DataTypes.DATE },
      winner: { type: DataTypes.STRING },
    });

    this.createModel('TickRate', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      time: { type: DataTypes.DATE, allowNull: false },
      tickRate: { type: DataTypes.FLOAT, allowNull: false },
    });

    this.createModel('PlayerCount', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      time: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      players: { type: DataTypes.INTEGER, allowNull: false },
      publicQueue: { type: DataTypes.INTEGER, allowNull: false },
      reserveQueue: { type: DataTypes.INTEGER, allowNull: false },
    });

    this.createModel(
      'SteamUser',
      {
        steamID: { type: DataTypes.STRING, primaryKey: true },
        lastName: { type: DataTypes.STRING },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );

    this.createModel(
      'Player',
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        eosID: { type: DataTypes.STRING, unique: true },
        steamID: { type: DataTypes.STRING, allowNull: false, unique: true },
        lastName: { type: DataTypes.STRING },
        lastIP: { type: DataTypes.STRING },
      },
      {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        indexes: [{ fields: ['eosID'] }, { fields: ['steamID'] }],
      },
    );

    this.createModel(
      'Wound',
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        time: { type: DataTypes.DATE, allowNull: false },
        victimName: { type: DataTypes.STRING },
        victimTeamID: { type: DataTypes.INTEGER },
        victimSquadID: { type: DataTypes.INTEGER },
        attackerName: { type: DataTypes.STRING },
        attackerTeamID: { type: DataTypes.INTEGER },
        attackerSquadID: { type: DataTypes.INTEGER },
        damage: { type: DataTypes.FLOAT },
        weapon: { type: DataTypes.STRING },
        teamkill: { type: DataTypes.BOOLEAN },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );

    this.createModel(
      'Death',
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        time: { type: DataTypes.DATE, allowNull: false },
        woundTime: { type: DataTypes.DATE },
        victimName: { type: DataTypes.STRING },
        victimTeamID: { type: DataTypes.INTEGER },
        victimSquadID: { type: DataTypes.INTEGER },
        attackerName: { type: DataTypes.STRING },
        attackerTeamID: { type: DataTypes.INTEGER },
        attackerSquadID: { type: DataTypes.INTEGER },
        damage: { type: DataTypes.FLOAT },
        weapon: { type: DataTypes.STRING },
        teamkill: { type: DataTypes.BOOLEAN },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );

    this.createModel(
      'Revive',
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        time: { type: DataTypes.DATE, allowNull: false },
        woundTime: { type: DataTypes.DATE },
        victimName: { type: DataTypes.STRING },
        victimTeamID: { type: DataTypes.INTEGER },
        victimSquadID: { type: DataTypes.INTEGER },
        attackerName: { type: DataTypes.STRING },
        attackerTeamID: { type: DataTypes.INTEGER },
        attackerSquadID: { type: DataTypes.INTEGER },
        damage: { type: DataTypes.FLOAT },
        weapon: { type: DataTypes.STRING },
        teamkill: { type: DataTypes.BOOLEAN },
        reviverName: { type: DataTypes.STRING },
        reviverTeamID: { type: DataTypes.INTEGER },
        reviverSquadID: { type: DataTypes.INTEGER },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' },
    );

    this.models.Server.hasMany(this.models.TickRate, {
      foreignKey: { name: 'server', allowNull: false },
      onDelete: 'CASCADE',
    });
    this.models.Server.hasMany(this.models.PlayerCount, {
      foreignKey: { name: 'server', allowNull: false },
      onDelete: 'CASCADE',
    });
    this.models.Server.hasMany(this.models.Match, {
      foreignKey: { name: 'server', allowNull: false },
      onDelete: 'CASCADE',
    });
    this.models.Server.hasMany(this.models.Wound, {
      foreignKey: { name: 'server', allowNull: false },
      onDelete: 'CASCADE',
    });
    this.models.Server.hasMany(this.models.Death, {
      foreignKey: { name: 'server', allowNull: false },
      onDelete: 'CASCADE',
    });
    this.models.Server.hasMany(this.models.Revive, {
      foreignKey: { name: 'server', allowNull: false },
      onDelete: 'CASCADE',
    });

    this.models.Player.hasMany(this.models.Wound, {
      sourceKey: 'steamID',
      foreignKey: { name: 'attacker' },
      onDelete: 'CASCADE',
    });
    this.models.Player.hasMany(this.models.Wound, {
      sourceKey: 'steamID',
      foreignKey: { name: 'victim' },
      onDelete: 'CASCADE',
    });
    this.models.Player.hasMany(this.models.Death, {
      sourceKey: 'steamID',
      foreignKey: { name: 'attacker' },
      onDelete: 'CASCADE',
    });
    this.models.Player.hasMany(this.models.Death, {
      sourceKey: 'steamID',
      foreignKey: { name: 'victim' },
      onDelete: 'CASCADE',
    });
    this.models.Player.hasMany(this.models.Revive, {
      sourceKey: 'steamID',
      foreignKey: { name: 'attacker' },
      onDelete: 'CASCADE',
    });
    this.models.Player.hasMany(this.models.Revive, {
      sourceKey: 'steamID',
      foreignKey: { name: 'victim' },
      onDelete: 'CASCADE',
    });
    this.models.Player.hasMany(this.models.Revive, {
      sourceKey: 'steamID',
      foreignKey: { name: 'reviver' },
      onDelete: 'CASCADE',
    });

    this.models.Match.hasMany(this.models.TickRate, {
      foreignKey: { name: 'match' },
      onDelete: 'CASCADE',
    });
    this.models.Match.hasMany(this.models.PlayerCount, {
      foreignKey: { name: 'match' },
      onDelete: 'CASCADE',
    });
    this.models.Match.hasMany(this.models.Wound, {
      foreignKey: { name: 'match' },
      onDelete: 'CASCADE',
    });
    this.models.Match.hasMany(this.models.Death, {
      foreignKey: { name: 'match' },
      onDelete: 'CASCADE',
    });
    this.models.Match.hasMany(this.models.Revive, {
      foreignKey: { name: 'match' },
      onDelete: 'CASCADE',
    });

    this.onTickRate = this.onTickRate.bind(this);
    this.onUpdatedA2SInformation = this.onUpdatedA2SInformation.bind(this);
    this.onNewGame = this.onNewGame.bind(this);
    this.onPlayerConnected = this.onPlayerConnected.bind(this);
    this.onPlayerWounded = this.onPlayerWounded.bind(this);
    this.onPlayerDied = this.onPlayerDied.bind(this);
    this.onPlayerRevived = this.onPlayerRevived.bind(this);
  }

  createModel(
    name: string,
    schema: ModelAttributes,
    options: ModelOptions = {},
  ) {
    const db = this.options.database as Sequelize.Sequelize;
    this.models[name] = db.define(`DBLog_${name}`, schema, {
      timestamps: false,
      ...options,
    });
  }

  override async prepareToMount(): Promise<void> {
    for (const model of Object.values(this.models)) {
      await model.sync();
    }
  }

  override async mount(): Promise<void> {
    await this.migrateSteamUsersIntoPlayers();

    await this.models.Server.upsert({
      id: this.options.overrideServerID || this.server.id,
      name: this.server.serverName,
    });

    this.match = await this.models.Match.findOne({
      where: {
        server: this.options.overrideServerID || this.server.id,
        endTime: null,
      },
    });

    this.server.on('TICK_RATE', this.onTickRate);
    this.server.on('UPDATED_A2S_INFORMATION', this.onUpdatedA2SInformation);
    this.server.on('NEW_GAME', this.onNewGame);
    this.server.on('PLAYER_CONNECTED', this.onPlayerConnected);
    this.server.on('PLAYER_WOUNDED', this.onPlayerWounded);
    this.server.on('PLAYER_DIED', this.onPlayerDied);
    this.server.on('PLAYER_REVIVED', this.onPlayerRevived);
  }

  override async unmount(): Promise<void> {
    this.server.removeListener('TICK_RATE', this.onTickRate);
    this.server.removeListener(
      'UPDATED_A2S_INFORMATION',
      this.onUpdatedA2SInformation,
    );
    this.server.removeListener('NEW_GAME', this.onNewGame);
    this.server.removeListener('PLAYER_CONNECTED', this.onPlayerConnected);
    this.server.removeListener('PLAYER_WOUNDED', this.onPlayerWounded);
    this.server.removeListener('PLAYER_DIED', this.onPlayerDied);
    this.server.removeListener('PLAYER_REVIVED', this.onPlayerRevived);
  }

  async onTickRate(info: { time: Date; tickRate: number }): Promise<void> {
    const matchId = (this.match as unknown as { id?: number })?.id || null;
    await this.models.TickRate.create({
      server: this.options.overrideServerID || this.server.id,
      match: matchId,
      time: info.time,
      tickRate: info.tickRate,
    });
  }

  async onUpdatedA2SInformation(info: ServerInfo): Promise<void> {
    const matchId = (this.match as unknown as { id?: number })?.id || null;
    await this.models.PlayerCount.create({
      server: this.options.overrideServerID || this.server.id,
      match: matchId,
      players: info.a2sPlayerCount,
      publicQueue: info.publicQueue,
      reserveQueue: info.reserveQueue,
    });
  }

  async onNewGame(info: NewGameEvent): Promise<void> {
    await this.models.Match.update(
      { endTime: info.time, winner: info.winner },
      {
        where: {
          server: this.options.overrideServerID || this.server.id,
          endTime: null,
        },
      },
    );

    this.match = await this.models.Match.create({
      server: this.options.overrideServerID || this.server.id,
      dlc: info.dlc,
      mapClassname: info.mapClassname,
      layerClassname: info.layerClassname,
      map: info.layer ? info.layer.map.name : null,
      layer: info.layer ? info.layer.name : null,
      startTime: info.time,
    });
  }

  async onPlayerWounded(info: PlayerWoundedEvent): Promise<void> {
    if (info.attacker) {
      await this.models.Player.upsert(
        {
          eosID: info.attacker.eosID,
          steamID: info.attacker.steamID,
          lastName: info.attacker.name,
        },
        { conflictFields: ['steamID'] },
      );
    }
    if (info.victim) {
      await this.models.Player.upsert(
        {
          eosID: info.victim.eosID,
          steamID: info.victim.steamID,
          lastName: info.victim.name,
        },
        { conflictFields: ['steamID'] },
      );
    }

    await this.models.Wound.create({
      server: this.options.overrideServerID || this.server.id,
      match: this.match ? this.match.id : null,
      time: info.time,
      victim: info.victim ? info.victim.steamID : null,
      victimName: info.victim ? info.victim.name : null,
      victimTeamID: info.victim ? info.victim.teamID : null,
      victimSquadID: info.victim ? info.victim.squadID : null,
      attacker: info.attacker ? info.attacker.steamID : null,
      attackerName: info.attacker ? info.attacker.name : null,
      attackerTeamID: info.attacker ? info.attacker.teamID : null,
      attackerSquadID: info.attacker ? info.attacker.squadID : null,
      damage: info.damage,
      weapon: info.weapon,
      teamkill: info.teamkill,
    });
  }

  async onPlayerDied(info: PlayerDiedEvent): Promise<void> {
    if (info.attacker) {
      await this.models.Player.upsert(
        {
          eosID: info.attacker.eosID,
          steamID: info.attacker.steamID,
          lastName: info.attacker.name,
        },
        { conflictFields: ['steamID'] },
      );
    }
    if (info.victim) {
      await this.models.Player.upsert(
        {
          eosID: info.victim.eosID,
          steamID: info.victim.steamID,
          lastName: info.victim.name,
        },
        { conflictFields: ['steamID'] },
      );
    }

    await this.models.Death.create({
      server: this.options.overrideServerID || this.server.id,
      match: this.match ? this.match.id : null,
      time: info.time,
      woundTime: info.woundTime,
      victim: info.victim ? info.victim.steamID : null,
      victimName: info.victim ? info.victim.name : null,
      victimTeamID: info.victim ? info.victim.teamID : null,
      victimSquadID: info.victim ? info.victim.squadID : null,
      attacker: info.attacker ? info.attacker.steamID : null,
      attackerName: info.attacker ? info.attacker.name : null,
      attackerTeamID: info.attacker ? info.attacker.teamID : null,
      attackerSquadID: info.attacker ? info.attacker.squadID : null,
      damage: info.damage,
      weapon: info.weapon,
      teamkill: info.teamkill,
    });
  }

  async onPlayerRevived(info: PlayerRevivedEvent): Promise<void> {
    if (info.attacker) {
      await this.models.Player.upsert(
        {
          eosID: info.attacker.eosID,
          steamID: info.attacker.steamID,
          lastName: info.attacker.name,
        },
        { conflictFields: ['steamID'] },
      );
    }
    if (info.victim) {
      await this.models.Player.upsert(
        {
          eosID: info.victim.eosID,
          steamID: info.victim.steamID,
          lastName: info.victim.name,
        },
        { conflictFields: ['steamID'] },
      );
    }
    if (info.reviver) {
      await this.models.Player.upsert(
        {
          eosID: info.reviver.eosID,
          steamID: info.reviver.steamID,
          lastName: info.reviver.name,
        },
        { conflictFields: ['steamID'] },
      );
    }

    await this.models.Revive.create({
      server: this.options.overrideServerID || this.server.id,
      match: this.match ? this.match.id : null,
      time: info.time,
      woundTime: info.woundTime,
      victim: info.victim ? info.victim.steamID : null,
      victimName: info.victim ? info.victim.name : null,
      victimTeamID: info.victim ? info.victim.teamID : null,
      victimSquadID: info.victim ? info.victim.squadID : null,
      attacker: info.attacker ? info.attacker.steamID : null,
      attackerName: info.attacker ? info.attacker.name : null,
      attackerTeamID: info.attacker ? info.attacker.teamID : null,
      attackerSquadID: info.attacker ? info.attacker.squadID : null,
      damage: info.damage,
      weapon: info.weapon,
      teamkill: info.teamkill,
      reviver: info.reviver ? info.reviver.steamID : null,
      reviverName: info.reviver ? info.reviver.name : null,
      reviverTeamID: info.reviver ? info.reviver.teamID : null,
      reviverSquadID: info.reviver ? info.reviver.squadID : null,
    });
  }

  async onPlayerConnected(info: PlayerConnectedEvent): Promise<void> {
    await this.models.Player.upsert(
      {
        eosID: info.player.eosID,
        steamID: info.player.steamID,
        lastName: info.player.name,
        lastIP: info.ip,
      },
      { conflictFields: ['steamID'] },
    );
  }

  async migrateSteamUsersIntoPlayers(): Promise<void> {
    try {
      const steamUsersCount = await this.models.SteamUser.count();
      const playersCount = await this.models.Player.count();

      if (steamUsersCount < playersCount) {
        this.verbose(
          1,
          `Skipping migration from SteamUsers to Players due to a previous successful migration.`,
        );
        return;
      }

      await this.dropAllForeignKeys();

      const steamUsers = (await this.models.SteamUser.findAll()).map(
        (u: Model) =>
          (u as unknown as { dataValues: Record<string, unknown> }).dataValues,
      );
      await this.models.Player.bulkCreate(steamUsers);

      this.verbose(1, `Migration from SteamUsers to Players successful`);
    } catch (error) {
      this.verbose(
        1,
        `Error during Migration from SteamUsers to Players: ${error}`,
      );
    }
  }

  async dropAllForeignKeys(): Promise<void> {
    const db = this.options.database as Sequelize.Sequelize;
    const dbName = (db.config as { database?: string }).database || '';
    this.verbose(
      1,
      `Starting to drop constraints on DB: ${dbName} related to DBLog_SteamUsers deprecated table.`,
    );
    for (const modelName in this.models) {
      const model = this.models[modelName];
      const tableName = model.tableName;

      try {
        const result: Record<string, string>[] = await db.query(
          `SELECT * FROM information_schema.key_column_usage WHERE referenced_table_name IS NOT NULL AND table_schema = '${dbName}' AND table_name = '${tableName}';`,
          { type: QueryTypes.SELECT },
        );

        for (const r of result) {
          if (r.REFERENCED_TABLE_NAME === 'DBLog_SteamUsers') {
            this.verbose(
              1,
              `Found constraint ${r.COLUMN_NAME} on table ${tableName}, referencing ${r.REFERENCED_COLUMN_NAME} on ${r.REFERENCED_TABLE_NAME}`,
            );

            try {
              await db.query(
                `ALTER TABLE ${tableName} DROP FOREIGN KEY ${r.CONSTRAINT_NAME}`,
                { type: QueryTypes.RAW },
              );
              this.verbose(
                1,
                `Dropped foreign key ${r.COLUMN_NAME} on table ${tableName}`,
              );
            } catch (e) {
              this.verbose(
                1,
                `Error dropping foreign key ${r.COLUMN_NAME} on table ${tableName}:`,
                e,
              );
            }
          }
        }
      } catch (error) {
        this.verbose(
          1,
          `Error dropping foreign keys for table ${tableName}:`,
          error,
        );
      } finally {
        model.sync();
      }
    }
    await this.models.Player.sync();
  }
}
