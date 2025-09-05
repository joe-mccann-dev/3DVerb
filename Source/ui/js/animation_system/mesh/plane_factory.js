import MeshFactory from './mesh_factory.js';
import { DefaultMeshOptions } from './mesh_options.js';
export default class PlaneFactory extends MeshFactory {

    static optionsFor(plane, envMap) {
        const options = structuredClone(DefaultMeshOptions.plane[plane]);
        options.material.envMap = envMap;
        return options;
    }

    constructor(threeModule, options, geo = 'plane', mat = 'physical') {
        super(threeModule, options, geo, mat);
    }
}