import MeshFactory from './mesh_factory.js';
import { DefaultMeshOptions } from './mesh_options.js';
export default class PlaneFactory extends MeshFactory {

    static baseOptions(envMap) {
        const options = structuredClone(DefaultMeshOptions.plane.base);
        options.material.envMap = envMap;
        return options;

    }

    static wallOptions(envMap) {
        const options = structuredClone(DefaultMeshOptions.plane.wall);
        options.material.envMap = envMap;
        return options;
    }

    static speakerStandOptions(envMap) {
        const options = structuredClone(DefaultMeshOptions.plane.speakerStand);
        options.material.envMap = envMap;
        return options;
    }

    constructor(threeModule, options, geo = 'plane', mat = 'physical') {
        super(threeModule, options, geo, mat);
    }
}