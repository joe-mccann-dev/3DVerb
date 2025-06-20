import {BufferGeometry, BufferAttribute, Color, Points, ShaderMaterial}  from 'three'
// testing example code: https://github.com/mrdoob/three.js/blob/master/examples/webgl_points_waves.html
const SEPARATION = 10, AMOUNTX = 20, AMOUNTY = 15;
const WAVE_X_POS = 50, WAVE_Y_POS = 255, WAVE_Z_POS = 50;

export let particles;
const numParticles = AMOUNTX * AMOUNTY;
const positions = new Float32Array(numParticles * 3);
const scales = new Float32Array(numParticles);

let i = 0, j = 0;

for (let ix = 0; ix < AMOUNTX; ix++) {

    for (let iy = 0; iy < AMOUNTY; iy++) {

        positions[i] = WAVE_X_POS + ix * SEPARATION - ((AMOUNTX * SEPARATION) / 2); // x
        positions[i + 1] = WAVE_Y_POS; // y
        positions[i + 2] = WAVE_Z_POS + iy * SEPARATION - ((AMOUNTY * SEPARATION) / 2); // z

        scales[j] = 1;

        i += 3;
        j++;

    }

}

const buffGeometry = new BufferGeometry();
buffGeometry.setAttribute('position', new BufferAttribute(positions, 3));
buffGeometry.setAttribute('scale', new BufferAttribute(scales, 1));

const shaderMaterial = new ShaderMaterial({
    uniforms: {
        color: { value: new Color(0xfafaf0) },
        size: { value: 0.12 }
    },
    vertexShader: document.getElementById('vertexshader').textContent,
    fragmentShader: document.getElementById('fragmentshader').textContent,
})

particles = new Points(buffGeometry, shaderMaterial);
export function animateParticles(count = 0) {
    const positions = particles.geometry.attributes.position.array;
    const scales = particles.geometry.attributes.scale.array;

    let i = 0, j = 0;

    for (let ix = 0; ix < AMOUNTX; ix++) {

        for (let iy = 0; iy < AMOUNTY; iy++) {

            positions[i + 1] = WAVE_Y_POS + (Math.sin((ix + count) * 0.3) * 50) +
                (Math.sin((iy + count) * 0.5) * 50);

            scales[j] = (Math.sin((ix + count) * 0.3) + 1) * 20 +
                (Math.sin((iy + count) * 0.5) + 1) * 20;

            i += 3;
            j++;

        }

    }
    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.scale.needsUpdate = true;
}