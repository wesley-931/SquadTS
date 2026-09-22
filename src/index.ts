import SquadServerFactory from './squad-server/factory.js';
import printLogo from './squad-server/utils/print-logo.js';

type ConfigSource =
  | { kind: 'inline'; value: string }
  | { kind: 'file'; value: string }
  | { kind: 'default'; value: string };

function resolveConfigSource(
  envConfig?: string,
  cliArgs: string[] = [],
): ConfigSource {
  const configPath = cliArgs[0];

  if (envConfig && configPath) {
    throw new Error('Cannot accept both a config and config path.');
  }

  if (envConfig) {
    return { kind: 'inline', value: envConfig };
  }

  if (configPath) {
    return { kind: 'file', value: configPath };
  }

  return { kind: 'default', value: './config.json' };
}

async function buildServer(configSource: ConfigSource) {
  switch (configSource.kind) {
    case 'inline':
      return SquadServerFactory.buildFromConfigString(configSource.value);
    case 'file':
      return SquadServerFactory.buildFromConfigFile(configSource.value);
    case 'default':
      return SquadServerFactory.buildFromConfigFile(configSource.value);
  }
}

async function mountPlugins(server: {
  plugins: Array<{ mount: () => Promise<unknown> }>;
}) {
  await Promise.all(server.plugins.map((plugin) => plugin.mount()));
}

async function main() {
  await printLogo();

  const configSource = resolveConfigSource(
    process.env.config,
    process.argv.slice(2),
  );
  const server = await buildServer(configSource);

  await server.watch();
  await mountPlugins(server);
}

void main();
