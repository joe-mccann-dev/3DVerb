import MeshFactory from './mesh_factory.js';
import { DefaultMeshOptions } from './mesh_options.js';

export default class BoxFactory extends MeshFactory {

    static defaultOptions(envMap, alphaMap) {
        const options = structuredClone(DefaultMeshOptions.box);
        options.material.envMap = envMap;
        options.material.alphaMap = alphaMap;
        return options;
    }

    constructor(threeModule, options, geo = 'box', mat = 'physical') {
        super(threeModule, options, geo, mat);
    }
}