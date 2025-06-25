import * as Juce from "./juce/index.js";
import * as Animated from "./animated.js";
import * as COLORS from './colors.js';

const data = window.__JUCE__.initialisationData;

document.getElementById("pluginVendor").textContent = "by " + data.pluginVendor;
//document.getElementById("pluginName").textContent = data.pluginName;
document.getElementById("pluginVersion").textContent = data.pluginVersion;

const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const undoRedoCtrl = Juce.getNativeFunction("webUndoRedo");

const freezeColor = new Animated.threeColor(COLORS.freezeColor);
let leftAxis, rightAxis;
let currentWidth;
let currentMix;
let currentSize;
let lifeScale;

let roomSizeThrottleHandler, mixThrottleHandler, widthThrottleHandler, freezeThrottleHandler;
const THROTTLE_TIME = 100;
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
    // ROOM SIZE
    window.__JUCE__.backend.addEventListener("roomSizeValue", () => {
        fetch(Juce.getBackendResourceAddress("roomSize.json"))
            .then((response) => response.json())
            .then((roomSizeData) => {
                if (currentSize != roomSizeData.roomSize) {
                    roomSizeThrottleHandler(roomSizeData.roomSize);
                }
                currentSize = roomSizeData.roomSize;
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

    // OUTPUT LEVEL EVENT
    window.__JUCE__.backend.addEventListener("outputLevel", () => {
        fetch(Juce.getBackendResourceAddress("outputLevel.json"))
            .then((response) => response.json())
            .then((outputLevelData) => {
                const scaleFactor = outputLevelData.left < -30 ? 1 : ((outputLevelData.left / 60) + 1) * 3.0;
                //Animated.spheres[Animated.spheres.length - 1].scale.set(scaleFactor, scaleFactor, scaleFactor);

            })
            .catch(console.error);
    });
}

function onRoomSizeChange(roomSizeValue) {
    const min = 0.50;
    const scale = min + (1 - min) * roomSizeValue;
    Animated.bigSphere.scale.copy(Animated.bigSphere.userData.originalScale);
    Animated.bigSphere.scale.multiplyScalar(scale);


    const minLife = 2.2;
    const maxLife = 4.2;
    lifeScale = minLife + (maxLife - minLife) * roomSizeValue;
    for (let i = 0; i < Animated.nebula.emitters.length / 2; i++) {
        Animated.nebula.emitters[i].setInitializers(Animated.getStandardInitializers(
            {
                life: lifeScale,
                radialVelocity: { axis: leftAxis ?? Animated.leftEmitterRadVelocityAxis() }
            }
        ));
    }
    for (let i = 2; i < Animated.nebula.emitters.length; i++) {
        Animated.nebula.emitters[i].setInitializers(Animated.getStandardInitializers(
            {
                life: lifeScale,
                // prevent from returning to default leftEmitterRadVelocityAxis option
                radialVelocity: { axis: rightAxis ?? Animated.rightEmitterRadVelocityAxis() }
            }
        ));
    }
    // set life here so no jumps in life on width change when room size doesn't change.
    setLife(lifeScale);
}

function onMixChange(mixValue) {
    Animated.spheres.forEach((sphere) => {
        const scale = Animated.sphereRadius + (mixValue * 4);
        sphere.scale.copy(sphere.userData.originalScale);
        sphere.scale.multiplyScalar(scale);
    });
}

function onWidthChange(widthValue) {
    const leftMin = 150;
    const leftMax = -600;
    const rightMin = -150;
    const rightMax = 600;
    // using log for less sensitive scale slider
    const logOfWidthFactor = Math.log(widthValue + 1) / Math.log(5);
    const leftAxisScale = leftMin + (leftMax - leftMin) * logOfWidthFactor;
    const rightAxisScale = rightMin + (rightMax - rightMin) * logOfWidthFactor;
    const lAxis = new Animated.Vector3D(leftAxisScale, 0, 10);
    const rAxis = new Animated.Vector3D(rightAxisScale, 0, 10);
    for (let i = 0; i < Animated.nebula.emitters.length / 2; ++i) {
        Animated.nebula.emitters[i].setInitializers(Animated.getStandardInitializers(
            {
                life: lifeScale,
                radialVelocity: { axis: lAxis }
            }
        ));
    }
    for (let i = 2; i < Animated.nebula.emitters.length; ++i) {
        Animated.nebula.emitters[i].setInitializers(Animated.getStandardInitializers(
            {
                life: lifeScale,
                radialVelocity: { axis: rAxis }
            }
        ));
    }
    setLAxis(lAxis);
    setRAxis(rAxis);
}

function onFreezeChange(frozen) {
    Animated.spheres.forEach((sphere) => {
        frozen ?
            sphere.material.color.copy(freezeColor) :
            sphere.material.color.copy(sphere.userData.color);
    });
}

function setLAxis(axis) {
    leftAxis = axis
}
function setRAxis(axis) {
    rightAxis = axis;
}

function setLife(lScale) {
    lifeScale = lScale;
}

function setUserData() {
    Animated.spheres.forEach((sphere) => {
        if (!sphere.userData.color) {
            sphere.userData.color = sphere.material.color.clone();
        }
    });

    Animated.spheres.forEach((sphere) => {
        sphere.userData.originalScale = sphere.scale.clone();
    });

    Animated.pointLight.userData.originalIntensity = Animated.pointLight.intensity;
    Animated.bigSphere.userData.originalScale = Animated.bigSphere.scale.clone();
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

function initThrottleHandlers() {
    roomSizeThrottleHandler = throttle((roomSizeValue) => {
        onRoomSizeChange(roomSizeValue);
    }, THROTTLE_TIME);

    mixThrottleHandler = throttle((mixValue) => {
        onMixChange(mixValue);
    }, THROTTLE_TIME);

    widthThrottleHandler = throttle((widthValue) => {
        onWidthChange(widthValue);
    }, THROTTLE_TIME);

    // TODO: place here dampThrottleHandler

    freezeThrottleHandler = throttle((frozen) => {
        onFreezeChange(frozen);
    }, THROTTLE_TIME + 100);
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
    if (checked) {
        label.style["color"] = COLORS.freezeColorHash;
        label.style["border"] = `solid 1px ${COLORS.freezeColorHash}`;
    }
    else {
        label.style["color"] = COLORS.lightBlueUI;
        label.style["border"] = "none";
    }
}

export {
    freeze,
    bypassAndMono,
}
