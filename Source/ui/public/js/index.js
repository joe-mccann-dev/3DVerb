import * as Juce from "./juce/index.js";
import * as Animated from "./animated.js";
import * as COLORS from './colors.js';
//import ParticleWave from './particle_wave.js'
import * as Utility from './utility.js';

const data = window.__JUCE__.initialisationData;

//document.getElementById("pluginVendor").textContent = "by " + data.pluginVendor;
////document.getElementById("pluginName").textContent = data.pluginName;
//document.getElementById("pluginVersion").textContent = data.pluginVersion;

const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const undoRedoCtrl = Juce.getNativeFunction("webUndoRedo");

let countForParticleWave = 0;

let roomSizeThrottleHandler, mixThrottleHandler, widthThrottleHandler, dampThrottleHandler,
    freezeThrottleHandler, levelsThrottleHandler, outputThrottleHandler;

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
        stepValue: Utility.DEFAULT_STEP_VALUE,
    },
    roomSize: {
        element: document.getElementById("roomSizeSlider"),
        state: Juce.getSliderState("SIZE"),
        stepValue: Utility.DEFAULT_STEP_VALUE,
    },
    mix: {
        element: document.getElementById("mixSlider"),
        state: Juce.getSliderState("MIX"),
        stepValue: Utility.DEFAULT_STEP_VALUE,
    },
    width: {
        element: document.getElementById("widthSlider"),
        state: Juce.getSliderState("WIDTH"),
        stepValue: Utility.DEFAULT_STEP_VALUE,
    },
    damp: {
        element: document.getElementById("dampSlider"),
        state: Juce.getSliderState("DAMP"),
        stepValue: Utility.DEFAULT_STEP_VALUE,
    },
}

const freeze = {
    element: document.getElementById("freezeCheckbox"),
    state: Juce.getSliderState("FREEZE")
}

document.addEventListener("DOMContentLoaded", () => {
    Animated.setUserData();
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
                if (Animated.visualParams.currentSize != roomSizeData.roomSize) {
                    roomSizeThrottleHandler(roomSizeData.roomSize);
                }
                Animated.visualParams.currentSize = roomSizeData.roomSize;
            })
            .catch(console.error);
    });

    // MIX EVENT
    window.__JUCE__.backend.addEventListener("mixValue", () => {
        fetch(Juce.getBackendResourceAddress("mix.json"))
            .then((response) => response.json())
            .then((mixData) => {
                if (Animated.visualParams.currentMix != mixData.mix) {
                    mixThrottleHandler(mixData.mix);
                }
                Animated.visualParams.currentMix = mixData.mix;
            })
            .catch(console.error);

    });

    // WIDTH EVENT
    window.__JUCE__.backend.addEventListener("widthValue", () => {
        fetch(Juce.getBackendResourceAddress("width.json"))
            .then((response) => response.json())
            .then((widthData) => {
                if (Animated.visualParams.currentWidth != widthData.width) {
                    widthThrottleHandler(widthData.width);
                }
                Animated.visualParams.currentWidth = widthData.width;
            })
            .catch(console.error);
    });

    // DAMP EVENT
    window.__JUCE__.backend.addEventListener("dampValue", () => {
        fetch(Juce.getBackendResourceAddress("damp.json"))
            .then((response) => response.json())
            .then((dampData) => {
                if (Animated.visualParams.currentDamp != dampData.damp) {
                    dampThrottleHandler(dampData.damp);
                }
                Animated.visualParams.currentDamp = dampData.damp;

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
    if (bypassAndMono.bypass.element.checked) { return; }

    const maxLevel = Math.max(0, ...levels)
    const minOscillation = 0.1;
    const reductionExp = 1.67;
    const clampedLevel = Math.min(Math.max(maxLevel, 0), 1);
    countForParticleWave += minOscillation + Math.pow(clampedLevel, reductionExp);

    Animated.particleWave.animateParticles(levels, countForParticleWave);
}

function onOutputChange(output) {
    Animated.visualParams.currentOutput = output;

    const currentOutput = Animated.visualParams.currentOutput;
    const avgAmplitude = Animated.particleWave.getAverageAmplitude(currentOutput);

    Animated.nebulaSystem.handleOutputChange(avgAmplitude, currentOutput);
}

function onRoomSizeChange(roomSizeValue) {
    Animated.visualParams.currentSize = roomSizeValue;

    Animated.particleWave.scaleParticleSeparation(Animated.visualParams.currentSize);

    Animated.scaleSurroundingCube(Animated.visualParams.cubeScale);
    Animated.scaleAnchorSpheresPosition(Animated.visualParams.sphereScale);

    Animated.nebulaSystem.handleRoomSizeChange();
}

function onMixChange(mixValue) {
    Animated.visualParams.currentMix = mixValue;
    const scaleFactor = 4;
    Animated.scaleAnchorSpheres(mixValue, scaleFactor);
}

function onWidthChange(widthValue) {
    Animated.visualParams.currentWidth = widthValue;
    Animated.nebulaSystem.handleWidthChange();
}

function onDampChange(dampValue) {
    Animated.visualParams.currentDamp = dampValue;

    const minScale = 0.5;
    const maxScale = 1;
    //higher damping equals smaller scale;
    const inverseDamping = 1 - dampValue;
    //const dampingScale = getLinearScaledValue(minScale, maxScale, inverseDamping);

    //const scaleA = maxScale * dampingScale;
    //const scaleB = minScale * dampingScale;
}

function onFreezeChange(frozen) {
    frozen
        ? Animated.freezeAnchorSpheres()
        : Animated.unFreezeAnchorSpheres();
}

function initThrottleHandlers() {
    roomSizeThrottleHandler = Utility.debounce((roomSizeValue) => {
        onRoomSizeChange(roomSizeValue);
    }, 10);

    mixThrottleHandler = Utility.throttle((mixValue) => {
        onMixChange(mixValue);
    }, Utility.SLOW_THROTTLE_TIME);

    widthThrottleHandler = Utility.throttle((widthValue) => {
        onWidthChange(widthValue);
    }, Utility.SLOW_THROTTLE_TIME);

    dampThrottleHandler = Utility.throttle((dampValue) => {
        onDampChange(dampValue);
    }, Utility.SLOW_THROTTLE_TIME)

    freezeThrottleHandler = Utility.throttle((frozen) => {
        onFreezeChange(frozen);
    }, Utility.SLOW_THROTTLE_TIME);

    levelsThrottleHandler = Utility.throttle((levels) => {
        onLevelsChange(levels);
    }, Utility.THROTTLE_TIME);
    outputThrottleHandler = Utility.throttle((output) => {
        onOutputChange(output);
    }, Utility.THROTTLE_TIME);
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

        this.checked
            ? Animated.handleBypassChecked()
            : Animated.handleBypassNotChecked();
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
}
