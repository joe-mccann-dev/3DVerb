import { BufferGeometry, BufferAttribute, Color, Points, ShaderMaterial, AdditiveBlending, Vector3 } from 'three'
import * as COLORS from './colors.js';
import {environmentMap, camera } from './animated.js'

const SEPARATION = 20, AMOUNTX = 32, AMOUNTY = 16;
const WAVE_X_POS = 50, WAVE_Y_POS = 240, WAVE_Z_POS = 50;
const WAVE_Y_POS_BOTTOM = -80;

let particles;
let particles2;
const waves = {};
const numParticles = AMOUNTX * AMOUNTY;
const positions = new Float32Array(numParticles * 3);
const positions2 = new Float32Array(numParticles * 3);
const scales = new Float32Array(numParticles);
const scales2 = new Float32Array(numParticles);
const colors = new Float32Array(numParticles * 3);
const colors2 = new Float32Array(numParticles * 3);
let currentSeparation = SEPARATION;

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

    const buffGeometryTop = new BufferGeometry();
    buffGeometryTop.setAttribute('position', new BufferAttribute(positions, 3));
    buffGeometryTop.setAttribute('scale', new BufferAttribute(scales, 1));
    buffGeometryTop.setAttribute('color', new BufferAttribute(colors, 3));

    const buffGeometryBottom = new BufferGeometry();
    buffGeometryBottom.setAttribute('position', new BufferAttribute(positions2, 3));
    buffGeometryBottom.setAttribute('scale', buffGeometryTop.attributes.scale); // use same scale
    buffGeometryBottom.setAttribute('color', buffGeometryTop.attributes.color); // use same colors

    particles = new Points(buffGeometryTop, shaderMaterial);
    particles2 = new Points(buffGeometryBottom, shaderMaterial);
    waves.top = particles;
    waves.bottom = particles2;
    setInitialValuesForAttrs(currentSeparation, waves.top);
    setInitialValuesForAttrs(currentSeparation, waves.bottom);
    return particles;
}

function setInitialValuesForAttrs(separation, wave = waves.top, wavePosition = new Vector3(WAVE_X_POS, WAVE_Y_POS, WAVE_Z_POS) ) {
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
    //rotatePointsGeometry();
}

function rotatePointsGeometry() {
    
    particles.geometry.rotateX(Math.PI);
    particles.geometry.rotateY(-Math.PI / 2);
    particles.geometry.rotateZ(-Math.PI);
}


// sine wave animation taken from https://github.com/mrdoob/three.js/blob/master/examples/webgl_points_waves.html
function animateParticles(levels, count = 0) {
    const positions = particles.geometry.attributes.position.array;
    const scales = particles.geometry.attributes.scale.array;
    const colors = particles.geometry.attributes.color.array;

    const positions2 = particles2.geometry.attributes.position.array;
    const scales2 = particles2.geometry.attributes.scale.array;
    const colors2 = particles2.geometry.attributes.color.array;

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
            positions[positionIndex + 1] = WAVE_Y_POS + (currentSeparation) * Math.sin((ix + count)) +
                (currentSeparation) * Math.sin((iy + count));

            positions2[positionIndex + 1] = WAVE_Y_POS_BOTTOM + (currentSeparation) * Math.sin((ix + count)) +
                (currentSeparation) * Math.sin((iy + count));
            // scale particle based on corresponding level         
            scales[particleIndex] = 2 + (20 * level);
            scales2[particleIndex] = 2 + (20 * level);
      
            const lightness = 50 + 50 * level;
            const color = new Color().setHSL(hue / 360, 1, lightness / 100);

            colors[positionIndex] = color.r;
            colors[positionIndex + 1] = color.g;
            colors[positionIndex + 2] = color.b;

            colors2[positionIndex] = color.r;
            colors2[positionIndex + 1] = color.g;
            colors2[positionIndex + 2] = color.b;

            // positions held in 1D array; skip to next set of three
            positionIndex += 3;
            particleIndex++;

        }
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.scale.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;

    particles2.geometry.attributes.position.needsUpdate = true;
    particles2.geometry.attributes.scale.needsUpdate = true;
    particles2.geometry.attributes.color.needsUpdate = true;


    
}


export {
    waves,
    setupParticles,
    rotatePointsGeometry,
    animateParticles,
    setInitialValuesForAttrs,
    SEPARATION,
}