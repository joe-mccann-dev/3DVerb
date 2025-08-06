import MeshFactory from './mesh_factory.js';
import { DefaultMeshOptions } from './mesh_options.js';

export default class LineFactory extends MeshFactory {

    static optionsFor(stand, envMap) {
        const baseOptions = structuredClone(DefaultMeshOptions.line[stand]);
        baseOptions.geometry.push(
            LineFactory.calcLineLength(baseOptions.points)
        );
        baseOptions.material.envMap = envMap;
        return baseOptions;
    }

    static calcLineLength(points) {
        return Math.sqrt(
            (points.destX - points.srcX) ** 2 +
            (points.destY - points.srcY) ** 2 +
            (points.destZ - points.srcZ) ** 2
        );
    }

    static calcLinePosition(points) {
        return [
            (points.srcX + points.destX) / 2,
            (points.srcY + points.destY) / 2,
            (points.srcZ + points.destZ) / 2
        ]
    }

    constructor(threeModule, options, geo = 'box', mat = 'physical') {
        super(threeModule, options, geo, mat);
    }
}