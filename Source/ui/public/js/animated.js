
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    Color,
    Line,
    LineBasicMaterial,
    MeshBasicMaterial,
    MeshStandardMaterial,
    BufferGeometry,
    BufferAttribute,
    DirectionalLight,
    AmbientLight,
    CircleGeometry,
    SphereGeometry,
    Mesh,
    SRGBColorSpace,
    PMREMGenerator,
} from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
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
const camera = new PerspectiveCamera(75, (window.innerWidth / window.innerHeight), 0.1, 1000);
const renderer = new WebGLRenderer({antialias: true});
renderer.outputColorSpace = SRGBColorSpace; 

const visualizer = document.getElementById("visualizer");
const visualizerStyle = getComputedStyle(visualizer);
renderer.setSize(parseInt(visualizerStyle.width), parseInt(visualizerStyle.height));
visualizer.appendChild(renderer.domElement);

camera.position.set(-10, -10, 20);
camera.lookAt(0, 0, 0);

const light = new DirectionalLight(0xffffed, 1);
light.position.set(-10, 10, 10);
scene.add(light);

const ambientLight = new AmbientLight(0xffffed, 1.1);
scene.add(ambientLight);
scene.background = new Color(mediumDarkGray);

const pmrem = new PMREMGenerator(renderer).fromScene(scene);
const circleGeometry = new CircleGeometry(12, 24);
const circleMaterial = new MeshStandardMaterial({ color: lightYellow, envMap: pmrem });
const circle = new Mesh(circleGeometry, circleMaterial);

const sphereRadius = 8;
const sphereWidthSegments = 48;
const sphereHeightSegments = 32;
const sphereGeometry = new SphereGeometry(sphereRadius, sphereWidthSegments, sphereHeightSegments);
const sphereMaterial = new MeshStandardMaterial({ color: mediumIndigo, envMap: pmrem });
const sphere = new Mesh(sphereGeometry, sphereMaterial);

scene.add(circle);
scene.add(sphere);

circle.rotateY(320);

const mixer = new AnimationMixer();
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    if (!UI.freezeCheckbox.checked) {
        sphere.rotation.y += 0.001;
    }
    mixer.update(1 / 60);
}

export {
    animate,
    circle,
    sphere,
    Color,
    coolBlue,
    mediumDarkAmber,
    mediumAmber,
    lightYellow
}
