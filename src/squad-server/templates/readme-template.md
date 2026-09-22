<div align="center">

<img src="assets/squadts-logo-white.png#gh-dark-mode-only" alt="SquadTS Logo" width="500"/>
<img src="assets/squadts-logo.png#gh-light-mode-only" alt="SquadTS Logo" width="500"/>

#### SquadTS

##### TypeScript Variant of [SquadJS](https://github.com/Team-Silver-Sphere/SquadJS)

[![GitHub contributors](https://img.shields.io/github/contributors/wesley-931/SquadTS.svg?style=flat-square)](https://github.com/wesley-931/SquadTS/graphs/contributors)
[![GitHub license](https://img.shields.io/github/license/wesley-931/SquadTS.svg?style=flat-square)](https://github.com/wesley-931/SquadTS/blob/main/LICENSE)

<br>

[![Discord](https://img.shields.io/discord/266210223406972928.svg?style=flat-square&logo=discord)](https://discord.gg/9F2Ng5C)

<br><br>
</div>

## **About**

**SquadTS** is an enhanced, fully-typed TypeScript variant of **SquadJS**, designed for Squad servers to handle all communication and data collection (RCON and log parsing) to and from Squad servers.

SquadTS retains full plugin compatibility with SquadJS while modernizing the developer experience:

- **100% TypeScript Architecture**: Consolidated source code under `/src/` with strict type checking.
- **Modernized Tooling**: Built with `tsx` for development execution and `tsc` for JavaScript compilation (`dist/`).
- **Flexible Database Support**: First-class support for **SQLite** out of the box alongside **MySQL**, **MariaDB**, and **PostgreSQL**.
- **Up-to-date Dependencies**: Modern versions of `discord.js` (v14+), `sequelize`, `axios`, `socket.io`, `gamedig`, and ESLint/Prettier.

> **Credits**: SquadTS is directly derived from and built upon **SquadJS**, originally created by **Thomas Smyth** and maintained by **Team Silver Sphere**. We extend full gratitude and credit to Thomas Smyth and all original SquadJS contributors.

<br>

## **Using SquadTS**

SquadTS relies on being able to access the Squad server log directory in order to parse logs live to collect information. Thus, SquadTS must be hosted on the same server box as your Squad server or be connected to your Squad server via FTP / SFTP.

#### Prerequisites

- Git
- [Node.js](https://nodejs.org/en/) (v18+ or v20+)
- npm (included with Node.js)

#### Installation & Quick Start

1. Clone or download SquadTS to your server host.
2. Open the directory in your terminal.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Configure your `config.json` file.
5. Development mode (runs TS directly):
   ```bash
   npm run dev
   ```
6. Build to JavaScript & run in production:
   ```bash
   npm run build
   npm start
   ```

<br>

## **Configuring SquadTS**

SquadTS is configured via a JSON configuration file, located at [config.json](./config.json).

The config file needs to be valid JSON syntax. If an error is thrown saying the config cannot be parsed then try putting the config into a JSON syntax checker (there's plenty to choose from that can be found via Google).

<details>
  <summary>Server</summary>

## Server Configuration

The following section of the configuration contains information about your Squad server.

```json
"server": {
  "id": 1,
  "host": "xxx.xxx.xxx.xxx",
  "queryPort": 27165,
  "rconPort": 21114,
  "rconPassword": "password",
  "logReaderMode": "tail",
  "logDir": "C:/path/to/squad/log/folder",
  "ftp": {
    "host": "xxx.xxx.xxx.xxx",
    "port": 21,
    "user": "FTP Username",
    "password": "FTP Password"
  },
  "sftp": {
    "host": "xxx.xxx.xxx.xxx",
    "port": 22,
    "username": "SFTP Username",
    "password": "SFTP Password"
  },
  "adminLists": [
    {
      "type": "local",
      "source": "C:/Users/Administrator/Desktop/Servers/sq_arty_party/SquadGame/ServerConfig/Admins.cfg",
    },
    {
      "type": "remote",
      "source": "http://yourWebsite.com/Server1/Admins.cfg",
    },
    {
      "type": "ftp",
      "source": "ftp://<user>:<password>@<host>:<port>/<url-path>",
    }
  ]
},
```

- `id` - An integer ID to uniquely identify the server.
- `host` - The IP of the server.
- `queryPort` - The query port of the server.
- `rconPort` - The RCON port of the server.
- `rconPassword` - The RCON password of the server.
- `logReaderMode` - `tail` will read from a local log file, `ftp` will read from a remote log file using the FTP protocol, `sftp` will read from a remote log file using the SFTP protocol.
- `logDir` - The folder where your Squad logs are saved. Most likely will be `C:/servers/squad_server/SquadGame/Saved/Logs`.
- `ftp` - FTP configuration for reading logs remotely. Only required for `ftp` `logReaderMode`.
- `sftp` - SFTP configuration for reading logs remotely. Only required for `sftp` `logReaderMode`.
- `adminLists` - Sources for identifying an admins on the server, either remote or local.

  ***

</details>

<details>
  <summary>Connectors</summary>

## Connector Configuration

Connectors allow SquadTS to communicate with external resources.

```json
"connectors": {
  "discord": "Discord Login Token",
},
```

Connectors should be named, for example the above is named `discord`, and should have the associated config against it. Configs can be specified by name in plugin options. Should a connector not be needed by any plugin then the default values can be left or you can remove it from your config file.

See below for more details on connectors and their associated config.

##### Discord

Connects to Discord via `discord.js`.

```json
"discord": "Discord Login Token",
```

Requires a Discord bot login token.

##### Databases

SquadTS uses [Sequelize](https://sequelize.org/) to connect and use a wide range of SQL databases.

The connector should be configured using any of Sequelize's single argument configuration options.

For example:

```json
"mysql": "mysql://user:pass@example.com:5432/dbname"
```

or:

```json
"sqlite": {
    "dialect": "sqlite",
    "storage": "path/to/database.sqlite"
}
```

See [Sequelize's documentation](https://sequelize.org/master/manual/getting-started.html#connecting-to-a-database) for more details.

---

</details>

<details>
  <summary>Plugins</summary>

## Plugin Configuration

The `plugins` section in your config file lists all plugins built into SquadTS

```json
  "plugins": [
    {
      "plugin": "auto-tk-warn",
      "disabled": false,
      "message": "Please apologise for ALL TKs in ALL chat!"
    }
  ]
```

The `disabled` field can be toggled between `true`/ `false` to enabled/disable the plugin.

Plugin options are also specified. A full list of plugin options can be seen below.

---

</details>

<details>
  <summary>Verboseness</summary>

## Console Output Configuration

The `logger` section configures how verbose a module of SquadTS will be as well as the displayed color.

```json
  "logger": {
    "verboseness": {
      "SquadServer": 1,
      "LogParser": 1,
      "RCON": 1
    },
    "colors": {
      "SquadServer": "yellowBright",
      "SquadServerFactory": "yellowBright",
      "LogParser": "blueBright",
      "RCON": "redBright"
    }
  }
```

The larger the number set in the `verboseness` section for a specified module the more it will print to the console.

---

</details>

<br>

## **Plugins**

The following is a list of plugins built into SquadTS, you can click their title for more information:

Interested in creating your own plugin? [See more here](./squad-server/plugins/readme.md)

//PLUGIN-INFO//

<br>

## Statement on Accuracy

Some information SquadJS collects from Squad servers was never intended or designed to be collected. As a result, it is impossible for any framework to collect the same information with 100% accuracy. SquadJS aims to get as close as possible to that figure, however, it acknowledges that this is not possible in some specific scenarios.

Below is a list of scenarios we know may cause some information to be inaccurate:

- Use of Realtime Server and Player Information - We update server and player information periodically every 30 seconds (by default) or when we know that it requires an update. As a result, some information about the server or players may be up to 30 seconds out of date or greater if an error occurs whilst updating this information.
- SquadJS Restarts - If SquadJS is started during an active Squad game some information will be lost or not collected correctly:
  - The current state of players will be lost. For example, if a player was wounded prior to the bot starting and then is revived/gives up after the bot is started information regarding who originally wounded them will not be known.
  - The accurate collection of some server log events will not occur. SquadJS collects players' "suffix" name, i.e. their Steam name without the clan tag added via the game settings, when they join the server and uses this to identify them in certain logs that do not include their full name. As a result, for players connecting prior to SquadJS starting some log events associated with their actions will show the player as `null`.
- Duplicated Player Names - If two or more players have the same name or suffix name (see above) then SquadJS will be unable to identify them in the logs. When this occurs event logs will show the player as `null`. Be on the watch for groups of players who try to abuse this in order to TK or complete other malicious actions without being detected by SquadJS plugins.

## SquadJS API

SquadJS pings the following data to the [SquadJS API](https://github.com/Team-Silver-Sphere/SquadJS-API/) at regular intervals to assist with its development:

- Squad server IP, query port, name & player count (including queue size).
- SquadJS version.
- Log reader mode, i.e. `tail` or `ftp`.
- Plugin configuration.

At this time, this cannot be disabled.

Please note, plugin configurations do **not** and should **not** contain any sensitive information which allows us to collect this information. Any sensitive information, e.g. Discord login tokens, should be included in the `connectors` section of the config which is not sent to our API. It is important that developers of custom plugins maintain this approach to avoid submitting confidential information to our API.

## Credits & Acknowledgements

SquadTS is a TypeScript variant built upon the foundation of **SquadJS**. Our thanks and full credit go to:

- **Thomas Smyth** ([GitHub Profile](https://github.com/Thomas-Smyth)) - Creator of SquadJS.
- **Team Silver Sphere** ([SquadJS GitHub](https://github.com/Team-Silver-Sphere/SquadJS)) - Original SquadJS repository & organization.
- [SquadJS's contributors](https://github.com/Team-Silver-Sphere/SquadJS/graphs/contributors).
- [Thomas Smyth's GitHub sponsors](https://github.com/sponsors/Thomas-Smyth).
- subtlerod for proposing the initial log parsing idea, helping to design the log parsing process and for providing multiple servers to test with.
- Shanomac99 and the rest of the Squad Wiki team for providing us with [layer information](https://github.com/Squad-Wiki-Editorial/squad-wiki-pipeline-map-data).
- Fourleaf, Mex, various members of ToG / ToG-L and others that helped to stage logs and participate in small scale tests.
- Various Squad servers/communities for participating in larger scale tests and for providing feedback on plugins.
- Everyone in the [Squad RCON Discord](https://discord.gg/9F2Ng5C) and others who have submitted bug reports, suggestions, feedback and provided logs.

## License

```
Boost Software License - Version 1.0 - August 17th, 2003

Copyright (c) 2020 Thomas Smyth

Permission is hereby granted, free of charge, to any person or organization
obtaining a copy of the software and accompanying documentation covered by
this license (the "Software") to use, reproduce, display, distribute,
execute, and transmit the Software, and to prepare derivative works of the
Software, and to permit third-parties to whom the Software is furnished to
do so, all subject to the following:

The copyright notices in the Software and this entire statement, including
the above license grant, this restriction and the following disclaimer,
must be included in all copies of the Software, in whole or in part, and
all derivative works of the Software, unless such copies or derivative
works are solely in the form of machine-executable object code generated by
a source language processor.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT. IN NO EVENT
SHALL THE COPYRIGHT HOLDERS OR ANYONE DISTRIBUTING THE SOFTWARE BE LIABLE
FOR ANY DAMAGES OR OTHER LIABILITY, WHETHER IN CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
```
