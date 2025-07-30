import * as COLORS from './colors.js';
import * as Utility from './utility.js';

export default class ParticleWave {
    static SEPARATION = 56;
    static AMOUNTX = 32;
    static AMOUNTY = 16;
    static NUM_PARTICLES = ParticleWave.AMOUNTX * ParticleWave.AMOUNTY;
    static NUM_POSITIONS = ParticleWave.NUM_PARTICLES * 3;
    static POSITIONS = new Float32Array(ParticleWave.NUM_POSITIONS);
    static POSITIONS_BOTTOM = new Float32Array(ParticleWave.NUM_POSITIONS);
    static SCALES = new Float32Array(ParticleWave.NUM_PARTICLES);
    static COLORS = new Float32Array(ParticleWave.NUM_PARTICLES * 3);
    static WAVE_X_POS = 50;
    static WAVE_Y_POS = 500;
    static WAVE_Z_POS = 50;
    static WAVE_Y_POS_BOTTOM = -500;
    static MAX_AMPS = 5;
    static SMOOTHING_FACTOR = 0.8;
    static MIN_SCALE_AND_POSITION_FLOOR = 8;

    #waves = {};
    #vectors = {};
    #currentSeparation = ParticleWave.SEPARATION;
    #amplitude = -999;
    #ampQueue = [];
    #smoothedLevels = [];

    #camera;
    #environmentMap;
    #THREE;
    
    constructor(camera, environmentMap, three, scene) {
        this.#camera = camera;
        this.#environmentMap = environmentMap;
        this.#THREE = three;
        this.#setupParticles();
        Object.values(this.#waves).forEach(wave => scene.add(wave));
    }

    // << PUBLIC >>
    get waves() {
        return this.#waves;
    }

    get currentSeparation() {
        return this.#currentSeparation;
    }

    // << used in onLevelsChange() in index.js >> 
    animateParticles(levels, count = 0) {
        if (this.#smoothedLevels.length !== levels.length) {
            for (let i = 0; i < levels.length; i++) {
                this.#smoothedLevels[i] = levels[i];
            }
        }

        const avgAmp = this.getAverageAmplitude();
        const separation = this.#currentSeparation;

        for (const location in this.#waves) {
            const wave = this.#waves[location];
            const locationVectorY = this.#vectors[location].y;

            const positionArray = wave.geometry.attributes.position.array;
            const colorArray = wave.geometry.attributes.color.array;
            const scaleArray = wave.geometry.attributes.scale.array;

            let positionIndex = 0;
            let particleIndex = 0;

            for (let ix = 0; ix < ParticleWave.AMOUNTX; ix++) {
                const freqPosition = ix / (ParticleWave.AMOUNTX - 1);
                const hue = this.#calculateHue(freqPosition);

                const sinX = Math.sin(ix + count);
                for (let iy = 0; iy < ParticleWave.AMOUNTY; iy++) {
                    // prevent large jumps up or down in scale;
                    this.#smoothedLevels[particleIndex] = this.#calculateSmoothedLevel(levels, particleIndex)
                    const smoothedLevel = this.#smoothedLevels[particleIndex];

                    const multiplier = this.#calculateMultiplier(avgAmp, ix, smoothedLevel, separation);
                    positionArray[positionIndex + 1] = this.#calculateYPosition(locationVectorY, multiplier, sinX, iy, count)
                    scaleArray[particleIndex] = this.#calculateScale(multiplier, avgAmp);

                    this.#updateColors(smoothedLevel, hue, colorArray, positionIndex);

                    positionIndex += 3;
                    particleIndex++;
                }
            }

            this.#requireAttrsUpdate(wave)
        }
    }

    // << used in onOutputChange() callback in index.js >> 
    getAverageAmplitude(output) {
        if (this.#ampQueue.length === 0) { return 0; }

        this.#amplitude = this.#calculateSineWaveAmplitude(output)
        this.#updateAmpQueue(this.#amplitude);

        return this.#ampQueue.reduce((a, b) => a + b, 0) / this.#ampQueue.length;
    }

    // << used in onRoomSizeChange() callback in index.js >>
    scaleParticleSeparation(roomSize) {
        const floor = 30;
        const separationScaleFactor = floor + (ParticleWave.SEPARATION * roomSize);

        for (const location in this.#waves) {
            const wave = this.#waves[location];
            this.#setInitialValuesForAttrs(separationScaleFactor, this.#vectors[location], wave);
        }
    }

    // << PRIVATE >>
    #setupParticles() {
        const shaderMaterial = new this.#THREE.ShaderMaterial({
            uniforms: {
                color: { value: new this.#THREE.Color(COLORS.particleColor) },
                size: { value: 1.8 },
                envMap: { value: this.#environmentMap },
                cameraPosition: { value: this.#camera.position }
            },
            vertexShader: document.getElementById('vertexshader').textContent,
            fragmentShader: document.getElementById('fragmentshader').textContent,
            transparent: true,
            blending: this.#THREE.AdditiveBlending,
        });

        const buffGeometryTop = this.#createBufferGeometry(ParticleWave.POSITIONS, ParticleWave.SCALES, ParticleWave.COLORS);
        const buffGeometryBottom = this.#createBufferGeometry(ParticleWave.POSITIONS_BOTTOM, ParticleWave.SCALES, ParticleWave.COLORS);

        this.#waves.top = new this.#THREE.Points(buffGeometryTop, shaderMaterial);
        this.#waves.bottom = new this.#THREE.Points(buffGeometryBottom, shaderMaterial);

        this.#vectors.top = new this.#THREE.Vector3(ParticleWave.WAVE_X_POS, ParticleWave.WAVE_Y_POS, ParticleWave.WAVE_Z_POS);
        this.#vectors.bottom = new this.#THREE.Vector3(ParticleWave.WAVE_X_POS, ParticleWave.WAVE_Y_POS_BOTTOM, ParticleWave.WAVE_Z_POS);

        this.#setInitialValuesForAttrs(ParticleWave.SEPARATION, this.#vectors.top, this.#waves.top);
        this.#setInitialValuesForAttrs(ParticleWave.SEPARATION, this.#vectors.bottom, this.#waves.bottom);

        return this.#waves;
    }

    #createBufferGeometry(positions, scales, colors) {
        const geometry = new this.#THREE.BufferGeometry();
        geometry.setAttribute('position', new this.#THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('scale', new this.#THREE.BufferAttribute(scales, 1));
        geometry.setAttribute('color', new this.#THREE.BufferAttribute(colors, 3));

        return geometry;
    }

    #setInitialValuesForAttrs(separation, wavePosition, wave = waves.top) {
        this.#currentSeparation = separation;
        let i = 0, j = 0;

        for (let ix = 0; ix < ParticleWave.AMOUNTX; ix++) {
            for (let iy = 0; iy < ParticleWave.AMOUNTY; iy++) {
                const positionArray = wave.geometry.attributes.position.array;
                const colorArray = wave.geometry.attributes.color.array;
                const scaleArray = wave.geometry.attributes.scale.array;

                positionArray[i] = wavePosition.x +
                                    ix * this.#currentSeparation - ((ParticleWave.AMOUNTX * this.#currentSeparation) / 2); // x
                positionArray[i + 1] = wavePosition.y; // y
                positionArray[i + 2] = wavePosition.z +
                                        iy * this.#currentSeparation - ((ParticleWave.AMOUNTY * this.#currentSeparation) / 2); // z

                colorArray[i] = 1;
                colorArray[i + 1] = 1;
                colorArray[i + 2] = 1;

                scaleArray[j] = 1;

                i += 3;
                j++;
            }
        }
    }

    // << used in this.getAverageAmplitude() >>
    #updateAmpQueue(newAmp) {
        this.#ampQueue.push(newAmp);
        if (this.#ampQueue.length > ParticleWave.MAX_AMPS) {
            this.#ampQueue.shift();
        }
    }

    #calculateSineWaveAmplitude(output) {
        const convertedOutput = -1 * output;
        const minAmp = 4;
        const maxAmp = 16;
        // as convertedOutput increases, multiplier decreases
        const multiplier = this.#currentSeparation * (1 / convertedOutput);
        const logBase = Math.E;
        this.#amplitude = Utility.getLogScaledValue(minAmp, maxAmp, multiplier, logBase);
        return this.#amplitude
    }

