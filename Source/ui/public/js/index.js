import * as Juce from "./juce/index.js";
import * as Animated from "./animated.js";
import * as COLORS from './colors.js';
import * as particleWave from './particle_wave.js'

const data = window.__JUCE__.initialisationData;

//document.getElementById("pluginVendor").textContent = "by " + data.pluginVendor;
////document.getElementById("pluginName").textContent = data.pluginName;
//document.getElementById("pluginVersion").textContent = data.pluginVersion;

const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const undoRedoCtrl = Juce.getNativeFunction("webUndoRedo");

const freezeColor = new Animated.threeColor(COLORS.freezeColor);
let leftAxis, rightAxis;
let currentOutput, currentSize, currentMix, currentWidth, currentDamp;
let lifeScale, speedScale, radiusScale;
let driftScale = {};
let countForParticles = 0;

let roomSizeThrottleHandler, mixThrottleHandler, widthThrottleHandler, dampThrottleHandler,
    freezeThrottleHandler, levelsThrottleHandler, outputThrottleHandler;
// aiming for ~30 FPS. 1000 ms / 30 fps = 33.3333
const THROTTLE_TIME = 33;
const SLOW_THROTTLE_TIME = THROTTLE_TIME * 3;
const DEFAULT_STEP_VALUE = 0.01;

const bypassAndMono = {
    bypass: {
        element: document.getElementById("bypassCheckbox"),
        state: Juce.getToggleState("BYPASS")
    },
    mono: {
        element: document.getElementById("monoCheckbox"),
        state: Juce.getToggleState("MONO")
    },
}

const sliderParams = {
    gain: {
        element: document.getElementById("gainSlider"),
        state: Juce.getSliderState("GAIN"),
        stepValue: DEFAULT_STEP_VALUE,
    },
    roomSize: {
        element: document.getElementById("roomSizeSlider"),
        state: Juce.getSliderState("SIZE"),
        stepValue: DEFAULT_STEP_VALUE,
    },
    mix: {
        element: document.getElementById("mixSlider"),
        state: Juce.getSliderState("MIX"),
        stepValue: DEFAULT_STEP_VALUE,
    },
    width: {
        element: document.getElementById("widthSlider"),
        state: Juce.getSliderState("WIDTH"),
        stepValue: DEFAULT_STEP_VALUE,
    },
    damp: {
        element: document.getElementById("dampSlider"),
        state: Juce.getSliderState("DAMP"),
        stepValue: DEFAULT_STEP_VALUE,
    },
}

const freeze = {
    element: document.getElementById("freezeCheckbox"),
    state: Juce.getSliderState("FREEZE")
}

document.addEventListener("DOMContentLoaded", () => {
    setUserData();
    setupDOMEventListeners();
    initThrottleHandlers();
    setupBackendEventListeners();
});

