import LogParser, { MatchArray } from '../../core/log-parser/index.js';

export default {
  regex:
    /^\[([0-9\.:-]+)]\[([ 0-9]+)]LogSquad: Player:(.+) Damage:(.+) inflict by (.+) \(Online IDs: (?:|EOS: ([a-f0-9]{32}) steam: (\d{17}))\) health reamining:(.+) weapon:(.+)/,
  onMatch: (match: MatchArray, logParser: LogParser) => {
    logParser.emit('PLAYER_DAMAGED', {
      raw: match[0],
      time: match[1],
      chainID: match[2],
      victimName: match[3],
      damage: parseFloat(match[4] as string),
      attackerName: match[5],
      attackerEOSID: match[6],
      attackerSteamID: match[7],
      healthRemaining: parseFloat(match[8] as string),
      weapon: match[9],
    });
  },
};
