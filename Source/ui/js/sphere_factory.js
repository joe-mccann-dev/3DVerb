import MeshFactory from './mesh_factory.js';
import { DefaultMeshOptions } from './mesh_options.js';

export default class SphereFactory extends MeshFactory {

    static defaultOptions(envMap) {
        const options = structuredClone(DefaultMeshOptions.sphere);
        options.material.envMap = envMap;
        return options;
    }

    constructor(threeModule, options, geo = 'sphere', mat = 'standard', ) {
        super(threeModule, options, geo, mat);
    }
}
