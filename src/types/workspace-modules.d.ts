declare module 'squad-server/factory' {
  import SquadServer from 'squad-server';
  import { SquadJSConfig } from 'squad-server/types';

  const SquadServerFactory: {
    buildFromConfig(config: SquadJSConfig): Promise<SquadServer>;
    buildFromConfigString(configString: string): Promise<SquadServer>;
    buildFromConfigFile(configPath?: string): Promise<SquadServer>;
    buildConfig(): Promise<SquadJSConfig>;
    buildConfigFile(): Promise<void>;
    buildReadmeFile(): Promise<void>;
  };

  export default SquadServerFactory;
}

declare module 'squad-server/logo' {
  const printLogo: () => Promise<void>;
  export default printLogo;
}

declare module 'ftp-tail' {
  import { EventEmitter } from 'events';

  export interface FTPTailOptions {
    ftp: Record<string, unknown>;
    fetchInterval?: number;
    maxTempFileSize?: number;
  }

  export interface SFTPTailOptions {
    sftp: Record<string, unknown>;
    fetchInterval?: number;
    maxTempFileSize?: number;
  }

  export class FTPTail extends EventEmitter {
    constructor(options: FTPTailOptions);
    watch(remoteFilePath: string): Promise<void>;
    unwatch(): Promise<void>;
  }

  export class SFTPTail extends EventEmitter {
    constructor(options: SFTPTailOptions);
    watch(remoteFilePath: string): Promise<void>;
    unwatch(): Promise<void>;
  }
}

declare module 'tinygradient' {
  export interface GradientColorStop {
    color: string;
    pos?: number;
  }

  export interface RGBColor {
    toHex(): string;
  }

  export interface Gradient {
    rgbAt(pos: number): RGBColor;
  }

  export default function tinygradient(
    colors: (string | GradientColorStop)[],
  ): Gradient;
}
