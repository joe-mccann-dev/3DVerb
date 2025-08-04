import * as COLORS from './colors.js';

export const defaultParams = {
    box: {
        width: 1500,
        height: 600,
        depth: 900,
        widthSegs: 20,
        heightSegs: 20,
    },

    sphere: {
        radius: 5,
        widthSegs: 12,
        heightSegs: 12,
    }
}

export const DefaultMeshOptions = {
    // uses physical material
    box: {
        geometry: [
            defaultParams.box.width,
            defaultParams.box.height,
            defaultParams.box.depth,
            defaultParams.box.widthSegs,
            defaultParams.box.heightSegs,
        ],
        material: {
            envMapIntensity: 24.0,
            transparent: true,
            opacity: 1,
            transmission: 1,
            iridescence: 0.4,
            reflectivity: 1,
            roughness: 0.4,
            depthWrite: false,
        }
    },

    // uses sphere material
    sphere: {
        geometry: [
            defaultParams.sphere.radius,
            defaultParams.sphere.widthSegs,
            defaultParams.sphere.heightSegs,
        ],
        material: {
            color: COLORS.skyBlueColor,
            wireframe: true,
            envMapIntensity: 80.0,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
        }
    }
}