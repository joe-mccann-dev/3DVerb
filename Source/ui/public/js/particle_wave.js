import { BufferGeometry, BufferAttribute, Color, Points, ShaderMaterial, AdditiveBlending, Vector3 } from 'three'
import * as COLORS from './colors.js';
import {environmentMap, camera } from './animated.js'

const SEPARATION = 20, AMOUNTX = 32, AMOUNTY = 16;
const WAVE_X_POS = 50, WAVE_Y_POS = 240, WAVE_Z_POS = 50;
const WAVE_Y_POS_BOTTOM = -80;

const waves = {};
const vectors = {};
const numParticles = AMOUNTX * AMOUNTY;
const numPositions = numParticles * 3;
const positions = new Float32Array(numPositions);
const positionsBottom = new Float32Array(numPositions);
const scales = new Float32Array(numParticles);
const colors = new Float32Array(numParticles * 3);
let currentSeparation = SEPARATION;
let amplitude = -999;

function setupParticles() {
    const shaderMaterial = new ShaderMaterial({
        uniforms: {
            color: { value: new Color(COLORS.particleColor) },
            size: { value: 2.5 },
            envMap: { value: environmentMap },
            cameraPosition: { value: camera.position }
        },
        vertexShader: document.getElementById('vertexshader').textContent,
        fragmentShader: document.getElementById('fragmentshader').textContent,
        transparent: true,
        blending: AdditiveBlending,
        //depthTest: false,

    });

    const buffGeometryTop = createBuffGeometry(positions, scales, colors);
    const buffGeometryBottom = createBuffGeometry(positionsBottom, scales, colors);

    waves.top = new Points(buffGeometryTop, shaderMaterial);
    waves.bottom = new Points(buffGeometryBottom, shaderMaterial);

    vectors.top = new Vector3(WAVE_X_POS, WAVE_Y_POS, WAVE_Z_POS);
    vectors.bottom = new Vector3(WAVE_X_POS, WAVE_Y_POS_BOTTOM, WAVE_Z_POS);

    setInitialValuesForAttrs(currentSeparation, vectors.top, waves.top);
    setInitialValuesForAttrs(currentSeparation, vectors.bottom, waves.bottom);

    return waves;
}

function createBuffGeometry(positions, scales, colors) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new BufferAttribute(scales, 1));
    geometry.setAttribute('color', new BufferAttribute(colors, 3));

    return geometry;
}

function setInitialValuesForAttrs(separation, wavePosition, wave = waves.top) {
    currentSeparation = separation;

    let i = 0, j = 0;

    for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
            const positionArray = wave.geometry.attributes.position.array;
            const colorArray = wave.geometry.attributes.color.array;
            const scaleArray = wave.geometry.attributes.scale.array;

            positionArray[i] = wavePosition.x + ix * currentSeparation - ((AMOUNTX * currentSeparation) / 2); // x
            positionArray[i + 1] = wavePosition.y; // y
            positionArray[i + 2] = wavePosition.z + iy * currentSeparation - ((AMOUNTY * currentSeparation) / 2); // z

            colorArray[i] = 1;
            colorArray[i + 1] = 1;
            colorArray[i + 2] = 1;

            scaleArray[j] = 1;

            i += 3;
            j++;

        }
    }
}

function setSineWaveAmplitude(output) {
    // convert negative decibels to positive; take reciprocal 
    amplitude = 1 / (output * -1) * 100;
}


// sine wave animation taken from https://github.com/mrdoob/three.js/blob/master/examples/webgl_points_waves.html
function animateParticles(levels, count = 0) {

    for (const location in waves) {
        const wave = waves[location];

        const positionArray = wave.geometry.attributes.position.array;
        const colorArray = wave.geometry.attributes.color.array;
        const scaleArray = wave.geometry.attributes.scale.array;

        let positionIndex = 0;
        let particleIndex = 0;

        for (let ix = 0; ix < AMOUNTX; ix++) {
            const freqPosition = ix / (AMOUNTX - 1);

            let hue;
            if (freqPosition < 0.3) {
                hue = 30 * freqPosition / 0.3;
            } else if (freqPosition < 0.7) {
                hue = 90 + 90 * (freqPosition - 0.3) / 0.4;
            } else {
                hue = 240 + 40 * (freqPosition - 0.7) / 0.3;
            }

            for (let iy = 0; iy < AMOUNTY; iy++) {
                const level = levels[particleIndex];
                // animate y_position based on corresponding level
                const y_pos = vectors[location].y;

                positionArray[positionIndex + 1] = y_pos +
                                                    ( amplitude * (currentSeparation) * Math.sin((ix + count))) +
                                                    ( amplitude * (currentSeparation) * Math.sin((iy + count)));
                
                // scale particle based on corresponding level         
                scaleArray[particleIndex] = 2 + (20 * level);

                const lightness = 50 + 50 * level;
                const color = new Color().setHSL(hue / 360, 1, lightness / 100);

                colorArray[positionIndex] = color.r;
                colorArray[positionIndex + 1] = color.g;
                colorArray[positionIndex + 2] = color.b;

                // positions held in 1D array; skip to next set of three
                positionIndex += 3;
                particleIndex++;

            }
        }

        wave.geometry.attributes.position.needsUpdate = true;
        wave.geometry.attributes.scale.needsUpdate = true;
        wave.geometry.attributes.color.needsUpdate = true;
    }
}


export {
    waves,
    vectors,
    setupParticles,
    animateParticles,
    setInitialValuesForAttrs,
    SEPARATION,
    currentSeparation,
    setSineWaveAmplitude,
}