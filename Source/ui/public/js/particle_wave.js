import { BufferGeometry, BufferAttribute, Color, Points, ShaderMaterial } from 'three'
import * as COLORS from './colors.js';
// testing example code: https://github.com/mrdoob/three.js/blob/master/examples/webgl_points_waves.html
const SEPARATION = 10, AMOUNTX = 32, AMOUNTY = 16;
//camera.lookAt(new THREE.Vector3(50, 65, -50));
const WAVE_X_POS = 50, WAVE_Y_POS = 265, WAVE_Z_POS = 50;

let particles;
const numParticles = AMOUNTX * AMOUNTY;
const positions = new Float32Array(numParticles * 3);
const scales = new Float32Array(numParticles);
const colors = new Float32Array(numParticles * 3);

let i = 0, j = 0;

for (let ix = 0; ix < AMOUNTX; ix++) {

    for (let iy = 0; iy < AMOUNTY; iy++) {

        positions[i] = WAVE_X_POS + ix * SEPARATION - ((AMOUNTX * SEPARATION) / 2); // x
        positions[i + 1] = WAVE_Y_POS; // y
        positions[i + 2] = WAVE_Z_POS + iy * SEPARATION - ((AMOUNTY * SEPARATION) / 2); // z

        colors[i] = 1;
        colors[i + 1] = 1;
        colors[i + 2] = 1;

        scales[j] = 1;

        i += 3;
        j++;

    }

}

const buffGeometry = new BufferGeometry();
buffGeometry.setAttribute('position', new BufferAttribute(positions, 3));
buffGeometry.setAttribute('scale', new BufferAttribute(scales, 1));
buffGeometry.setAttribute('color', new BufferAttribute(colors, 3));

const shaderMaterial = new ShaderMaterial({
    uniforms: {
        color: { value: new Color(COLORS.particleColor) },
        size: { value: 1 }
    },
    vertexShader: document.getElementById('vertexshader').textContent,
    fragmentShader: document.getElementById('fragmentshader').textContent,
})

particles = new Points(buffGeometry, shaderMaterial);

//particles.geometry.rotateX(Math.PI);
//particles.geometry.rotateY(-Math.PI / 2);
//particles.geometry.rotateZ(-Math.PI);

function animateParticles(levels, count = 0) {
    const positions = particles.geometry.attributes.position.array;
    const scales = particles.geometry.attributes.scale.array;
    const colors = particles.geometry.attributes.color.array;

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
            positions[positionIndex + 1] = WAVE_Y_POS + 50 * Math.sin((ix + count)) +
                50 * Math.sin((iy + count));
            // scale particle based on corresponding level         
            scales[particleIndex] = 2 + (20 * level);
      
            const lightness = 50 + 50 * level;
            const color = new Color().setHSL(hue / 360, 1, lightness / 100);

            colors[positionIndex] = color.r;
            colors[positionIndex + 1] = color.g;
            colors[positionIndex + 2] = color.b;

            // positions held in 1D array; skip to next set of three
            positionIndex += 3;
            particleIndex++;

        }

    }
    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.scale.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
}


export {
    particles,
    animateParticles,
}