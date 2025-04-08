import * as Juce from "./juce/index.js";

import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    Line,
    LineBasicMaterial,
    BufferGeometry,
    BufferAttribute,
    DirectionalLight,
    AmbientLight,
    CircleGeometry,
    MeshBasicMaterial,
    Mesh

} from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

console.log("Hello, JS Frontend!");

window.__JUCE__.backend.addEventListener(
    "exampleEvent",
    (objectFromCppBackend) => {
        console.log(objectFromCppBackend);
    }
);

const data = window.__JUCE__.initialisationData;

document.getElementById("pluginVendor").textContent = data.pluginVendor;
document.getElementById("pluginName").textContent = data.pluginName;
document.getElementById("pluginVersion").textContent = data.pluginVersion;

const undoRedoCtrl = Juce.getNativeFunction("webUndoRedo");

fetch(Juce.getBackendResourceAddress("data.json"))
    .then(response => response.text())
    .then((textFromBackend) => {
        console.log(textFromBackend);
    });

// THREE JS CODE
const scene = new Scene();
const camera = new PerspectiveCamera(75, (window.innerWidth / window.innerHeight), 0.1, 1000);
const renderer = new WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.set(10, -5, 20);
camera.lookAt(0, -5, 0);

const loader = new GLTFLoader();
loader.load('assets/cube.glb', function (glb) {
    const cube = glb.scene;
    cube.scale.set(1, 1, 1);
    scene.add(cube)
}, undefined, function (error) {
    console.error(error);
});

const light = new DirectionalLight(0xffffed, 1);
light.position.set(10, 10, 3);
scene.add(light);

const ambientLight = new AmbientLight(0x404040);
scene.add(ambientLight);

const geometry = new CircleGeometry(6, 32);
const material = new MeshBasicMaterial({ color: 0x9944ee });
const circle = new Mesh(geometry, material);

scene.add(circle);

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();
// END THREE JS CODE

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

    const freezeSlider = document.getElementById("freezeSlider");
    const freezeSliderState = Juce.getSliderState("FREEZE");
    updateSliderDOMObjectAndSliderState(freezeSlider, freezeSliderState, (1 / freezeSliderState.properties.numSteps));

    function updateSliderDOMObjectAndSliderState(sliderDOMObject, sliderState, sliderSteps) {
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
                circle.scale.set(scaleFactor, scaleFactor, scaleFactor);
            });
    });
});
