import MeshFactory from './mesh_factory.js';
import * as COLORS from './colors.js';

export default class SphereFactory extends MeshFactory {

    static DEFAULT_RADIUS = 5;
    static DEFAULT_WIDTH_SEGS = 12;
    static DEFAULT_HEIGHT_SEGS = 12;

    static defaultOptions(environmentMap) {
        return {
            'geometry': [
                SphereFactory.DEFAULT_RADIUS,
                SphereFactory.DEFAULT_WIDTH_SEGS,
                SphereFactory.DEFAULT_HEIGHT_SEGS
            ],
            'material': {
                color: COLORS.skyBlueColor,
                wireframe: true,
                envMap: environmentMap,
                envMapIntensity: 80.0,
                transparent: true,
                opacity: 0.9,
                depthWrite: false,
            }
        }
    }

    constructor(threeModule, options, geo = 'sphere', mat = 'standard') {
        super(threeModule, options, geo, mat);
    }
}
