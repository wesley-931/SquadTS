import LogParser, { MatchArray } from '../../core/log-parser/index.js';

export default {
  regex:
    /^\[([0-9\.:-]+)]\[([ 0-9]+)]LogSquad: PostLogin: NewPlayer: APlayerController (?:BP_PlayerController_C|\[PC\]|)(.+) \(IP: (.*) \| Online IDs: EOS: ([a-f0-9]{32}) steam: (\d{17})\)/,
  onMatch: (match: MatchArray, logParser: LogParser) => {
    let suffix: string | null = null;
    let chainID: number | string | null = null;

    for (let i = logParser.eventStore.joinRequests.length - 1; i >= 0; i--) {
      const request = logParser.eventStore.joinRequests[i];
      if (request.chainID === match[2]) {
        suffix = request.suffix;
        chainID = request.chainID;
        logParser.eventStore.joinRequests.splice(i, 1);
        break;
      }
    }

    if (suffix) {
      logParser.eventStore.players[match[5] as string] = {
        controller: match[3] as string,
        suffix: suffix,
        steamID: match[6] as string,
        eosID: match[5] as string,
      };
    }

    logParser.emit('JOIN_SUCCEEDED', {
      raw: match[0],
      time: match[1],
      chainID: chainID || match[2],
      playerSuffix: suffix,
      playerController: match[3],
      ip: match[4],
      eosID: match[5],
      steamID: match[6],
    });
  },
};
