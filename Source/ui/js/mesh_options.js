import * as COLORS from './colors.js';
import { DoubleSide } from 'three';

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
    },

    plane: {
        geometries: {
            base: {
                width: 500,
                height: 400,
                segs: 4,
            },
            wall: {
                width: 500,
                height: 300,
                segs: 4,
            },
            speakerStand: {
                width: 120,
                height: 100,
                segs: 4,
            }
        },

        material: {

            iridescence: 0.2,
            side: DoubleSide,
            transparent: true,
            opacity: 1,
            transmission: 1,
            roughness: 0.5,
        }
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
    },

    plane: {
        base: {
            geometry: [
                defaultParams.plane.geometries.base.width,
                defaultParams.plane.geometries.base.height,
                defaultParams.plane.geometries.base.segs,
            ],
            material: {
                ...defaultParams.plane.material,
                color: COLORS.bottomPlaneColor,
            }
        },

        wall: {
            geometry: [
                defaultParams.plane.geometries.wall.width,
                defaultParams.plane.geometries.wall.height,
                defaultParams.plane.geometries.wall.segs
            ],
            material: {
                ...defaultParams.plane.material,
                color: COLORS.sidePlaneColor,
            }
        },

        speakerStand: {
            geometry: [
                defaultParams.plane.geometries.speakerStand.width,
                defaultParams.plane.geometries.speakerStand.height,
                defaultParams.plane.geometries.speakerStand.segs,
            ],
            material: {
                ...defaultParams.plane.material,
                color: COLORS.speakerStandColor,
            }
        }
    }
}