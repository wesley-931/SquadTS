import LogParser, { MatchArray } from '../../core/log-parser/index.js';

export default {
  regex:
    /^\[([0-9\.:-]+)]\[([ 0-9]+)]LogSquadTrace:\[DedicatedServer\]OnRevive\(\): Reviver PC=(.+) \(Online IDs: EOS: ([a-f0-9]{32}) steam: (\d{17})\) Revivee PC=(.+) \(Online IDs: EOS: ([a-f0-9]{32}) steam: (\d{17})\)/,
  onMatch: (match: MatchArray, logParser: LogParser) => {
    logParser.emit('PLAYER_REVIVED', {
      raw: match[0],
      time: match[1],
      chainID: match[2],
      reviverPlayerController: match[3],
      reviverEOSID: match[4],
      reviverSteamID: match[5],
      victimPlayerController: match[6],
      victimEOSID: match[7],
      victimSteamID: match[8],
    });
  },
};
