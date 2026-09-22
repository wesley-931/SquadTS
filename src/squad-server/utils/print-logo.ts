import axios from 'axios';
import { SQUADJS_VERSION, COPYRIGHT_MESSAGE } from './constants.js';

function versionOutOfDate(current: string, latest: string): boolean {
  const cMatch = current.match(/([0-9]+)\.([0-9]+)\.([0-9]+)/);
  const lMatch = latest.match(/([0-9]+)\.([0-9]+)\.([0-9]+)/);

  if (!cMatch || !lMatch) return false;

  cMatch.shift();
  lMatch.shift();

  const [cMajor, cMinor, cPatch] = cMatch.map((v) => parseInt(v, 10));
  const [lMajor, lMinor, lPatch] = lMatch.map((v) => parseInt(v, 10));

  return (
    cMajor < lMajor ||
    (cMajor === lMajor && cMinor < lMinor) ||
    (cMajor === lMajor && cMinor === lMinor && cPatch < lPatch)
  );
}

export default async function printLogo(): Promise<void> {
  try {
    const { data } = await axios.get(
      `https://raw.githubusercontent.com/Team-Silver-Sphere/SquadJS/master/package.json`,
    );
    const latestVersion =
      typeof data === 'string' ? JSON.parse(data).version : data.version;
    const outdated = versionOutOfDate(SQUADJS_VERSION, latestVersion);

    console.log(
      `
   _____                      _______ _____ 
  / ____|                    |__   __/ ____|
 | (___   __ _ _   _  __ _  __| | | | (___  
  \\___ \\ / _\` | | | |/ _\` |/ _\` | | |  \\___ \\ 
  ____) | (_| | |_| | (_| | (_| | | |  ____) |
 |_____/ \\__, |\\__,_|\\__,_|\\__,_|_| |_|_____/ 
            | |                             
            |_|                             
${COPYRIGHT_MESSAGE}
Based on SquadJS by Thomas Smyth & Team Silver Sphere
Original GitHub: https://github.com/Team-Silver-Sphere/SquadJS

SquadTS Version: \x1b[32m${SQUADJS_VERSION}\x1b[0m (SquadJS Upstream Latest: ${
        outdated ? '\x1b[31m' : '\x1b[32m'
      }${latestVersion}\x1b[0m)

\x1b[33mLooking for ways to help protect your server from harmful players?
Checkout the Squad Community Ban List: https://communitybanlist.com/\x1b[0m
`,
    );
  } catch (_err) {
    console.log(`SquadTS v${SQUADJS_VERSION} - ${COPYRIGHT_MESSAGE}`);
  }
}