function setupBackendEventListeners() {
    // OUTPUT LEVEL EVENT
    window.__JUCE__.backend.addEventListener("outputLevel", () => {
        fetch(Juce.getBackendResourceAddress("outputLevel.json"))
            .then((response) => response.json())
            .then((outputLevelData) => {
                //setCurrentOutput(outputLevelData.left);
                outputThrottleHandler(outputLevelData.left);
            })
            .catch(console.error);
    });

    // ROOM SIZE
    window.__JUCE__.backend.addEventListener("roomSizeValue", () => {
        fetch(Juce.getBackendResourceAddress("roomSize.json"))
            .then((response) => response.json())
            .then((roomSizeData) => {
                if (currentSize != roomSizeData.roomSize) {
                    roomSizeThrottleHandler(roomSizeData.roomSize);
                }
                setCurrentSize(roomSizeData.roomSize);
                //currentSize = roomSizeData.roomSize;
            })
            .catch(console.error);
    });

    // MIX EVENT
    window.__JUCE__.backend.addEventListener("mixValue", () => {
        fetch(Juce.getBackendResourceAddress("mix.json"))
            .then((response) => response.json())
            .then((mixData) => {
                if (currentMix != mixData.mix) {
                    mixThrottleHandler(mixData.mix);
                }
                currentMix = mixData.mix;
            })
            .catch(console.error);

    });

    // WIDTH EVENT
    window.__JUCE__.backend.addEventListener("widthValue", () => {
        fetch(Juce.getBackendResourceAddress("width.json"))
            .then((response) => response.json())
            .then((widthData) => {
                if (currentWidth != widthData.width) {
                    widthThrottleHandler(widthData.width);
                }
                currentWidth = widthData.width;
            })
            .catch(console.error);
    });

    // FREEZE EVENT
    window.__JUCE__.backend.addEventListener("isFrozen", () => {
        fetch(Juce.getBackendResourceAddress("freeze.json"))
            .then((response) => response.json())
            .then((freezeData) => {
                freezeThrottleHandler(freezeData.freeze);
            })
            .catch(console.error);
    });

     // LEVELS EVENT (frequency data mapped to level for visualization)
    window.__JUCE__.backend.addEventListener("levels", () => {
        fetch(Juce.getBackendResourceAddress("levels.json"))
            .then((response) => response.json())
            .then((levelsData) => {
                levelsThrottleHandler(levelsData.levels);
            });
    })
}

function onLevelsChange(levels) {
    // send updated magnitudes to particle animation function
    particleWave.animateParticles(levels.slice(1, levels.length), countForParticles += 0.1);
    
}

function onOutputChange(output) {

    setCurrentOutput(output);

    const isOutputBelowThreshold = !freeze.element.checked && getCurrentOutput() <= -50;
    const isLoudOutput = getCurrentOutput() > -12;
    

    // sine wave too big when passing audio mastered at modern levels
    // inverse nature of output means multiplying output decreases amplitude in setSineWaveAmplitude()
    if (isLoudOutput) { output = output * 6 }

    particleWave.setSineWaveAmplitude(output);
    let amplitude = particleWave.getAmplitude();
    particleWave.updateAmpQueue(amplitude);
    amplitude = particleWave.getAverageAmplitude();

    const minSpeed = 35;
    const maxSpeed = 70;
    let speedMultiplier = amplitude;
    
    const minLife = 1.5;
    const maxLife = 4.5;
    const rmSize = getCurrentSize();
    let lifeMultiplier = getLogScaledValue(minLife, maxLife, rmSize, 12);

    if (isOutputBelowThreshold) {
        setLifeScale(0.2); 
        setSpeedScale(0.2);
    } else {
        setLifeScale(getLinearScaledValue(minLife, maxLife, lifeMultiplier));
        setSpeedScale(getLinearScaledValue(minSpeed, maxSpeed, speedMultiplier));
    }

    Animated.nebula.emitters.forEach((emitter, emitterIndex) => {
        emitter.damping = (
            output > currentOutput
                ? Animated.DEFAULT_EMITTER_DAMPING
                : Animated.DEFAULT_EMITTER_DAMPING * 10
        );

        emitter.setInitializers(Animated.getStandardInitializers({
            life: lifeScale,
            radialVelocity: {
                axis: emitterIndex < 2
                    ? (leftAxis ?? Animated.leftEmitterRadVelocityAxis())
                    : (rightAxis ?? Animated.rightEmitterRadVelocityAxis()),
                speed: speedScale,
            },
            radius: radiusScale,
        }
        ));

        const baseForceFloor = 2;
        const baseForceCeiling = 12;
        const baseForce = getLogScaledValue(baseForceFloor, baseForceCeiling, speedScale, 10);
        const forceZ = baseForce
        const forceY = baseForce * 0.4;
        const forceX = emitterIndex < 2 ? -1 * (baseForce * 0.5) : (baseForce * 0.5);
        const colors = COLORS.spriteColors;
        const colorSpan = new Animated.ColorSpan(colors);
        emitter.setBehaviours(Animated.getStandardBehaviours(
            {
                force: { fx: forceX, fy: forceY, fz: forceZ },
                color: { colorA: colorSpan, colorB: colorSpan },
                randomDrift: {
                    driftX: driftScale.x,
                    driftY: driftScale.y,
                    driftZ: driftScale.z,
                }

                //collision: { onCollide: Animated.collideFunction(emitter)}
            }
        ));

        Animated.collideFunction(emitter);
    });
}

