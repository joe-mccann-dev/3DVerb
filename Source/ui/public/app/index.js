import * as Juce from "./juce/index.js";

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

document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("nativeFunctionButton");
    button.addEventListener("click", () => {
        nativeFunction("one", 2, null).then((result) => {
            console.log(result);
        });
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

import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    DirectionalLight,
    AmbientLight,
    
} from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';


const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const loader = new GLTFLoader();

loader.load('assets/cube.glb', function (glb) {
    const cube = glb.scene;
    cube.scale.set(1, 1, 1);
    cube.position.y = -1.5;
    scene.add(cube)
}, undefined, function (error) {
    console.error(error);
});

camera.position.z = 5;

const light = new DirectionalLight(0xffffed, 1);
light.position.set(10, 10, 3);
scene.add(light);

const ambientLight = new AmbientLight(0x404040); // Soft ambient light
scene.add(ambientLight);


function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();