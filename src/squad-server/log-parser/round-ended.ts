import LogParser, { MatchArray } from '../../core/log-parser/index.js';

export default {
  regex: /^\[([0-9\.:-]+)]\[([ 0-9]+)]LogSquad: State: RoundEnded/,
  onMatch: (match: MatchArray, logParser: LogParser) => {
    logParser.emit('ROUND_ENDED', {
      raw: match[0],
      time: match[1],
      chainID: match[2],
    });
  },
};