function onRoomSizeChange(roomSizeValue) {
    setCurrentSize(roomSizeValue);

    const floor = 20;
    const separationScaleFactor = floor + (particleWave.SEPARATION * roomSizeValue);

    for (const location in particleWave.waves) {
        const wave = particleWave.waves[location];
        particleWave.setInitialValuesForAttrs(separationScaleFactor, particleWave.vectors[location], wave);
    }

    const minRadius = 24;
    const maxRadius = 80;
    const radScale = getLinearScaledValue(minRadius, maxRadius, roomSizeValue);
    setRadiusScale(radScale)

    const min = 0.50;
    const max = 1.0;
    const cubeScale = getLinearScaledValue(min, max, roomSizeValue);

    const sphereMin = 0.5;
    const sphereMax = 1.5;
    const sphereScale = getLogScaledValue(sphereMin, sphereMax, roomSizeValue, 2);

    scaleSurroundingCube(cubeScale);
    scaleAnchorSpheresPosition(sphereScale);

    const minDriftX = 30;
    const maxDriftX = 100;
    const driftXScale = getLinearScaledValue(minDriftX, maxDriftX, roomSizeValue);

    const minDriftY = 50;
    const maxDriftY = 150;
    const driftYScale = getLinearScaledValue(minDriftY, maxDriftY, roomSizeValue);

    const minDriftZ = 50;
    const maxDriftZ = 200;
    const driftZScale = getLinearScaledValue(minDriftZ, maxDriftZ, roomSizeValue);

    setDriftScale(driftXScale, driftYScale, driftZScale);
   
    Animated.nebula.emitters.forEach((emitter, emitterIndex) => {
        emitter.setInitializers(Animated.getStandardInitializers(
            {
                life: lifeScale,
                radialVelocity: {
                    axis: emitterIndex < 2
                        ? (leftAxis ?? Animated.leftEmitterRadVelocityAxis())
                        : (rightAxis ?? Animated.rightEmitterRadVelocityAxis()),
                    speed: speedScale,
                },
                radius: radiusScale,
            }
        ));

        emitter.setBehaviours(Animated.getStandardBehaviours(
            {
                randomDrift: {
                    driftX: driftScale.x,
                    driftY: driftScale.y,
                    driftZ: driftScale.z,
                }
            }
        ));
    });    
}

function onMixChange(mixValue) {
    const scaleFactor = 4;
    scaleAnchorSpheres(mixValue, scaleFactor);
}

function onWidthChange(widthValue) {
    const leftMin = 150;
    const leftMax = -600;
    const rightMin = -150;
    const rightMax = 600;

    // using log for less sensitive scale slider
    const leftAxisScale = getLogScaledValue(leftMin, leftMax, widthValue, 8);
    const rightAxisScale = getLogScaledValue(rightMin, rightMax, widthValue, 8);

    setLeftAxis(new Animated.Vector3D(leftAxisScale, 0, 10));
    setRightAxis(new Animated.Vector3D(rightAxisScale, 0, 10));

    Animated.nebula.emitters.forEach((emitter, emitterIndex) => {
        emitter.setInitializers(Animated.getStandardInitializers(
            {
                life: lifeScale,
                radialVelocity: {
                    axis: emitterIndex < 2
                        ? (leftAxis ?? Animated.leftEmitterRadVelocityAxis())
                        : (rightAxis ?? Animated.rightEmitterRadVelocityAxis()),
                    speed: speedScale,
                },
                radius: radiusScale,
            }
        ));
    });
}

