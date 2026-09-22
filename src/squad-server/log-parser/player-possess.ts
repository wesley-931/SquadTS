import LogParser, { MatchArray } from '../../core/log-parser/index.js';

export default {
  regex:
    /^\[([0-9\.:-]+)]\[([ 0-9]+)]LogSquadTrace:\[DedicatedServer\]OnPossess\(\): PC=(.+) \(Online IDs: EOS: ([a-f0-9]{32}) steam: (\d{17})\) Possessed Pawn=(.+) Class=(.+) VehicleParent=(.+)/,
  onMatch: (match: MatchArray, logParser: LogParser) => {
    logParser.emit('PLAYER_POSSESS', {
      raw: match[0],
      time: match[1],
      chainID: match[2],
      playerController: match[3],
      playerEOSID: match[4],
      playerSteamID: match[5],
      pawn: match[6],
      possessClassname: match[7],
      vehicleParent: match[8],
    });
  },
};
