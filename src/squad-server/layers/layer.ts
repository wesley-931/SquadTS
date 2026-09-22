export interface VehicleInfo {
  name: string;
  classname: string;
  count: number;
  spawnDelay: number;
  respawnDelay: number;
}

export interface TeamInfo {
  faction: string;
  name: string;
  tickets: number;
  commander: boolean;
  vehicles: VehicleInfo[];
  numberOfTanks: number;
  numberOfHelicopters: number;
}

export interface RawVehicleData {
  type: string;
  rawType: string;
  count: number;
  delay: number;
  respawnTime: number;
  icon?: string;
  [key: string]: unknown;
}

export interface RawTeamData {
  faction: string;
  teamSetupName: string;
  tickets: number;
  commander: boolean;
  vehicles?: RawVehicleData[];
  [key: string]: unknown;
}

export interface RawLayerData {
  Name: string;
  levelName: string;
  rawName: string;
  mapName: string;
  gamemode: string;
  type: string;
  layerVersion: string;
  mapSize: string;
  mapSizeType: string;
  capturePoints: string | number;
  lighting: string;
  lightingLevel: string;
  team1: RawTeamData;
  team2: RawTeamData;
  [key: string]: unknown;
}

export default class Layer {
  public name: string;
  public classname: string;
  public layerid: string;
  public map: { name: string };
  public gamemode: string;
  public gamemodeType: string;
  public version: string;
  public size: string;
  public sizeType: string;
  public numberOfCapturePoints: number;
  public lighting: { name: string; classname: string };
  public teams: TeamInfo[];

  constructor(data: RawLayerData) {
    this.name = data.Name;
    this.classname = data.levelName;
    this.layerid = data.rawName;
    this.map = {
      name: data.mapName,
    };
    this.gamemode = data.gamemode;
    this.gamemodeType = data.type;
    this.version = data.layerVersion;
    this.size = data.mapSize;
    this.sizeType = data.mapSizeType;
    this.numberOfCapturePoints =
      typeof data.capturePoints === 'string'
        ? parseInt(data.capturePoints, 10)
        : data.capturePoints;
    this.lighting = {
      name: data.lighting,
      classname: data.lightingLevel,
    };
    this.teams = [];
    for (const t of ['team1', 'team2'] as const) {
      const teamData = data[t] || {};
      const vehiclesData: RawVehicleData[] = teamData.vehicles || [];
      this.teams.push({
        faction: teamData.faction,
        name: teamData.teamSetupName,
        tickets: teamData.tickets,
        commander: teamData.commander,
        vehicles: vehiclesData.map((v) => ({
          name: v.type,
          classname: v.rawType,
          count: v.count,
          spawnDelay: v.delay,
          respawnDelay: v.respawnTime,
        })),
        numberOfTanks: vehiclesData.filter(
          (v) => v.icon && Boolean(v.icon.match(/_tank/)),
        ).length,
        numberOfHelicopters: vehiclesData.filter(
          (v) => v.icon && Boolean(v.icon.match(/helo/)),
        ).length,
      });
    }
  }
}
