import LogParser, { MatchArray } from '../../core/log-parser/index.js';

export default {
  regex:
    /^\[([0-9\.:-]+)]\[([ 0-9]+)]LogSquadTrace:\[DedicatedServer\]TakeDamage\(\): ([^ ]+) damage: ([0-9\.]+) weapon: ([^ ]+) \([^)]+\) damage dealer: ([^ ]+) \([^)]+\) by player ([^ ]+)/,
  onMatch: (match: MatchArray, logParser: LogParser) => {
    logParser.emit('DEPLOYABLE_DAMAGED', {
      raw: match[0],
      time: match[1],
      chainID: match[2],
      deployable: match[3],
      damage: parseFloat(match[4] as string),
      weapon: match[5],
      damageDealer: match[6],
      playerSuffix: match[7],
    });
  },
};
