import LogParser, { MatchArray } from '../../core/log-parser/index.js';

export default {
  regex: /^\[([0-9\.:-]+)]\[([ 0-9]+)]LogNet: Join succeeded: (.*)/,
  onMatch: (match: MatchArray, logParser: LogParser) => {
    logParser.eventStore.disconnected[match[3] as string] = false;
    logParser.eventStore.joinRequests.push({
      chainID: match[2] as number | string,
      suffix: match[3] as string,
    });
  },
};
