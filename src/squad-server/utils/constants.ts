import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pkgPath = path.resolve(__dirname, '../../../package.json');
const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

export const SQUADJS_VERSION: string = pkgData.version;

/* As set out by the terms of the license, the following should not be modified. */
export const COPYRIGHT_MESSAGE = `Powered by SquadJS, Copyright © ${new Date().getFullYear()}`;
