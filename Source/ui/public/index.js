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

const nativeFunction = Juce.getNativeFunction("nativeFunction");

fetch(Juce.getBackendResourceAddress("data.json"))
    .then(response => response.text())
    .then((textFromBackend) => {
        console.log(textFromBackend);
    });

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

document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("nativeFunctionButton");
    button.addEventListener("click", () => {
        nativeFunction("one", 2, null).then((result) => {
            console.log(result);
        });
    });

    const emitEventButton = document.getElementById("emitEventButton");
    let emittedCount = 0;
    emitEventButton.addEventListener("click", () => {
        emittedCount++;
        window.__JUCE__.backend.emitEvent("exampleJavaScriptEvent", {
            emittedCount: emittedCount
        });
    });

    const slider = document.getElementById("gainSlider");
    const sliderState = Juce.getSliderState("GAIN");

    slider.min = sliderState.properties.start;
    slider.max = sliderState.properties.end;
    slider.step = 1 / sliderState.properties.numSteps;

    slider.oninput = function () {
        sliderState.setNormalisedValue(this.value);
    }

    sliderState.valueChangedEvent.addListener(() => {
        slider.value = sliderState.getScaledValue();
    });

    window.__JUCE__.backend.addEventListener("outputLevel", () => {
        fetch(Juce.getBackendResourceAddress("outputLevel.json"))
            .then((response) => response.text())
            .then((outputLevel) => {
                const levelData = JSON.parse(outputLevel);
                console.log(levelData);
                const signalStrength = levelData["left"];
                const scaleFactor = signalStrength <= -60 ? 1 : (((signalStrength / 60) + 1) * 2);
                console.log("Scale Factor is: ", scaleFactor);
                circle.scale.set(scaleFactor, scaleFactor, scaleFactor);
            });
    });
});
