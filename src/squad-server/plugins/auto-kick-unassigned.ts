import BasePlugin, { PluginOptionsSpecification } from './base-plugin.js';
import SquadServer from '../index.js';
import { Player } from '../types.js';

export interface TrackedPlayer {
  player: Player;
  warnings: number;
  startTime: number;
  warnTimerID?: NodeJS.Timeout;
  kickTimerID?: NodeJS.Timeout;
}

export default class AutoKickUnassigned extends BasePlugin {
  private adminPermission = 'canseeadminchat';
  private whitelistPermission = 'reserve';

  private kickTimeout: number;
  private warningInterval: number;
  private gracePeriod: number;

  private trackingListUpdateFrequency = 1 * 60 * 1000;
  private cleanUpFrequency = 20 * 60 * 1000;

  private betweenRounds = false;
  private trackedPlayers: Record<string, TrackedPlayer> = {};

  private updateTrackingListInterval?: NodeJS.Timeout;
  private clearDisconnectedPlayersInterval?: NodeJS.Timeout;

  static override get description(): string {
    return (
      'The <code>AutoKickUnassigned</code> plugin will automatically kick players that are not in a squad after a ' +
      'specified amount of time.'
    );
  }

  static override get defaultEnabled(): boolean {
    return true;
  }

  static override get optionsSpecification(): PluginOptionsSpecification {
    return {
      warningMessage: {
        required: false,
        description:
          'Message SquadJS will send to players warning them they will be kicked',
        default: 'Join a squad, you are unassigned and will be kicked',
      },
      kickMessage: {
        required: false,
        description: 'Message to send to players when they are kicked',
        default: 'Unassigned - automatically removed',
      },
      frequencyOfWarnings: {
        required: false,
        description:
          'How often in Seconds should we warn the player about being unassigned?',
        default: 30,
      },
      unassignedTimer: {
        required: false,
        description:
          'How long in Seconds to wait before a unassigned player is kicked',
        default: 360,
      },
      playerThreshold: {
        required: false,
        description:
          'Player count required for AutoKick to start kicking players, set to -1 to disable',
        default: 93,
      },
      roundStartDelay: {
        required: false,
        description:
          'Time delay in Seconds from start of the round before AutoKick starts kicking again',
        default: 900,
      },
      ignoreAdmins: {
        required: false,
        description: 'Whether admins should be ignored',
        default: false,
      },
      ignoreWhitelist: {
        required: false,
        description: 'Whether whitelist/reserve slot players should be ignored',
        default: false,
      },
    };
  }

  constructor(
    server: SquadServer,
    options: Record<string, unknown>,
    connectors: Record<string, unknown>,
  ) {
    super(server, options, connectors);

    this.kickTimeout = (options.unassignedTimer as number) * 1000;
    this.warningInterval = (options.frequencyOfWarnings as number) * 1000;
    this.gracePeriod = (options.roundStartDelay as number) * 1000;

    this.onNewGame = this.onNewGame.bind(this);
    this.onPlayerSquadChange = this.onPlayerSquadChange.bind(this);
    this.updateTrackingList = this.updateTrackingList.bind(this);
    this.clearDisconnectedPlayers = this.clearDisconnectedPlayers.bind(this);
  }

  override async mount(): Promise<void> {
    this.server.on('NEW_GAME', this.onNewGame);
    this.server.on('PLAYER_SQUAD_CHANGE', this.onPlayerSquadChange);
    this.updateTrackingListInterval = setInterval(
      this.updateTrackingList,
      this.trackingListUpdateFrequency,
    );
    this.clearDisconnectedPlayersInterval = setInterval(
      this.clearDisconnectedPlayers,
      this.cleanUpFrequency,
    );
  }

  override async unmount(): Promise<void> {
    this.server.removeListener('NEW_GAME', this.onNewGame);
    this.server.removeListener('PLAYER_SQUAD_CHANGE', this.onPlayerSquadChange);
    if (this.updateTrackingListInterval)
      clearInterval(this.updateTrackingListInterval);
    if (this.clearDisconnectedPlayersInterval)
      clearInterval(this.clearDisconnectedPlayersInterval);
  }

  async onNewGame(): Promise<void> {
    this.betweenRounds = true;
    await this.updateTrackingList();
    setTimeout(() => {
      this.betweenRounds = false;
    }, this.gracePeriod);
  }

