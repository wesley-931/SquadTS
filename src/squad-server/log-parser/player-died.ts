import LogParser, { MatchArray } from '../../core/log-parser/index.js';

export default {
  regex:
    /^\[([0-9\.:-]+)]\[([ 0-9]+)]LogSquadTrace:\[DedicatedServer\]OnDied\(\): Player:(.+) \(Online IDs: (?:|EOS: ([a-f0-9]{32}) steam: (\d{17}))\) damage:(.+) inflict by Player:(.+) \(Online IDs: (?:|EOS: ([a-f0-9]{32}) steam: (\d{17}))\) damage dealer:(.+) weapon:(.+) class:(.+)/,
  onMatch: (match: MatchArray, logParser: LogParser) => {
    logParser.emit('PLAYER_DIED', {
      raw: match[0],
      time: match[1],
      chainID: match[2],
      victimName: match[3],
      victimEOSID: match[4],
      victimSteamID: match[5],
      damage: parseFloat(match[6] as string),
      attackerName: match[7],
      attackerEOSID: match[8],
      attackerSteamID: match[9],
      damageDealer: match[10],
      weapon: match[11],
      victimWeapon: match[12],
    });
  },
};
