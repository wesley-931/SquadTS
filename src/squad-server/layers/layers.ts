import axios from 'axios';
import Logger from '../../core/logger.js';
import Layer from './layer.js';

export class Layers {
  public layers: Layer[] = [];
  public pulled = false;

  async pull(force = false): Promise<Layer[]> {
    if (this.pulled && !force) {
      Logger.verbose('Layers', 2, 'Already pulled layers.');
      return this.layers;
    }
    if (force)
      Logger.verbose('Layers', 1, 'Forcing update to layer information...');

    this.layers = [];

    Logger.verbose('Layers', 1, 'Pulling layers...');
    const response = await axios.get(
      'https://raw.githubusercontent.com/Squad-Wiki/squad-wiki-pipeline-map-data/master/completed_output/_Current%20Version/finished.json',
    );

    const maps = response.data?.Maps || [];
    for (const layer of maps) {
      this.layers.push(new Layer(layer));
    }

    Logger.verbose('Layers', 1, `Pulled ${this.layers.length} layers.`);

    this.pulled = true;

    return this.layers;
  }

  async getLayerByCondition(
    condition: (layer: Layer) => boolean,
  ): Promise<Layer | null> {
    await this.pull();

    const matches = this.layers.filter(condition);
    if (matches.length === 1) return matches[0];

    return null;
  }

  getLayerById(layerId: string): Promise<Layer | null> {
    return this.getLayerByCondition((layer) => layer.layerid === layerId);
  }

  getLayerByClassname(classname: string): Promise<Layer | null> {
    return this.getLayerByCondition((layer) => layer.classname === classname);
  }
}

const layersInstance = new Layers();
export default layersInstance;