  async onPlayerSquadChange(player: Player): Promise<void> {
    if (
      player.eosID &&
      player.eosID in this.trackedPlayers &&
      player.squadID !== null
    ) {
      this.untrackPlayer(player.eosID);
    }
  }

  async updateTrackingList(forceUpdate = false): Promise<void> {
    const run = !(
      this.betweenRounds ||
      this.server.players.length < this.options.playerThreshold
    );

    this.verbose(
      3,
      `Update Tracking List? ${run} (Between rounds: ${
        this.betweenRounds
      }, Below player threshold: ${
        this.server.players.length < this.options.playerThreshold
      })`,
    );

    if (!run) {
      for (const eosID of Object.keys(this.trackedPlayers)) {
        this.untrackPlayer(eosID);
      }
      return;
    }

    if (forceUpdate) await this.server.updatePlayerList();

    const admins = this.server.getAdminsWithPermission(
      this.adminPermission,
      'eosID',
    );
    const whitelist = this.server.getAdminsWithPermission(
      this.whitelistPermission,
      'eosID',
    );

    for (const player of this.server.players) {
      if (!player.eosID) continue;
      const eosID = player.eosID;
      const isTracked = eosID in this.trackedPlayers;
      const isUnassigned = player.squadID === null;
      const isAdmin = admins.includes(eosID);
      const isWhitelist = whitelist.includes(eosID);

      if (!isUnassigned && isTracked) this.untrackPlayer(eosID);
      if (!isUnassigned) continue;

      if (isAdmin) this.verbose(2, `Admin is Unassigned: ${player.name}`);
      if (isAdmin && this.options.ignoreAdmins) continue;

      if (isWhitelist)
        this.verbose(2, `Whitelist player is Unassigned: ${player.name}`);
      if (isWhitelist && this.options.ignoreWhitelist) continue;

      if (!isTracked) this.trackedPlayers[eosID] = this.trackPlayer({ player });
    }
  }

  async clearDisconnectedPlayers(): Promise<void> {
    const onlineEosIDs = this.server.players.map((p) => p.eosID);
    for (const eosID of Object.keys(this.trackedPlayers)) {
      if (!onlineEosIDs.includes(eosID)) {
        this.untrackPlayer(eosID);
      }
    }
  }

  msFormat(ms: number): string {
    let min: number | string = Math.floor((ms / 1000 / 60) << 0);
    let sec: number | string = Math.floor((ms / 1000) % 60);
    min = ('' + min).padStart(2, '0');
    sec = ('' + sec).padStart(2, '0');
    return `${min}:${sec}`;
  }

  trackPlayer(info: { player: Player }): TrackedPlayer {
    this.verbose(2, `Tracking: ${info.player.name}`);

    const tracker: TrackedPlayer = {
      player: info.player,
      warnings: 0,
      startTime: Date.now(),
    };

    tracker.warnTimerID = setInterval(async () => {
      const msLeft =
        this.kickTimeout - this.warningInterval * (tracker.warnings + 1);

      if (msLeft < this.warningInterval + 1 && tracker.warnTimerID) {
        clearInterval(tracker.warnTimerID);
      }

      const timeLeft = this.msFormat(msLeft);
      this.server.rcon.warn(
        tracker.player.eosID,
        `${this.options.warningMessage} - ${timeLeft}`,
      );
      this.verbose(2, `Warning: ${tracker.player.name} (${timeLeft})`);
      tracker.warnings++;
    }, this.warningInterval);

    tracker.kickTimerID = setTimeout(async () => {
      await this.updateTrackingList(true);

      if (!(tracker.player.eosID in this.trackedPlayers)) return;

      this.server.rcon.execute(
        `AdminKick "${info.player.eosID}" ${this.options.kickMessage}`,
      );
      this.server.emit('PLAYER_AUTO_KICKED', {
        player: tracker.player,
        warnings: tracker.warnings,
        startTime: tracker.startTime,
      });
      this.verbose(1, `Kicked: ${tracker.player.name}`);
      this.untrackPlayer(tracker.player.eosID);
    }, this.kickTimeout);

    return tracker;
  }

  untrackPlayer(eosID: string): void {
    const tracker = this.trackedPlayers[eosID];
    if (!tracker) return;
    if (tracker.warnTimerID) clearInterval(tracker.warnTimerID);
    if (tracker.kickTimerID) clearTimeout(tracker.kickTimerID);
    delete this.trackedPlayers[eosID];
    this.verbose(2, `unTrack: ${tracker.player.name}`);
  }
}