    // << used in this.animateParticles() >>
    #calculateHue(freqPosition) {
        return 0 + (180 * freqPosition);
    }

    #calculateSmoothedLevel(levels, particleIndex) {
        return this.#smoothedLevels[particleIndex] *
            ParticleWave.SMOOTHING_FACTOR +
            levels[particleIndex] * 0.1;
    }

    #calculateMultiplier(avgAmp, ix, smoothedLevel, separation) {
        const floor = ParticleWave.MIN_SCALE_AND_POSITION_FLOOR + avgAmp ** 0.5;
        const linearScale = (ix / ParticleWave.AMOUNTX);
        const levelScale = (smoothedLevel ** (1 / Math.E)) * ParticleWave.SMOOTHING_FACTOR * separation;

        return floor + linearScale + levelScale;
    }

    #calculateYPosition(location, multiplier, sinX, iy, count) {
        const sinY = Math.sin(iy + count);
        return location +
            multiplier * sinX +
            multiplier * sinY
    }

    #calculateScale(multiplier, avgAmp) {
        return multiplier + avgAmp ** 0.5;
    }

    #updateColors(smoothedLevel, hue, colorArray, positionIndex) {
        const lightness = 20 + 40 * smoothedLevel;
        const color = new this.#THREE.Color().setHSL(hue / 360, 1, lightness / 100);
        colorArray[positionIndex] = color.r;
        colorArray[positionIndex + 1] = color.g;
        colorArray[positionIndex + 2] = color.b;
    }

    #requireAttrsUpdate(wave) {
        wave.geometry.attributes.position.needsUpdate = true;
        wave.geometry.attributes.scale.needsUpdate = true;
        wave.geometry.attributes.color.needsUpdate = true;
    }
}