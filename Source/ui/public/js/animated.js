
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as UI from './index.js';

// COLORS
const lightIndigo = 0xBFDBFE;
const cloud = 0xb9b9c3;
const deepSkyBlue = 0x3b3a60;
const mediumSkyBlue = 0x4a4a85;
const cloudBlue = 0xc1c0cb;
const mediumIndigo = 0x6366F1;
const darkIndigo = 0x3730A3;
const mediumDarkGray = 0x374151;
const darkGray = 0x111827;
const mediumAmber = 0xFBBF24;
const mediumDarkAmber = 0xB45309;
const coolBlue = 0x60A5FA;
const lightYellow = 0xFDE68A;
const fuchsia600 = 0xc026d3;
// END COLORS

// THREE JS CODE
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });

const cubeTextureLoader = new THREE.CubeTextureLoader()
const environmentMap = cubeTextureLoader.load([
    '../assets/environment_map/mountain/px.png',
    '../assets/environment_map/mountain/nx.png',
    '../assets/environment_map/mountain/py.png',
    '../assets/environment_map/mountain/ny.png',
    '../assets/environment_map/mountain/pz.png',
    '../assets/environment_map/mountain/nz.png'
]);

scene.background = environmentMap;
scene.environment = environmentMap;

const visualizer = document.getElementById("visualizer");
const visualizerStyle = getComputedStyle(visualizer);

renderer.setSize(parseInt(visualizerStyle.width), parseInt(visualizerStyle.height));
renderer.shadowMap.enabled = true;
const canvas = renderer.domElement;
visualizer.appendChild(canvas);

const width = canvas.width;
const height = canvas.height;
const aspect = width / height;
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotateSpeed = 0.15;
controls.autoRotate = true;

camera.position.set(32, 120, 420);

camera.lookAt(new THREE.Vector3(50, 0, 50));

controls.update();

controls.addEventListener('change', () => {
    console.log('position:', camera.position);
    console.log('target:', controls.target);
});

const light = new THREE.DirectionalLight(0xf8f8df, 0.8);

light.position.set(-8, 0.5, 10);
light.lookAt(50, 0, 50);
light.castShadow = true;

light.shadow.camera.left = -10;
light.shadow.camera.right = 10;
light.shadow.camera.top = 10;
light.shadow.camera.bottom = -10;
light.shadow.camera.near = 1;
light.shadow.camera.far = 70;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
scene.add(light);

const loader = new GLTFLoader();

const guitarPromise = new Promise((resolve, reject) => {
    loader.load('assets/gibson_es-335_vintage_burst_electric_guitar.glb', function (glb) {
        const guitar = glb.scene;
        guitar.envMap = environmentMap;
        guitar.scale.set(26, 26, 26);
        guitar.rotateZ(Math.PI / 2);
        guitar.rotateX(-Math.PI / 4);
        guitar.rotateY(0.2);
        guitar.position.set(50, -5, 50);
        scene.add(guitar);
        resolve(guitar);
    }, undefined, reject)
});


const objects = [];

const sphereRadius = 3.2;
const sphereWidthSegments = 16;
const sphereHeightSegments = 24;
const sphereGeometry = new THREE.SphereGeometry(sphereRadius, sphereWidthSegments, sphereHeightSegments);

const spheres = [
    // left
    makeSphere(sphereGeometry, fuchsia600, [-50, -10, 150]),
    makeSphere(sphereGeometry, fuchsia600, [-50, 200, 150]),
    makeSphere(sphereGeometry, mediumIndigo, [-50, -10, -50]),
    makeSphere(sphereGeometry, mediumIndigo, [-50, 200, -50]),
    //right
    makeSphere(sphereGeometry, mediumDarkAmber, [150, -10, 150]),
    makeSphere(sphereGeometry, mediumDarkAmber, [150, 200, 150]),
    makeSphere(sphereGeometry, lightYellow, [150, -10, -50]),
    makeSphere(sphereGeometry, lightYellow, [150, 200, -50])    
];

const lines = [
    // lines connecting bottom plane
    addLineGeometry(-50, 150, -10, -10, -50, -50),
    addLineGeometry(-50, -50, -10, -10, 150, -50),
    addLineGeometry(-50, 150, -10, -10, 150, 150),
    addLineGeometry(150, 150, -10, -10, 150, -50),

    // lines connecting bottom to top
    addLineGeometry(-50, -50, -10, 200, -50, -50),
    addLineGeometry(150, 150, -10, 200, -50, -50),
    addLineGeometry(-50, -50, -10, 200, 150, 150),
    addLineGeometry(150, 150, -10, 200, 150, 150),

    // lines connecting top plane
    addLineGeometry(-50, 150, 200, 200, 150, 150),
    addLineGeometry(-50, 150, 200, 200, -50, -50),
    addLineGeometry(-50, -50, 200, 200, -50, 150),
    addLineGeometry(150, 150, 200, 200, -50, 150),

];

const planeGeometry = new THREE.PlaneGeometry(198, 198, 4, 4);
const planes = [
    makePlane(planeGeometry, 'lightblue', [50, -10, 50]),
    makePlane(planeGeometry, 'lightblue', [50, 200, 50]),
];

function makePlane(geometry, color, positions) {
    const material = new THREE.MeshStandardMaterial({ color: color, envMap: environmentMap, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(positions[0], positions[1], positions[2]);
    plane.castShadow = true;
    plane.receiveShadow = true;

    scene.add(plane);
    objects.push(plane);

    return plane;
}

function makeSphere(geometry, color, positions) {
    const material = new THREE.MeshStandardMaterial({ color: color, envMap: environmentMap });
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.set(positions[0], positions[1], positions[2]);

    sphere.castShadow = true;
    sphere.receiveShadow = true;

    scene.add(sphere);
    objects.push(sphere);

    return sphere;
}

function addLineGeometry(src_x, dest_x, src_y, dest_y, src_z, dest_z, color = lightIndigo) {
    const distance = Math.sqrt(
        (dest_x - src_x) ** 2 +
        (dest_y - src_y) ** 2 +
        (dest_z - src_z) ** 2
    );

    // use box geometry as a line so lines react to light
    const geometry = new THREE.BoxGeometry(0.5, 0.5, distance);

    const material = new THREE.MeshStandardMaterial({
        color: color,
        wireframe: true,
        envMap: environmentMap,
    });

    const line = new THREE.Mesh(geometry, material);

    line.position.set(
        (src_x + dest_x) / 2,
        (src_y + dest_y) / 2,
        (src_z + dest_z) / 2
    );

    line.lookAt(new THREE.Vector3(dest_x, dest_y, dest_z));

    line.castShadow = true;
    line.receiveShadow = true;
    
    scene.add(line);
    objects.push(line);

    return line;
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
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

const color = THREE.Color;
export {
    animate,
    color,
    coolBlue,
    mediumIndigo,
    mediumDarkAmber,
    mediumAmber,
    lightYellow,
    spheres,
    lines,
    planes,
    sphereRadius,
    guitarPromise,
}
