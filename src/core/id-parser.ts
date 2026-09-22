const ID_MATCHER = /\s*(?<name>[^\s:]+)\s*:\s*(?<id>[^\s]+)/g;

export const playerIdNames = ['steamID', 'eosID'] as const;
export type PlayerIdName = (typeof playerIdNames)[number];

export interface KeyValuePair {
  key: string;
  value: string;
}

export class IdsIterator implements IterableIterator<KeyValuePair> {
  private inner: IterableIterator<RegExpMatchArray>;

  constructor(matchIterator: IterableIterator<RegExpMatchArray>) {
    this.inner = matchIterator;
  }

  [Symbol.iterator](): IterableIterator<KeyValuePair> {
    return this;
  }

  next(): IteratorResult<KeyValuePair> {
    const match = this.inner.next();
    if (match.done) {
      return { value: undefined, done: true };
    }
    return {
      value: { key: match.value[1], value: match.value[2] },
      done: false,
    };
  }

  forEach(callbackFn: (key: string, value: string) => void): void {
    for (const { key, value } of this) {
      callbackFn(key, value);
    }
  }
}

/**
 * Main function intended for parsing `Online IDs:` body.
 * @param idsStr - String with ids.
 */
export const iterateIDs = (idsStr: string): IdsIterator => {
  return new IdsIterator(idsStr.matchAll(ID_MATCHER));
};

/**
 * Generates capitalized ID names. Examples:
 *   steam -> SteamID
 *   EOSID -> EOSID
 */
export const capitalID = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1) + 'ID';
};

/**
 * Generates lowercase ID names. Examples:
 *   steam -> steamID
 *   EOSID -> eosID
 */
export const lowerID = (str: string): string => {
  return str.toLowerCase() + 'ID';
};
