
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    Color,
    MeshStandardMaterial,
    DirectionalLight,
    AmbientLight,
    SphereGeometry,
    Mesh,
    PMREMGenerator,
} from 'three';

import { AnimationMixer } from 'three/src/animation/AnimationMixer.js'; 

import * as UI from './index.js';

// COLORS
const lightIndigo = 0xBFDBFE;
const mediumIndigo = 0x6366F1;
const darkIndigo = 0x3730A3;
const mediumDarkGray = 0x374151;
const darkGray = 0x111827;
const mediumAmber = 0xFBBF24;
const mediumDarkAmber = 0xB45309;
const coolBlue = 0x60A5FA;
const lightYellow = 0xFDE68A;
// END COLORS

// THREE JS CODE
const scene = new Scene();
const renderer = new WebGLRenderer({ antialias: true });

const visualizer = document.getElementById("visualizer");
const visualizerStyle = getComputedStyle(visualizer);

renderer.setSize(parseInt(visualizerStyle.width), parseInt(visualizerStyle.height));
const canvas = renderer.domElement;
visualizer.appendChild(canvas);

const width = canvas.width;
const height = canvas.height;
const aspect = width / height;
const camera = new PerspectiveCamera(75, aspect, 0.1, 20);

camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

const light = new DirectionalLight(0xffffed, 1);
light.position.set(0, 5, 22);
scene.add(light);

const ambientLight = new AmbientLight(0xffffed, 0.5);
scene.add(ambientLight);
scene.background = new Color(mediumDarkGray);

const pmrem = new PMREMGenerator(renderer).fromScene(scene);

// sphere1
const sphere1Radius = 1;
const sphere1WidthSegments = 5;
const sphere1HeightSegments = 5;
const sphere1Geometry = new SphereGeometry(sphere1Radius, sphere1WidthSegments, sphere1HeightSegments);
const sphere1Material = new MeshStandardMaterial({ color: mediumIndigo, envMap: pmrem });
const sphere1 = new Mesh(sphere1Geometry, sphere1Material);
sphere1.position.set(-5, -2, 0);

// sphere2
const sphere2 = new Mesh(sphere1Geometry, sphere1Material);
sphere2.position.set(0, 4, 0);

// sphere3
const sphere3 = new Mesh(sphere1Geometry, sphere1Material);
sphere3.position.set(5, -2, 0);

scene.add(sphere1);
scene.add(sphere2);
scene.add(sphere3);

const mixer = new AnimationMixer();

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    if (!UI.freezeCheckbox.checked) {
        sphere1.rotation.y += 0.001;
        sphere2.rotation.y += 0.004;
        sphere3.rotation.y += 0.002;
    }
    mixer.update(1 / 60);
}

export {
    animate,
    Color,
    coolBlue,
    mediumIndigo,
    mediumDarkAmber,
    mediumAmber,
    lightYellow,
    sphere1,
    sphere2,
}
