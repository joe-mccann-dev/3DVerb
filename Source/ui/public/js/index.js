import * as Juce from "./juce/index.js";
import * as Animated from "./animated.js";

const data = window.__JUCE__.initialisationData;

document.getElementById("pluginVendor").textContent = "by " + data.pluginVendor;
//document.getElementById("pluginName").textContent = data.pluginName;
document.getElementById("pluginVersion").textContent = data.pluginVersion;

const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const bypassCheckbox = document.getElementById("bypassCheckbox");
const bypassToggleState = Juce.getToggleState("BYPASS");

const monoCheckbox = document.getElementById("monoCheckbox");
const monoToggleState = Juce.getToggleState("MONO");

const gainSlider = document.getElementById("gainSlider");
const gainSliderState = Juce.getSliderState("GAIN");

const roomSizeSlider = document.getElementById("roomSizeSlider");
const roomSizeSliderState = Juce.getSliderState("SIZE");

const mixSlider = document.getElementById("mixSlider");
const mixSliderState = Juce.getSliderState("MIX");

const widthSlider = document.getElementById("widthSlider");
const widthSliderState = Juce.getSliderState("WIDTH");

const dampSlider = document.getElementById("dampSlider");
const dampSliderState = Juce.getSliderState("DAMP");

const freezeCheckbox = document.getElementById("freezeCheckbox");
const freezeToggleState = Juce.getSliderState("FREEZE");

const undoRedoCtrl = Juce.getNativeFunction("webUndoRedo");

document.addEventListener("DOMContentLoaded", () => {
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
    bypassCheckbox.oninput = function () {
        bypassToggleState.setValue(this.checked);
        Animated.pointLight.intensity = Animated.pointLight.userData.originalIntensity;
    }

    bypassToggleState.valueChangedEvent.addListener(() => {
        bypassCheckbox.checked = bypassToggleState.getValue();
    });

    // MONO
    monoCheckbox.oninput = function () {
        monoToggleState.setValue(this.checked);
    }

    monoToggleState.valueChangedEvent.addListener(() => {
        monoCheckbox.checked = monoToggleState.getValue();
    });

    // GAIN
    const gainSliderStepValue = 0.01;
    updateSliderDOMObjectAndSliderState(gainSlider, gainSliderState, gainSliderStepValue);

    // ROOM SIZE
    const roomSizeSliderStepValue = 0.01;
    updateSliderDOMObjectAndSliderState(roomSizeSlider, roomSizeSliderState, roomSizeSliderStepValue);

    // MIX
    const mixSliderStepValue = 0.01;
    updateSliderDOMObjectAndSliderState(mixSlider, mixSliderState, mixSliderStepValue);

    // WIDTH
    const widthSliderStepValue = 0.01;
    updateSliderDOMObjectAndSliderState(widthSlider, widthSliderState, widthSliderStepValue);

    const dampSliderStepValue = 0.01;
    updateSliderDOMObjectAndSliderState(dampSlider, dampSliderState, dampSliderStepValue);

    // FREEZE
    // toggle cpp backend float value based on html checked value
    // value > 0.5 == freeze mode; value < 0.5 == normal mode
    freezeCheckbox.oninput = function () {
        freezeToggleState.setNormalisedValue(this.checked ? 1.0 : 0.0);
    };
    // box is checked if backend value is greater than or equal to 0.5
    freezeToggleState.valueChangedEvent.addListener(() => {
        freezeCheckbox.checked = freezeToggleState.getNormalisedValue() >= 0.5;
        const label = document.getElementById("freezeLabel");
        label.style["color"] = freezeCheckbox.checked ? "#60A5FA" : "#BFDBFE";
        label.style["border"] = freezeCheckbox.checked ? "solid 1px #60A5FA" : "none";
        if (freezeCheckbox.checked) {
            label.style["color"] = "#60A5FA";
            label.style["border"] = "solid 1px #60A5FA";
        }
        else {
            label.style["color"] = "#BFDBFE";
            label.style["border"] = "none";
        }
    });

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

    Animated.spheres.forEach((sphere) => {
        sphere.userData.originalScale = sphere.scale.clone();
    });
    const mixThrottleHandler = throttle((mixValue) => {
        onMixChange(mixValue);
    }, 100);

    function onMixChange(mixValue) {
        Animated.spheres.forEach((sphere) => {
            const scale = Animated.sphereRadius + (mixValue * 4);
            sphere.scale.copy(sphere.userData.originalScale);
            sphere.scale.multiplyScalar(scale);
        });
    }

    const widthThrottleHandler = throttle((widthValue) => {
        onWidthChange(widthValue);
    }, 100);

    let leftAxis;
    let rightAxis;
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
            console.log("leftAxisScale: ", leftAxisScale);
            console.log("rightAxisScale: ", rightAxisScale);
            
            Animated.nebula.emitters[i].setInitializers(Animated.getStandardInitializers(
                {
                    life: lifeScale,
                    radialVelocity: { axis:  lAxis }
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

    const roomSizeThrottleHandler = throttle((roomSizeValue) => {
        onRoomSizeChange(roomSizeValue);
    }, 100);

    let lifeScale;
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
                    radialVelocity: { axis: leftAxis ?? Animated.leftEmitterRadVelocityAxis()}
                }
            ));
        }
        for (let i = 2; i < Animated.nebula.emitters.length; i++) {
            Animated.nebula.emitters[i].setInitializers(Animated.getStandardInitializers(
                {
                    life: lifeScale,
                    // prevent from returning to default leftEmitterRadVelocityAxis option
                    radialVelocity: { axis: rightAxis ?? Animated.rightEmitterRadVelocityAxis()}
                }
            ));
        }
        // set life here so no jumps in life on width change when room size doesn't change.
        setLife(lifeScale);
    }

    const freezeColor = new Animated.threeColor(Animated.freezeColor);
    const freezeThrottleHandler = throttle((frozen) => {
        onFreezeChange(frozen);
    }, 200);

    function onFreezeChange(frozen) {
        Animated.spheres.forEach((sphere) => {
            if (frozen) {
                sphere.material.color.copy(freezeColor);
            } else {
                sphere.material.color.copy(sphere.userData.color);
            }
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

    // FREEZE EVENT
    Animated.spheres.forEach((sphere) => {
        if (!sphere.userData.color) {
            sphere.userData.color = sphere.material.color.clone();
        }
    });
    window.__JUCE__.backend.addEventListener("isFrozen", () => {
        fetch(Juce.getBackendResourceAddress("freeze.json"))
            .then((response) => response.json())
            .then((freezeData) => {
                freezeThrottleHandler(freezeData.freeze);
            })
            .catch(console.error);
    });

    // MIX EVENT
    let currentMix;
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
    let currentWidth;
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

    Animated.pointLight.userData.originalIntensity = Animated.pointLight.intensity;
    Animated.bigSphere.userData.originalScale = Animated.bigSphere.scale.clone();

    // ROOM SIZE
    let currentSize;
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

    requestAnimationFrame(Animated.animate);
});

export {
    freezeCheckbox,
    bypassCheckbox,
}
