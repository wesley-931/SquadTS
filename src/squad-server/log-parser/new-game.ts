import LogParser, { MatchArray } from '../../core/log-parser/index.js';

export default {
  regex:
    /^\[([0-9\.:-]+)]\[([ 0-9]+)]LogWorld: Bringing World \/Game\/Maps\/([^/]+)\/(?:|SubMaps\/)([^.]+)\.[^.]+/i,
  onMatch: (match: MatchArray, logParser: LogParser) => {
    logParser.clearEventStore();

    logParser.emit('NEW_GAME', {
      raw: match[0],
      time: match[1],
      chainID: match[2],
      dlc: match[3],
      layerClassname: match[4],
    });
  },
};
