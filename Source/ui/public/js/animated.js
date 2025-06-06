
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    Color,
    MeshStandardMaterial,
    BoxGeometry,
    Vector3,
    DirectionalLight,
    AmbientLight,
    SphereGeometry,
    PlaneGeometry,
    PCFSoftShadowMap,
    Mesh,
    CubeTextureLoader,
} from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
const scene = new Scene();
const renderer = new WebGLRenderer({ antialias: true });

const cubeTextureLoader = new CubeTextureLoader()
const environmentMap = cubeTextureLoader.load([
    '../assets/environment_map/mountain/px.png',
    '../assets/environment_map/mountain/nx.png',
    '../assets/environment_map/mountain/py.png',
    '../assets/environment_map/mountain/ny.png',
    '../assets/environment_map/mountain/pz.png',
    '../assets/environment_map/mountain/nz.png'
])

const visualizer = document.getElementById("visualizer");
const visualizerStyle = getComputedStyle(visualizer);

renderer.setSize(parseInt(visualizerStyle.width), parseInt(visualizerStyle.height));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
const canvas = renderer.domElement;
visualizer.appendChild(canvas);

const width = canvas.width;
const height = canvas.height;
const aspect = width / height;
const camera = new PerspectiveCamera(75, aspect, 0.1, 400);

const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotateSpeed = 0.2;
controls.autoRotate = true;

camera.position.set(50, 80, 320);
//camera.lookAt(new Vector3(50, 50, -50));

controls.update();

const light = new DirectionalLight(0xffffed, 0.5);
light.position.set(-2, 4, -20);
light.castShadow = true;

light.shadow.camera.left = -10;
light.shadow.camera.right = 10;
light.shadow.camera.top = 10;
light.shadow.camera.bottom = -10;
light.shadow.camera.near = 1;
light.shadow.camera.far = 70;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
//scene.add(light);

const ambientLight = new AmbientLight(0xf5f5e7, 0.8);
//scene.add(ambientLight);

scene.background = environmentMap;

const sphereRadius = 3.2;
const sphereWidthSegments = 16;
const sphereHeightSegments = 24;
const sphereGeometry = new SphereGeometry(sphereRadius, sphereWidthSegments, sphereHeightSegments);
const centerSphereRadius = 3.4;
const centerSphereGeometry = new SphereGeometry(centerSphereRadius, sphereWidthSegments, sphereHeightSegments);


//camera.position.set(-95, -100, 100);
//camera.lookAt(new Vector3(-55, -12, -100));
const spheres = [
    // left
    makeSphere(sphereGeometry, fuchsia600, [-50, -10, 150]),
    makeSphere(sphereGeometry, mediumIndigo, [-50, -10, -50]),
    //right
    makeSphere(sphereGeometry, mediumDarkAmber, [150, -10, 150]),
    makeSphere(sphereGeometry, lightYellow, [150, -10, -50]),
    // apex
    makeSphere(sphereGeometry, cloudBlue, [50, 200, 50]),
    // center
    makeSphere(centerSphereGeometry, mediumDarkGray, [50, 50, 50])
    
];

const lines = [
    addLineGeometry(-50, 150, -10, -10, -50, -50),
    addLineGeometry(-50, -50, -10, -10, 150, -50),
    addLineGeometry(-50, 150, -10, -10, 150, 150),
    addLineGeometry(150, 150, -10, -10, 150, -50),

    // lines connecting to center apex
    addLineGeometry(-50, 50, -10, 200, -50, 50),
    addLineGeometry(-50, 50, -10, 200, 150, 50),
    addLineGeometry(150, 50, -10, 200, -50, 50),
    addLineGeometry(150, 50, -10, 200, 150, 50),

    // lines connecting to bottom
    //addLineGeometry(-6, 0, -5, 0, 0, -5, lightYellow),
    //addLineGeometry(-6, 0, 5, 0, 0, -5, lightYellow),
    //addLineGeometry(6, 0, 5, 0, 0, -5, lightYellow),
    //addLineGeometry(6, 0, -5, 0, 0, -5  , lightYellow),
]

const planeGeometry = new PlaneGeometry(198, 198, 1, 1);
const planeMaterial = new MeshStandardMaterial({ color: fuchsia600, envMap: environmentMap });
const plane = new Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.x = 50;
plane.position.y = -10; 
plane.position.z = 50;

plane.castShadow = true;
plane.receiveShadow = true;
scene.add(plane);

function makeSphere(geometry, color, positions) {
    const material = new MeshStandardMaterial({ color: color, envMap: environmentMap });

    const sphere = new Mesh(geometry, material);
    scene.add(sphere);

    sphere.position.set(positions[0], positions[1], positions[2]);

    sphere.castShadow = true;
    sphere.receiveShadow = true;

    return sphere;
}

function addLineGeometry(src_x, dest_x, src_y, dest_y, src_z, dest_z, color = lightIndigo) {
    const distance = Math.sqrt(
        (dest_x - src_x) ** 2 +
        (dest_y - src_y) ** 2 +
        (dest_z - src_z) ** 2
    );

    // use box geometry as a line so lines react to light
    const geometry = new BoxGeometry(0.5, 0.5, distance);

    const material = new MeshStandardMaterial({
        color: color,
        wireframe: true,
        envMap: environmentMap,
    });

    const mesh = new Mesh(geometry, material);

    mesh.position.set(
        (src_x + dest_x) / 2,
        (src_y + dest_y) / 2,
        (src_z + dest_z) / 2
    );

    mesh.lookAt(new Vector3(dest_x, dest_y, dest_z));

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    scene.add(mesh);
    
    return mesh;
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


export {
    animate,
    Color,
    coolBlue,
    mediumIndigo,
    mediumDarkAmber,
    mediumAmber,
    lightYellow,
    spheres,
    lines,
    plane,
    sphereRadius,
    Vector3,
}
