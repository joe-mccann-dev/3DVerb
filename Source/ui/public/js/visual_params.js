import * as Utility from './utility.js';
import { freeze } from './index.js'

export default class VisualParams {
    static minCubeScale = 0.5;
    static maxCubeScale = 1.0;

    static minSphereScale = 0.5;
    static maxSphereScale = 1.5;

    #currentOutput = 0;
    #isLowOutput = false;
    #isLoudOutput = false;
    #currentSize = 0.5;
    #currentMix = 0.5;
    #currentWidth = 0.5;
    #currentDamp = 0.5;

    get currentOutput() { return this.#currentOutput; }
    set currentOutput(newOutput) {
        this.#currentOutput = newOutput;
    }

    calculateOutput(newOutput) {
        // attenuate incoming output if necessary
        // particleWave sine wave too big when passing audio mastered at modern levels
        // inverse nature of output means multiplying output decreases amplitude in setSineWaveAmplitude()
        this.isLoudOutput = newOutput;
        this.isLowOutput = newOutput;

        const reductionFactor = 6;

        const result = this.#isLoudOutput
            ? reductionFactor * newOutput
            : newOutput;

        return result;
    }

    get isLoudOutput() { return this.#isLoudOutput; }
    set isLoudOutput(output) { this.#isLoudOutput = output > -12; }

    get isLowOutput() { return this.#isLowOutput; }
    set isLowOutput(output) { this.#isLowOutput = output <= -50 && !freeze.element.checked }

    get currentSize() { return this.#currentSize }
    set currentSize(newSize) { return this.#currentSize = newSize; }

    get currentMix() { return this.#currentMix; }
    set currentMix(newMix) { return this.#currentMix = newMix; }

    get currentWidth() { return this.#currentWidth; }
    set currentWidth(newWidth) { return this.#currentWidth = newWidth; }

    get currentDamp() { return this.#currentDamp }
    set currentDamp(newDamp) { return this.#currentDamp = newDamp }

    get cubeScale() {
        return Utility.getLinearScaledValue(
            VisualParams.minCubeScale,
            VisualParams.maxCubeScale,
            this.currentSize);
    }

    get sphereScale() {
        const logBase = 10;
        return Utility.getLogScaledValue(
            VisualParams.minSphereScale,
            VisualParams.maxSphereScale,
            this.currentSize,
            logBase);
    }
}