import * as Juce from "./juce/index.js";
import * as Animated from "./animated.js";

window.__JUCE__.backend.addEventListener(
    "exampleEvent",
    (objectFromCppBackend) => {
        console.log(objectFromCppBackend);
    }
);

const data = window.__JUCE__.initialisationData;

document.getElementById("pluginVendor").textContent = "by " + data.pluginVendor;
//document.getElementById("pluginName").textContent = data.pluginName;
document.getElementById("pluginVersion").textContent = data.pluginVersion;

const undoRedoCtrl = Juce.getNativeFunction("webUndoRedo");

fetch(Juce.getBackendResourceAddress("data.json"))
    .then(response => response.text())
    .then((textFromBackend) => {
        console.log(textFromBackend);
    });

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
    const undoButton = document.getElementById("undoButton");
    undoButton.addEventListener("click", () => {
        window.__JUCE__.backend.emitEvent("undoRequest", null);
    });

    const redoButton = document.getElementById("redoButton");
    redoButton.addEventListener("click", () => {
        window.__JUCE__.backend.emitEvent("redoRequest", null);
    })

    // BYPASS
    const bypassCheckbox = document.getElementById("bypassCheckbox");
    const bypassToggleState = Juce.getToggleState("BYPASS");

    bypassCheckbox.oninput = function () {
        bypassToggleState.setValue(this.checked);
    }

    bypassToggleState.valueChangedEvent.addListener(() => {
        bypassCheckbox.checked = bypassToggleState.getValue();
    });

    // MONO
    const monoCheckbox = document.getElementById("monoCheckbox");
    const monoToggleState = Juce.getToggleState("MONO");
    console.log("monoToggleState: ", monoToggleState);

    monoCheckbox.oninput = function () {
        monoToggleState.setValue(this.checked);
    }

    monoToggleState.valueChangedEvent.addListener(() => {
        monoCheckbox.checked = monoToggleState.getValue();
    });

    // GAIN
    const gainSlider = document.getElementById("gainSlider");
    const gainSliderState = Juce.getSliderState("GAIN");
    updateSliderDOMObjectAndSliderState(gainSlider, gainSliderState, (1/gainSliderState.properties.numSteps));

    // ROOM SIZE
    const roomSizeSlider = document.getElementById("roomSizeSlider");
    const roomSizeSliderState = Juce.getSliderState("SIZE");
    updateSliderDOMObjectAndSliderState(roomSizeSlider, roomSizeSliderState, (1/roomSizeSliderState.properties.numSteps));

    // MIX
    const mixSlider = document.getElementById("mixSlider");
    const mixSliderState = Juce.getSliderState("MIX");
    updateSliderDOMObjectAndSliderState(mixSlider, mixSliderState, (1/mixSliderState.properties.numSteps));

    // WIDTH
    const widthSlider = document.getElementById("widthSlider");
    const widthSliderState = Juce.getSliderState("WIDTH");
    updateSliderDOMObjectAndSliderState(widthSlider, widthSliderState, (1 / widthSliderState.properties.numSteps));

    const dampSlider = document.getElementById("dampSlider");
    const dampSliderState = Juce.getSliderState("DAMP");
    updateSliderDOMObjectAndSliderState(dampSlider, dampSliderState, (1 / dampSliderState.properties.numSteps));

    // toggle cpp backend float value based on html checked value
    // value > 0.5 == freeze mode; value < 0.5 == normal mode
    const freezeToggleState = Juce.getSliderState("FREEZE");
    freezeCheckbox.oninput = function () {
        freezeToggleState.setNormalisedValue(this.checked ? 1.0 : 0.0);
    };
    // box is checked if backend value is greater than or equal to 0.5
    freezeToggleState.valueChangedEvent.addListener(() => {
        freezeCheckbox.checked = freezeToggleState.getNormalisedValue() >= 0.5;
    });

    function updateSliderDOMObjectAndSliderState(sliderDOMObject, sliderState, sliderSteps) {
        console.log("sliderDOMObject: ", sliderDOMObject);
        console.log("sliderState: ", sliderState);
        sliderDOMObject.min = sliderState.properties.start;
        sliderDOMObject.max = sliderState.properties.end;
        sliderDOMObject.step = sliderSteps;

        sliderDOMObject.oninput = function () {
            sliderState.setNormalisedValue(this.value);
        };

        sliderState.valueChangedEvent.addListener(() => {
            sliderDOMObject.value = sliderState.getScaledValue();
        });
    }

    window.__JUCE__.backend.addEventListener("outputLevel", () => {
        fetch(Juce.getBackendResourceAddress("outputLevel.json"))
            .then((response) => response.text())
            .then((outputLevel) => {
                const levelData = JSON.parse(outputLevel);
                //console.log(levelData);
                const signalStrength = levelData["left"];
                const scaleFactor = signalStrength <= -60 ? 1 : (((signalStrength / 60) + 1) * 2);
                //console.log("Scale Factor is: ", scaleFactor);
                Animated.circle.scale.set(scaleFactor, scaleFactor, scaleFactor);
            });
    });

    Animated.animate();
});
