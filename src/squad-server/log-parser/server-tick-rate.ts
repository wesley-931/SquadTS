import LogParser, { MatchArray } from '../../core/log-parser/index.js';

export default {
  regex: /^\[([0-9\.:-]+)]\[([ 0-9]+)]LogSquad: Server Tick Rate: ([0-9\.]+)/,
  onMatch: (match: MatchArray, logParser: LogParser) => {
    logParser.emit('TICK_RATE', {
      raw: match[0],
      time: match[1],
      chainID: match[2],
      tickRate: parseFloat(match[3] as string),
    });
  },
};