function setLeftAxis(axis) { leftAxis = axis }
function setRightAxis(axis) { rightAxis = axis; }

function setLifeScale(lScale) { lifeScale = lScale; }

function setSpeedScale(spScale) { speedScale = spScale; }

function setDriftScale(driftX, driftY, driftZ) {
    driftScale.x = driftX;
    driftScale.y = driftY;
    driftScale.z = driftZ;
}

function setRadiusScale(radScale) {
    radiusScale = radScale;
}

function onFreezeChange(frozen) {
    freezeAnchorSpheres(frozen);
}


function setCurrentOutput(outputLevel) {
    currentOutput = outputLevel;
}

function getCurrentOutput() {
    return currentOutput;
}

function setCurrentSize(rmSize) {
    currentSize = rmSize;
}

function getCurrentSize() {
    return currentSize;
}

function getLinearScaledValue(minValue, maxValue, paramValue) {
    return minValue + (maxValue - minValue) * paramValue;
}

function getLogScaledValue(minValue, maxValue, paramValue, logBase) {
    const logScale = Math.log(paramValue + 1) / Math.log(logBase);
    return minValue + (maxValue - minValue) * logScale;
}

function scaleSurroundingCube(scale) {
    Animated.surroundingCube.scale.copy(Animated.surroundingCube.userData.originalScale);
    Animated.surroundingCube.position.copy(Animated.surroundingCube.userData.originalPosition);

    Animated.surroundingCube.scale.multiplyScalar(scale);
    Animated.surroundingCube.userData.scale = Animated.surroundingCube.scale;

    Animated.surroundingCube.position.multiplyScalar(scale);
    Animated.surroundingCube.userData.position = Animated.surroundingCube.position;
}

function scaleAnchorSpheres(mixValue, scaleFactor) {
    Animated.spheres.forEach((sphere) => {
        const sphereSize = Animated.sphereRadius + (mixValue * scaleFactor);
        sphere.scale.copy(sphere.userData.originalScale);
        sphere.scale.multiplyScalar(sphereSize);
    });
}

function scaleAnchorSpheresPosition(scale) {
    Animated.spheres.forEach((sphere) => {
        sphere.position.copy(sphere.userData.originalPosition);
        sphere.position.set(scale * sphere.position.x, sphere.position.y, scale * sphere.position.z);
    });
}

function freezeAnchorSpheres(frozen) {
    Animated.spheres.forEach((sphere) => {
        frozen ?
            sphere.material.color.copy(freezeColor) :
            sphere.material.color.copy(sphere.userData.color);
    });
}

function setUserData() {
    Animated.spheres.forEach((sphere) => {
        if (!sphere.userData.color) {
            sphere.userData.color = sphere.material.color.clone();
        }

        sphere.userData.originalScale = sphere.scale.clone();
        sphere.userData.originalPosition = sphere.position.clone();
    });

    Animated.nebula.emitters.forEach((emitter) => {
        emitter.userData = {};
        emitter.userData.collidedParticles = [];

    })

    Animated.pointLight.userData.originalIntensity = Animated.pointLight.intensity;
    Animated.surroundingCube.userData.originalScale = Animated.surroundingCube.scale.clone();
    Animated.surroundingCube.userData.originalPosition = Animated.surroundingCube.position.clone();
}

//https://www.freecodecamp.org/news/throttling-in-javascript/
function throttle(func, delay) {
    let timeout = null;
    return (...args) => {
        if (!timeout) {
            func(...args);
            timeout = setTimeout(() => {
                timeout = null;
            }, delay);
        }
    }
}

function debounce(func, timeout = THROTTLE_TIME) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

