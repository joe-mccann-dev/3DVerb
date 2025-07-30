import { BufferGeometry, BufferAttribute, Color, Points, ShaderMaterial, AdditiveBlending, Vector3 } from 'three'
import * as COLORS from './colors.js';
import { environmentMap, camera } from './animated.js'
import * as Utility from './utility.js';

const SEPARATION = 56, AMOUNTX = 32, AMOUNTY = 16;
const WAVE_X_POS = 50, WAVE_Y_POS = 500, WAVE_Z_POS = 50;
const WAVE_Y_POS_BOTTOM = -500;

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
const maxAmps = 5;
const ampQueue = [];
const smoothedLevels = [];

function setupParticles() {
    const shaderMaterial = new ShaderMaterial({
        uniforms: {
            color: { value: new Color(COLORS.particleColor) },
            size: { value: 1.8 },
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

    setInitialValuesForAttrs(SEPARATION, vectors.top, waves.top);
    setInitialValuesForAttrs(SEPARATION, vectors.bottom, waves.bottom);

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
    setCurrentSeparation(separation);
    let i = 0, j = 0;

    for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
            const positionArray = wave.geometry.attributes.position.array;
            const colorArray = wave.geometry.attributes.color.array;
            const scaleArray = wave.geometry.attributes.scale.array;

            positionArray[i] = wavePosition.x + ix * separation - ((AMOUNTX * separation) / 2); // x
            positionArray[i + 1] = wavePosition.y; // y
            positionArray[i + 2] = wavePosition.z + iy * separation - ((AMOUNTY * separation) / 2); // z

            colorArray[i] = 1;
            colorArray[i + 1] = 1;
            colorArray[i + 2] = 1;

            scaleArray[j] = 1;

            i += 3;
            j++;
        }
    }
}

// sine wave animation inspired by https://github.com/mrdoob/three.js/blob/master/examples/webgl_points_waves.html
function animateParticles(levels, count = 0) {
    if (smoothedLevels.length !== levels.length) {
        for (let i = 0; i < levels.length; i++) {
            smoothedLevels[i] = levels[i];
        }
    }

    const avgAmp = getAverageAmplitude();
    const currentSeparation = getCurrentSeparation();

    for (const location in waves) {
        const wave = waves[location];

        const positionArray = wave.geometry.attributes.position.array;
        const colorArray = wave.geometry.attributes.color.array;
        const scaleArray = wave.geometry.attributes.scale.array;

        let positionIndex = 0;
        let particleIndex = 0;

        for (let ix = 0; ix < AMOUNTX; ix++) {
            const freqPosition = ix / (AMOUNTX - 1);

            const hue = calculateHue(freqPosition);

            for (let iy = 0; iy < AMOUNTY; iy++) {
                // prevent large jumps up or down in scale;
                const smoothingFactor = 0.7;
                smoothedLevels[particleIndex] = smoothedLevels[particleIndex] *
                                                smoothingFactor + 
                                                levels[particleIndex] * 0.1;

                const smoothedLevel = smoothedLevels[particleIndex];
            
                const minFloor = 8;
                const floor = minFloor + avgAmp ** 0.5;

                const linearScale = (ix / AMOUNTX);
                const levelScale = (smoothedLevel ** (1 / Math.E)) * 0.8 * currentSeparation;
                const multiplier = floor + linearScale + levelScale;

                const y_pos = vectors[location].y;
                positionArray[positionIndex + 1] = y_pos +
                                                   multiplier * Math.sin(ix + count) +
                                                   multiplier * Math.sin(iy + count);

                scaleArray[particleIndex] = multiplier + avgAmp ** 0.5;;

                const lightness = 50 + 50 * smoothedLevel;
                const color = new Color().setHSL(hue / 360, 1, lightness / 100);
                colorArray[positionIndex] = color.r;
                colorArray[positionIndex + 1] = color.g;
                colorArray[positionIndex + 2] = color.b;

                positionIndex += 3;
                particleIndex++;
            }
        }

        wave.geometry.attributes.position.needsUpdate = true;
        wave.geometry.attributes.scale.needsUpdate = true;
        wave.geometry.attributes.color.needsUpdate = true;
    }
}

// scale first half of color wheel from red (0) to cyan ( 180)
function calculateHue(freqPosition) { 
    return 0 + (180 * freqPosition);
}

function setCurrentSeparation(newSeparation) {
    currentSeparation = newSeparation;
}

function getCurrentSeparation() {
    return currentSeparation;
}

function scaleParticleSeparation(roomSize) {
    const floor = 30;
    const separationScaleFactor = floor + (SEPARATION * roomSize);

    for (const location in waves) {
        const wave = waves[location];
        setInitialValuesForAttrs(separationScaleFactor, vectors[location], wave);
    }
}

function setSineWaveAmplitude(output) {
    const convertedOutput = -1 * output;
    const minAmp = 4;
    const maxAmp = 16;
    const multiplier = currentSeparation * (1 / convertedOutput); // as convertedOutput increases, multiplier decreases
    const logBase = Math.E;
    amplitude = Utility.getLogScaledValue(minAmp, maxAmp, multiplier, logBase);
    //console.log("amplitude: ", amplitude);
    return amplitude
}

function getAmplitude() {
    return amplitude;
}

function updateAmpQueue(newAmp) {
    ampQueue.push(newAmp);
    if (ampQueue.length > maxAmps) {
        ampQueue.shift();
    }
}

function getAverageAmplitude() {
    if (ampQueue.length === 0) {
        return 0;
    }

    return ampQueue.reduce((a, b) => {
        return a + b;
    }, 0) / ampQueue.length;
}

export {
    waves,
    vectors,
    setupParticles,
    animateParticles,
    setInitialValuesForAttrs,
    SEPARATION,
    setCurrentSeparation,
    getCurrentSeparation,
    scaleParticleSeparation,
    setSineWaveAmplitude,
    getAmplitude,
    amplitude,
    updateAmpQueue,
    getAverageAmplitude,
    WAVE_X_POS,
    WAVE_Y_POS,
    WAVE_Z_POS,
    WAVE_Y_POS_BOTTOM,
}