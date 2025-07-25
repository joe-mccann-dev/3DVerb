import * as Juce from "./juce/index.js";
import * as Animated from "./animated.js";
import * as COLORS from './colors.js';
import * as particleWave from './particle_wave.js'
import VisualParams from './visual_params.js'
import NebulaParams from './nebula_params.js'


const data = window.__JUCE__.initialisationData;

//document.getElementById("pluginVendor").textContent = "by " + data.pluginVendor;
////document.getElementById("pluginName").textContent = data.pluginName;
//document.getElementById("pluginVersion").textContent = data.pluginVersion;

const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const undoRedoCtrl = Juce.getNativeFunction("webUndoRedo");

const freezeColor = new Animated.threeColor(COLORS.freezeColor);

const visualParams = new VisualParams();
const nebulaParams = new NebulaParams(visualParams);

let countForParticleWave = 0;

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
                outputThrottleHandler(outputLevelData.left);
            })
            .catch(console.error);
    });

    // ROOM SIZE
    window.__JUCE__.backend.addEventListener("roomSizeValue", () => {
        fetch(Juce.getBackendResourceAddress("roomSize.json"))
            .then((response) => response.json())
            .then((roomSizeData) => {
                if (visualParams.currentSize != roomSizeData.roomSize) {
                    roomSizeThrottleHandler(roomSizeData.roomSize);
                }
                visualParams.currentSize = roomSizeData.roomSize;
            })
            .catch(console.error);
    });

    // MIX EVENT
    window.__JUCE__.backend.addEventListener("mixValue", () => {
        fetch(Juce.getBackendResourceAddress("mix.json"))
            .then((response) => response.json())
            .then((mixData) => {
                if (visualParams.currentMix != mixData.mix) {
                    mixThrottleHandler(mixData.mix);
                }
                visualParams.currentMix = mixData.mix;
            })
            .catch(console.error);

    });

    // WIDTH EVENT
    window.__JUCE__.backend.addEventListener("widthValue", () => {
        fetch(Juce.getBackendResourceAddress("width.json"))
            .then((response) => response.json())
            .then((widthData) => {
                if (visualParams.currentWidth != widthData.width) {
                    widthThrottleHandler(widthData.width);
                }
                visualParams.currentWidth = widthData.width;
            })
            .catch(console.error);
    });

    // DAMP EVENT
    window.__JUCE__.backend.addEventListener("dampValue", () => {
        fetch(Juce.getBackendResourceAddress("damp.json"))
            .then((response) => response.json())
            .then((dampData) => {
                if (visualParams.currentDamp != dampData.damp) {
                    dampThrottleHandler(dampData.damp);
                }
                visualParams.currentDamp = dampData.damp;

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
    particleWave.animateParticles(levels.slice(1, levels.length), countForParticleWave += 0.1);
}

function onOutputChange(output) {
    visualParams.currentOutput = visualParams.calculateOutput(output);
    
    particleWave.setSineWaveAmplitude(visualParams.currentOutput);
    let amplitude = particleWave.getAmplitude();
    particleWave.updateAmpQueue(amplitude);

    amplitude = particleWave.getAverageAmplitude();

    nebulaParams.speedScale = nebulaParams.calculateSpeedScale(amplitude);
    nebulaParams.lifeScale = nebulaParams.calculateLifeScale();

    // TODO: Move this to a method in Animated.js
    Animated.nebula.emitters.forEach((emitter, emitterIndex) => {
        const lifeInitializer = emitter.initializers.find(initializer => initializer.type === 'Life');
        lifeInitializer.lifePan = new Animated.Span(nebulaParams.lifeScale);

        const radialVelocity = emitter.initializers.find(initializer => initializer.type === 'RadialVelocity');
        radialVelocity.radiusPan = new Animated.Span(nebulaParams.speedScale);
        
        emitter.behaviours = emitter.behaviours.filter(b => b.type !== 'Force');
        const forceValues = nebulaParams.forceValues(emitterIndex);
        const newForce = new Animated.Force(
            forceValues.x,
            forceValues.y,
            forceValues.z
        );
        emitter.behaviours.push(newForce);

        Animated.collideFunction(emitter);
    });
}

function onRoomSizeChange(roomSizeValue) {

    visualParams.currentSize = roomSizeValue;

    Animated.resetParticles();

    // TODO: refactor into particle wave own method
    const floor = 20;
    const separationScaleFactor = floor + (particleWave.SEPARATION * roomSizeValue);

    for (const location in particleWave.waves) {
        const wave = particleWave.waves[location];
        particleWave.setInitialValuesForAttrs(separationScaleFactor, particleWave.vectors[location], wave);
    }

    scaleSurroundingCube(visualParams.cubeScale);
    scaleAnchorSpheresPosition(visualParams.sphereScale);

    nebulaParams.radiusScale = nebulaParams.calculateRadius();

    Animated.nebula.emitters.forEach((emitter) => {
        emitter.initializers = emitter.initializers.filter((initializer) => initializer.type !== 'Radius');
        const newRadiusInitializer = new Animated.Radius(nebulaParams.radiusScale);
        emitter.initializers.push(newRadiusInitializer);

        emitter.behaviours = emitter.behaviours.filter(b => b.type !== 'RandomDrift');
        const driftValues = nebulaParams.driftValues;
        const newRandomDriftBehaviour = new Animated.RandomDrift(
            driftValues.x,
            driftValues.y,
            driftValues.z,
            0.2, // drift delay
            3, // life
            Animated.ease.easeOutSine);

        emitter.behaviours.push(newRandomDriftBehaviour);
    });
}

function onMixChange(mixValue) {
    visualParams.currentMix = mixValue;
    const scaleFactor = 4;
    scaleAnchorSpheres(mixValue, scaleFactor);
}

function onWidthChange(widthValue) {
    visualParams.currentWidth = widthValue;

    Animated.nebula.emitters.forEach((emitter, emitterIndex) => {
        emitter.initializers = emitter.initializers.filter(initializer => initializer.type !== 'RadialVelocity');
        //let axis;
        //if (emitterIndex < 2) {
        //    axis = nebulaParams.calculateLeftAxisVector();
        //    nebulaParams.leftAxis = axis;
        //} else {
        //    axis = nebulaParams.calculateRightAxisVector();
        //    nebulaParams.rightAxis = axis;
        //}

        const axis = nebulaParams.calculateLeftOrRightAxisVector(emitterIndex);

        const newRadialVelocity = new Animated.RadialVelocity(nebulaParams.speedScale, axis, NebulaParams.velocityTheta);
        emitter.initializers.push(newRadialVelocity);
    });

}

function onDampChange(dampValue) {
    visualParams.currentDamp = dampValue;

    const minScale = 0.5;
    const maxScale = 1;
    //higher damping equals smaller scale;
    const inverseDamping = 1 - dampValue;
    const dampingScale = getLinearScaledValue(minScale, maxScale, inverseDamping);

    const scaleA = maxScale * dampingScale;
    const scaleB = minScale * dampingScale;
}

function onFreezeChange(frozen) {
    freezeAnchorSpheres(frozen);
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
    const currentSeparation = particleWave.getCurrentSeparation();
    Animated.spheres.forEach((sphere, index) => {

        sphere.position.copy(sphere.userData.originalPosition);

        const minX = 10 * particleWave.getCurrentSeparation();
        const maxX = 15 * particleWave.getCurrentSeparation();
        const xOffset = getLogScaledValue(minX, maxX, scale, Math.E);
        const sphereXOffset = index < 4 ? -xOffset : xOffset;

        const zOffset = currentSeparation;
        const sphereZOffset = sphere.position.z < 0 ? -zOffset : zOffset;

        const sphereXScale = scale * (sphere.position.x + sphereXOffset);
        const sphereZScale = scale * (sphere.position.z + sphereZOffset);

        sphere.position.set(sphereXScale, sphere.position.y, sphereZScale);
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
    dampThrottleHandler = throttle((dampValue) => {
        onDampChange(dampValue);
    }, SLOW_THROTTLE_TIME)

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
