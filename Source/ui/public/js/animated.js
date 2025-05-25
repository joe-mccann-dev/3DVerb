
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

camera.position.z = 10;

const light = new DirectionalLight(0xffffed, 3);
light.position.set(-1, 2, 12);
scene.add(light);

const ambientLight = new AmbientLight(lightYellow, 0.5);
scene.add(ambientLight);
scene.background = new Color(mediumDarkGray);

const pmrem = new PMREMGenerator(renderer).fromScene(scene);


const sphereRadius = .5;
const sphereWidthSegments = 5;
const sphereHeightSegments = 10;
const sphereGeometry = new SphereGeometry(sphereRadius, sphereWidthSegments, sphereHeightSegments);


const spheres = [
    makeSphere(sphereGeometry, mediumIndigo, [-5, -2, 0]),
    makeSphere(sphereGeometry, mediumDarkAmber, [0, 4, 0]),
    makeSphere(sphereGeometry, lightYellow, [5, -2, 0]),
    makeSphere(sphereGeometry, lightIndigo, [0, 0, 2]),
];

function makeSphere(geometry, color, positions) {
    const material = new MeshStandardMaterial({ color: color, envMap: pmrem });

    const sphere = new Mesh(geometry, material);
    scene.add(sphere);

    sphere.position.set(positions[0], positions[1], positions[2]);

    return sphere;
}

function animate(time) {
    time *= 0.001;

    if (!UI.freezeCheckbox.checked) {
        spheres.forEach((sphere, index) => {
            const speed = 1 + index * 0.1;
            const rotation = time * speed;
            sphere.rotation.x = rotation;
            sphere.rotation.y = rotation;
        });
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}


export {
    animate,
    Color,
    coolBlue,
    mediumIndigo,
    mediumDarkAmber,
    mediumAmber,
    lightYellow,
    spheres,
}
