import LogParser, { MatchArray } from '../../core/log-parser/index.js';

export default {
  regex:
    /^\[([0-9\.:-]+)]\[([ 0-9]+)]LogSquadTrace:\[DedicatedServer\]OnRoundEnded\(\): Winner=(.+) Layer=(.+)/,
  onMatch: (match: MatchArray, logParser: LogParser) => {
    logParser.emit('ROUND_WINNER', {
      raw: match[0],
      time: match[1],
      chainID: match[2],
      winner: match[3],
      layer: match[4],
    });
  },
};
