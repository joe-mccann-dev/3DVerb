
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
    '../assets/environment_map/sunset/px.png',
    '../assets/environment_map/sunset/nx.png',
    '../assets/environment_map/sunset/py.png',
    '../assets/environment_map/sunset/ny.png',
    '../assets/environment_map/sunset/pz.png',
    '../assets/environment_map/sunset/nz.png'
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
const camera = new PerspectiveCamera(60, aspect, 0.1, 50);

camera.position.set(0.8, -14.5, 11.5); 
camera.lookAt(new Vector3(0, 0, 0));

const light = new DirectionalLight(0xffffed, 1);
light.position.set(0, -14, 16);
light.castShadow = true;

light.shadow.camera.left = -10;
light.shadow.camera.right = 10;
light.shadow.camera.top = 10;
light.shadow.camera.bottom = -10;
light.shadow.camera.near = 1;
light.shadow.camera.far = 50;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
scene.add(light);

const ambientLight = new AmbientLight(0xffffed, 0.8);
//scene.add(ambientLight);

scene.background = environmentMap;

const sphereRadius = 0.42;
const sphereWidthSegments = 8;
const sphereHeightSegments = 10;
const sphereGeometry = new SphereGeometry(sphereRadius, sphereWidthSegments, sphereHeightSegments);
const centerSphereRadius = 0.6;
const centerSphereGeometry = new SphereGeometry(centerSphereRadius, sphereWidthSegments, sphereHeightSegments);


const spheres = [
    makeSphere(sphereGeometry, mediumIndigo, [-6, -5, 0]),
    makeSphere(sphereGeometry, darkGray, [-6, 5, 0]),
    makeSphere(sphereGeometry, mediumDarkAmber, [6, 5, 0]),
    makeSphere(sphereGeometry, lightYellow, [6, -5, 0]),
    makeSphere(centerSphereGeometry, cloudBlue, [0, 0, 0]),
];

const lines = [
    addLineGeometry(-6, 6, 5, 5, 0, 0, fuchsia600),
    addLineGeometry(-6, -6, 5, -5, 0, 0, fuchsia600),
    addLineGeometry(-6, 6, -5, -5, 0, 0, fuchsia600),
    addLineGeometry(6, 6, -5, 5, 0, 0, fuchsia600),

    // lines connecting to center apex
    addLineGeometry(-6, 0, 5, 0, 0, 7.4),
    addLineGeometry(6, 0, 5, 0, 0, 7.4),
    addLineGeometry(-6, 0, -5, 0, 0, 7.4),
    addLineGeometry(6, 0, -5, 0, 0, 7.4),

    // lines connecting to bottom
    addLineGeometry(-6, 0, -5, 0, 0, -5, lightYellow),
    addLineGeometry(-6, 0, 5, 0, 0, -5, lightYellow),
    addLineGeometry(6, 0, 5, 0, 0, -5, lightYellow),
    addLineGeometry(6, 0, -5, 0, 0, -5  , lightYellow),
]

const planeGeometry = new PlaneGeometry(19, 17.3, 2, 2);
const planeMaterial = new MeshStandardMaterial({ color: deepSkyBlue, envMap: environmentMap });
const plane = new Mesh(planeGeometry, planeMaterial);
//plane.rotation.x = Math.PI / 6;
plane.position.y = 6; 
plane.position.z = -6;
plane.position.x = -0.2;
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
    const geometry = new BoxGeometry(0.02, 0.02, distance);

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
