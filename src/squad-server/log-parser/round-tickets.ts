import LogParser, { MatchArray } from '../../core/log-parser/index.js';

export default {
  regex:
    /^\[([0-9\.:-]+)]\[([ 0-9]+)]LogSquad: (Team 1|Team 2) ([a-zA-Z0-9_]+) (gained|lost) ([0-9]+) tickets/,
  onMatch: (match: MatchArray, logParser: LogParser) => {
    logParser.emit('ROUND_TICKETS', {
      raw: match[0],
      time: match[1],
      chainID: match[2],
      team: match[3],
      faction: match[4],
      action: match[5],
      tickets: parseInt(match[6] as string, 10),
    });
  },
};
