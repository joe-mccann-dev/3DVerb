import MeshFactory from './mesh_factory.js';
export default class BoxFactory extends MeshFactory {

    static DEFAULT_WIDTH = 1500;
    static DEFAULT_HEIGHT = 600;
    static DEFAULT_DEPTH = BoxFactory.DEFAULT_HEIGHT * 1.5;
    static DEFAULT_WIDTH_SEGS = 20;
    static DEFAULT_HEIGHT_SEGS = 20;

    static defaultOptions(envMap, alphaMap) {
        return {
            'geometry': [
                BoxFactory.DEFAULT_WIDTH,
                BoxFactory.DEFAULT_HEIGHT,
                BoxFactory.DEFAULT_DEPTH,
                BoxFactory.DEFAULT_WIDTH_SEGS,
                BoxFactory.DEFAULT_HEIGHT_SEGS,
            ],
            'material': {
                envMap: envMap,
                envMapIntensity: 24.0,
                transparent: true,
                alphaMap: alphaMap,
                opacity: 1,
                transmission: 1,
                iridescence: 0.4,
                reflectivity: 1,
                roughness: 0.4,
                depthWrite: false,
            }
        }
    }

    constructor(threeModule, options, geo = 'box', mat = 'physical') {
        super(threeModule, options, geo, mat);
    }
}