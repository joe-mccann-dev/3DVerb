import MeshFactory from './mesh_factory.js';
import { DefaultMeshOptions } from './mesh_options.js';

export default class LineFactory extends MeshFactory {

    static defaultOptions(envMap, lineDepth) {
        const options = DefaultMeshOptions.line;
        options.geometry.push(lineDepth);
        options.material.envMap = envMap;
        return options;
    }

    static calcLineDepth(srcX, destX, srcY, destY, srcZ, destZ) {
        return Math.sqrt(
            (destX - srcX) ** 2 +
            (destY - srcY) ** 2 +
            (destZ - srcZ) ** 2
        );
    }

    static calcLinePosition(srcX, destX, srcY, destY, srcZ, destZ) {
        return [
            (srcX + destX) / 2,
            (srcY + destY) / 2,
            (srcZ + destZ) / 2
        ]
    }

    constructor(threeModule, options, geo = 'box', mat = 'standard') {
        super(threeModule, options, geo, mat);
    }
}