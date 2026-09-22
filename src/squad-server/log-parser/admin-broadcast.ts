import LogParser, { MatchArray } from '../../core/log-parser/index.js';

export default {
  regex:
    /^\[([0-9\.:-]+)]\[([ 0-9]+)]LogSquad: ADMIN BROADCAST: (.*) from (.*)/,
  onMatch: (match: MatchArray, logParser: LogParser) => {
    logParser.emit('ADMIN_BROADCAST', {
      raw: match[0],
      time: match[1],
      chainID: match[2],
      message: match[3],
      from: match[4],
    });
  },
};
