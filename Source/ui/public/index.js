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

fetch(Juce.getBackendResourceAddress("data.json"))
    .then(response => response.text())
    .then((textFromBackend) => {
        console.log(textFromBackend);
    });

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

} from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';


const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


camera.position.set(30, 0, 15);
camera.lookAt(0, 0, 0);


const loader = new GLTFLoader();

loader.load('assets/cube.glb', function (glb) {
    const cube = glb.scene;
    cube.scale.set(1, 1, 1);
    cube.position.y = 3;
    scene.add(cube)
}, undefined, function (error) {
    console.error(error);
});


const light = new DirectionalLight(0xffffed, 1);
light.position.set(10, 10, 3);
scene.add(light);

const ambientLight = new AmbientLight(0x404040); // Soft ambient light
scene.add(ambientLight);
const MAX_POINTS = 500;

// geometry
const geometry = new BufferGeometry();

// attributes
const positions = new Float32Array(MAX_POINTS * 3); // 3 floats (x, y and z) per point
geometry.setAttribute('position', new BufferAttribute(positions, 3));

// draw range
//const drawCount = 3; // draw the first 3 points, only
//geometry.setDrawRange(0, drawCount);

// material
const material = new LineBasicMaterial({ color: 0x9944ee });

// line
const line = new Line(geometry, material);
scene.add(line);

const positionAttribute = line.geometry.getAttribute('position');
console.log("positionAttribute", positionAttribute);
let x = 0, y = 0, z = 0;

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

    window.__JUCE__.backend.addEventListener("outputLevel", () => {
        fetch(Juce.getBackendResourceAddress("outputLevel.json"))
            .then((response) => response.text())
            .then((outputLevel) => {
                const levelData = JSON.parse(outputLevel);

                positionAttribute.needsUpdate = true;
                positionAttribute.setXYZ(2, x, y, z);

                y += -1 * levelData["left"];
                if (y > 0) {
                    y = -60;
                }
            });
    });
});