function initThrottleHandlers() {
    roomSizeThrottleHandler = debounce((roomSizeValue) => {
        onRoomSizeChange(roomSizeValue);
    }, 10);

    mixThrottleHandler = throttle((mixValue) => {
        onMixChange(mixValue);
    }, SLOW_THROTTLE_TIME);

    widthThrottleHandler = throttle((widthValue) => {
        onWidthChange(widthValue);
    }, SLOW_THROTTLE_TIME);

    // TODO: place here dampThrottleHandler

    freezeThrottleHandler = throttle((frozen) => {
        onFreezeChange(frozen);
    }, SLOW_THROTTLE_TIME);

    levelsThrottleHandler = throttle((levels) => {
        onLevelsChange(levels);
    }, THROTTLE_TIME);
    outputThrottleHandler = throttle((output) => {
        onOutputChange(output);
    }, THROTTLE_TIME);
}

function setupDOMEventListeners() {
    document.addEventListener('keydown', (event) => {
        // calls PluginEditor::webUndoRedo()
        if (event.ctrlKey && event.key === 'y') {
            undoRedoCtrl('Y').then((result) => {
                console.log(result);
            });
        }
        else if (event.ctrlKey && event.key === 'z') {
            undoRedoCtrl('Z').then((result) => {
                console.log(result);
            });
        }
    });
    // UNDO-REDO
    undoButton.addEventListener("click", () => {
        window.__JUCE__.backend.emitEvent("undoRequest", null);
    });
    redoButton.addEventListener("click", () => {
        window.__JUCE__.backend.emitEvent("redoRequest", null);
    })
    // BYPASS
    bypassAndMono.bypass.element.oninput = function () {
        bypassAndMono.bypass.state.setValue(this.checked);
        Animated.pointLight.intensity = Animated.pointLight.userData.originalIntensity;
    }
    bypassAndMono.bypass.state.valueChangedEvent.addListener(() => {
        bypassAndMono.bypass.element.checked = bypassToggleState.getValue();
    })

    // MONO
    bypassAndMono.mono.element.oninput = function () {
        bypassAndMono.mono.state.setValue(this.checked);
    }
    bypassAndMono.mono.state.valueChangedEvent.addListener(() => {
        bypassAndMono.mono.element.checked = bypassAndMono.mono.state.getValue();
    });

    for (const param of Object.values(sliderParams)) {
        updateSliderDOMObjectAndSliderState(param.element, param.state, param.stepValue);
    }
    // FREEZE
    // toggle cpp backend float value based on html checked value
    // value > 0.5 == freeze mode; value < 0.5 == normal mode
    freezeCheckbox.oninput = function () {
        freeze.state.setNormalisedValue(this.checked ? 1.0 : 0.0);
    };
    // box is checked if backend value is greater than or equal to 0.5
    freeze.state.valueChangedEvent.addListener(() => {
        freeze.element.checked = freeze.state.getNormalisedValue() >= 0.5;
        const label = document.getElementById("freezeLabel");
        setFreezeLabelColor(freeze.element.checked, label);
    });
}

function updateSliderDOMObjectAndSliderState(sliderDOMObject, sliderState, stepValue) {
    sliderDOMObject.min = sliderState.properties.start;
    sliderDOMObject.max = sliderState.properties.end;
    sliderDOMObject.step = stepValue;

    sliderDOMObject.oninput = function () {
        sliderState.setNormalisedValue(this.value);
        updateValueElement(sliderDOMObject, this.value);
    };

    sliderState.valueChangedEvent.addListener(() => {
        sliderDOMObject.value = sliderState.getScaledValue();
        updateValueElement(sliderDOMObject, sliderDOMObject.value);
    });
}

function updateValueElement(sliderDOMObject, value) {
    const valueElementID = sliderDOMObject.id + "Value";
    const valueElement = document.getElementById(valueElementID);
    valueElement.textContent = value;
}

function setFreezeLabelColor(checked, label) {
    label.style["color"] = checked ? COLORS.roomFrameColorUI : COLORS.skyBlue;
}

export {
    freeze,
    bypassAndMono,
    getLinearScaledValue,
    getLogScaledValue,
    throttle,
}
