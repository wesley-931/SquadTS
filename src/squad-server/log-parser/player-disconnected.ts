import LogParser, { MatchArray } from '../../core/log-parser/index.js';

export default {
  regex:
    /^\[([0-9\.:-]+)]\[([ 0-9]+)]LogSquad: Player (.+) \(Online IDs: (?:|EOS: ([a-f0-9]{32}) steam: (\d{17}))\) has disconnected\./,
  onMatch: (match: MatchArray, logParser: LogParser) => {
    logParser.eventStore.disconnected[match[4] as string] = true;

    logParser.emit('PLAYER_DISCONNECTED', {
      raw: match[0],
      time: match[1],
      chainID: match[2],
      name: match[3],
      eosID: match[4],
      steamID: match[5],
    });
  },
};
