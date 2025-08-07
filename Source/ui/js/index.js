import * as Juce from "./juce/index.js";
import AnimationController from "./animation_controller.js";
import * as COLORS from './colors.js';
import * as Utility from './utility.js';

const data = window.__JUCE__.initialisationData;

//document.getElementById("pluginVendor").textContent = "by " + data.pluginVendor;
////document.getElementById("pluginName").textContent = data.pluginName;
//document.getElementById("pluginVersion").textContent = data.pluginVersion;

let animationController;

const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const envMapDropDown = document.getElementById("envMaps");
const undoRedoCtrl = Juce.getNativeFunction("webUndoRedo");

let roomSizeThrottleHandler, mixThrottleHandler, widthThrottleHandler, dampThrottleHandler,
    freezeThrottleHandler, levelsThrottleHandler, outputThrottleHandler;

let countForParticleWave = 0;

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
    setupDOMEventListeners();
    initThrottleHandlers();
    setupBackendEventListeners();

    animationController = new AnimationController();
    requestAnimationFrame(animationController.animate);
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
                if (animationController.visualParams.currentSize != roomSizeData.roomSize) {
                    roomSizeThrottleHandler(roomSizeData.roomSize);
                }
                animationController.visualParams.currentSize = roomSizeData.roomSize;
            })
            .catch(console.error);
    });

    // MIX EVENT
    window.__JUCE__.backend.addEventListener("mixValue", () => {
        fetch(Juce.getBackendResourceAddress("mix.json"))
            .then((response) => response.json())
            .then((mixData) => {
                if (animationController.visualParams.currentMix != mixData.mix) {
                    mixThrottleHandler(mixData.mix);
                }
                animationController.visualParams.currentMix = mixData.mix;
            })
            .catch(console.error);

    });

    // WIDTH EVENT
    window.__JUCE__.backend.addEventListener("widthValue", () => {
        fetch(Juce.getBackendResourceAddress("width.json"))
            .then((response) => response.json())
            .then((widthData) => {
                if (animationController.visualParams.currentWidth != widthData.width) {
                    widthThrottleHandler(widthData.width);
                }
                animationController.visualParams.currentWidth = widthData.width;
            })
            .catch(console.error);
    });

    // DAMP EVENT
    window.__JUCE__.backend.addEventListener("dampValue", () => {
        fetch(Juce.getBackendResourceAddress("damp.json"))
            .then((response) => response.json())
            .then((dampData) => {
                if (animationController.visualParams.currentDamp != dampData.damp) {
                    dampThrottleHandler(dampData.damp);
                }
                animationController.visualParams.currentDamp = dampData.damp;

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

    animationController.particleWave.animateParticles(levels, countForParticleWave);
}

function onOutputChange(output) {
    animationController.visualParams.currentOutput = output;

    const currentOutput = animationController.visualParams.currentOutput;
    const avgAmplitude = animationController.particleWave.getAverageAmplitude(currentOutput);

    animationController.nebulaSystem.handleOutputChange(avgAmplitude, currentOutput, animationController.surroundingCube);
}

function onRoomSizeChange(roomSizeValue) {
    animationController.visualParams.currentSize = roomSizeValue;

    animationController.particleWave.scaleParticleSeparation(animationController.visualParams.currentSize);

    animationController.scaleSurroundingCube(animationController.visualParams.cubeScale);
    animationController.scaleAnchorSpheresPosition(animationController.visualParams.sphereScale);

    animationController.nebulaSystem.handleRoomSizeChange();
}

function onMixChange(mixValue) {
    animationController.visualParams.currentMix = mixValue;
    const scaleFactor = 10;
    animationController.scaleAnchorSpheres(mixValue, scaleFactor);
}

function onWidthChange(widthValue) {
    animationController.visualParams.currentWidth = widthValue;
    animationController.nebulaSystem.handleWidthChange();
}

function onDampChange(dampValue) {
    animationController.visualParams.currentDamp = dampValue;

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
        ? animationController.freezeAnchorSpheres()
        : animationController.unFreezeAnchorSpheres();
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
    envMapDropDown.addEventListener('change', (event) => {
        console.log("new item selected");
        console.log(envMapDropDown.value);
        const envMapListIndex = envMapDropDown.value;
        const directories = animationController.envMapSubDirectories;
        animationController.changeEnvironmentMap(directories[envMapListIndex]);
    });


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
        animationController.pointLight.intensity = animationController.pointLight.userData.originalIntensity;

        this.checked
            ? animationController.handleBypassChecked()
            : animationController.handleBypassNotChecked();
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
