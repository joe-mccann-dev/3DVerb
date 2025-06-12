
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import ParticleSystem, {
    Emitter,
    Rate,
    Span,
    Body,
    Gravity,
    Collision,
    Position,
    Mass,
    Radius,
    Life,
    RadialVelocity,
    PointZone,
    Vector3D,
    Alpha,
    Scale,
    Color,
    MeshRenderer,
} from 'three-nebula';
import * as UI from './index.js';

// COLORS
const freezeColor = 0x2c2e54;
const sphereColor = 0xd8d8b4;
const topPlaneColor = 0x2c2e54;
const sidePlaneColor = 0x888c8f;
const speakerStandColor = 0xbfbc85;
const roomFrameColor = 0x919ddc;
const threeColor = THREE.Color;
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

camera.position.set(-74, 92, 342);
camera.lookAt(new THREE.Vector3(50, 0, -50));

const controls = new OrbitControls(camera, renderer.domElement);
controls.autoRotateSpeed = 0.15;
//controls.autoRotate = true;
controls.update();
controls.addEventListener('change', () => {
    console.log('position:', camera.position);
    console.log('target:', controls.target);
});

const pointLight = new THREE.PointLight(0xc9c893, 50000);;
pointLight.position.set(100, 95, 10);
pointLight.castShadow = true;
pointLight.shadow.camera.left = -10;
pointLight.shadow.camera.right = 10;
pointLight.shadow.camera.top = 10;
pointLight.shadow.camera.bottom = -10;
pointLight.shadow.camera.near = 1;
pointLight.shadow.camera.far = 70;
pointLight.shadow.mapSize.width = 2048;
pointLight.shadow.mapSize.height = 2048;
scene.add(pointLight);

//const sphereSize = 10;
//const pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize);
//scene.add(pointLightHelper);

const loader = new GLTFLoader();

const objects = [];
const speakersPromise = new Promise((resolve, reject) => {
    loader.load('assets/krk_classic_5_studio_monitor_speaker.glb', function (glb) {
        const speakers = [];
        const leftSpeaker = glb.scene;
        leftSpeaker.envMap = environmentMap;
        leftSpeaker.receiveShadow = true;
        leftSpeaker.scale.set(16, 16, 16);
        leftSpeaker.rotateY(-0.5);      
        leftSpeaker.position.set(-4, 50, -20);
        objects.push(leftSpeaker);
        speakers.push(leftSpeaker);
        scene.add(leftSpeaker);

        const rightSpeaker = leftSpeaker.clone();
        rightSpeaker.envMap = environmentMap;
        rightSpeaker.position.x += 130;
        rightSpeaker.position.z += 120;
        objects.push(rightSpeaker);
        speakers.push(rightSpeaker);
        scene.add(rightSpeaker);
        resolve(speakers);
    }, undefined, reject)
});

const carpetPromise = new Promise((resolve, reject) => {
    loader.load('assets/fine_persian_heriz_carpet.glb', function (glb) {
        const carpet = glb.scene;
        carpet.envMap = environmentMap;
        carpet.receiveShadow = true;
        carpet.castShadow = true;
        carpet.scale.set(50, 50, 60);
        carpet.position.set(52, -8, 50);
        carpet.rotateY(Math.PI / 2);
        objects.push(carpet);
        scene.add(carpet);
        resolve(carpet);
    }, undefined, reject);
});

const lampPromise = new Promise((resolve, reject) => {
    loader.load('assets/floor_lamp.glb', function (glb) {
        const lamp = glb.scene;
        lamp.envMap = environmentMap;
        lamp.receiveShadow = true;
        lamp.castShadow = true;
        lamp.scale.set(60, 60, 60);
        lamp.position.set(100, 50, 10);
        lamp.rotateY(Math.PI / 4)
        objects.push(lamp);
        scene.add(lamp);
        resolve(lamp);
    }, undefined, reject);
});

const panelsPromise = new Promise((resolve, reject) => {
    loader.load('assets/wall_wood_panels.glb', function (glb) {
        const panels = [];
        const panel = glb.scene;
        panel.envMap = environmentMap;
        panel.receiveShadow = true;
        panel.scale.set(100, 100, 100);
        panel.position.set(142, 10, 60);
        panel.rotateY(-Math.PI / 2);
        objects.push(panel);
        panels.push(panel);
        scene.add(panel);

        const panel2 = glb.scene.clone();
        panel2.position.set(60, 10, -40);
        panel2.rotateY(Math.PI / 2);
        scene.add(panel2);

        resolve(panels);
    }, undefined, reject);
});

const plantPromise = new Promise((resolve, reject) => {
    loader.load('assets/tall_house_plant.glb', function (glb) {
        const plant = glb.scene;
        plant.envMap = environmentMap;
        plant.receiveShadow = true;
        plant.castShadow = true;
        plant.scale.set(0.20, 0.20, 0.20);
        plant.position.set(40, 5, -10);
        objects.push(plant);
        scene.add(plant);
        resolve(plant);
    }, undefined, reject);
});

const soundPanelsPromise = new Promise((resolve, reject) => {
    loader.load('assets/sound_proof_panel.glb', function (glb) {
        const panels = [];
        const panel = glb.scene;
        panel.envMap = environmentMap;
        panel.position.set(145, 120, 55);
        panel.rotateX(Math.PI / 2);
        panel.rotateZ(Math.PI / 2);
        panel.scale.set(4, 4, 4);
        objects.push(panel);
        panels.push(panel);
        scene.add(panel);

        const panel2 = glb.scene.clone();
        panel2.position.set(55, 120, -46);
        panel2.rotateZ(-Math.PI / 2);
        objects.push(panel2);
        panels.push(panel2);
        scene.add(panel2);
        resolve(panels);
    }, undefined, reject);
})

// GEOMETRIES
const sphereRadius = 3.2;
const sphereWidthSegments = 12;
const sphereHeightSegments = 12;
const sphereGeometry = new THREE.SphereGeometry(sphereRadius, sphereWidthSegments, sphereHeightSegments);

const emittedSphereRadius = 1;
const emittedSphereWidthSegments = 12;
const emittedSphereHeightSegments = 12;
const emittedSphereGeometry = new THREE.SphereGeometry(emittedSphereRadius, emittedSphereWidthSegments, emittedSphereHeightSegments);

const planeGeometry = new THREE.PlaneGeometry(210, 210, 4, 4);
const speakerStandGeometry = new THREE.PlaneGeometry(45, 45, 2, 2);
const planes = [
    makePlane(planeGeometry, topPlaneColor, [50, -10, 50], -Math.PI / 2, 0, 0),
    makePlane(planeGeometry, topPlaneColor, [50, 200, 50], -Math.PI / 2, 0, 0),
    makePlane(planeGeometry, sidePlaneColor, [150, 95, 50], 0, Math.PI / 2, 0, -Math.PI / 4),
    makePlane(planeGeometry, sidePlaneColor, [50, 95, -50], -Math.PI, 0, 0),
    // speaker stands
    makePlane(speakerStandGeometry, speakerStandColor, [-5, 50, -20], -Math.PI / 2, 0, 0),
    makePlane(speakerStandGeometry, speakerStandColor, [126, 50, 100], -Math.PI / 2, 0, 0)
];

// MESH LISTS
const spheres = [
    // left
    makeSphere(sphereGeometry, [-50, -10, 150]),
    makeSphere(sphereGeometry, [-50, 200, 150]),
    makeSphere(sphereGeometry, [-50, -10, -50]),
    makeSphere(sphereGeometry, [-50, 200, -50]),
    //right
    makeSphere(sphereGeometry, [150, -10, 150]),
    makeSphere(sphereGeometry, [150, 200, 150]),
    makeSphere(sphereGeometry, [150, -10, -50]),
    makeSphere(sphereGeometry, [150, 200, -50])    
];

const lines = [
    // lines connecting bottom plane
    makeLine(-50, 150, -10, -10, -50, -50),
    makeLine(-50, -50, -10, -10, 150, -50),
    makeLine(-50, 150, -10, -10, 150, 150),
    makeLine(150, 150, -10, -10, 150, -50),

    // lines connecting bottom to top
    makeLine(-50, -50, -10, 200, -50, -50),
    makeLine(150, 150, -10, 200, -50, -50),
    makeLine(150, 150, -10, 200, 150, 150),

    // lines connecting top plane
    makeLine(-50, 150, 200, 200, 150, 150),
    makeLine(-50, 150, 200, 200, -50, -50),
    makeLine(-50, -50, 200, 200, -50, 150),
    makeLine(150, 150, 200, 200, -50, 150),

    // speaker stands
    makeLine(-4, -4, -10, 50, -20, -20, speakerStandColor),
    makeLine(126, 126, -10, 50, 100, 100, speakerStandColor),
];

// "ADD A MESH" FUNCTIONS
function makePlane(geometry, color, positions, x_rotation, y_rotation, z_rotation) {
    const textureLoader = new THREE.TextureLoader;
    const alphaMap = textureLoader.load('assets/sky_grayscale.png');
    const material = new THREE.MeshStandardMaterial({
        color: color,
        envMap: environmentMap,
        side: THREE.DoubleSide,
        transparent: true,
        alphaMap: alphaMap,
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.set(x_rotation, y_rotation, z_rotation)
    plane.position.set(positions[0], positions[1], positions[2]);
    plane.castShadow = true;

    scene.add(plane);
    objects.push(plane);

    return plane;
}

function makeSphere(geometry, positions, color = sphereColor ) {
    const material = new THREE.MeshStandardMaterial({
        color: color,
        envMap: environmentMap,
        wireframe: true,
    });
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.set(positions[0], positions[1], positions[2]);

    sphere.castShadow = true;
    sphere.receiveShadow = true;
    sphere.metalness = 3;

    scene.add(sphere);
    objects.push(sphere);

    return sphere;
}

function makeLine(src_x, dest_x, src_y, dest_y, src_z, dest_z, color = roomFrameColor) {
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

const emitter = new Emitter();
const emitterRenderer = new MeshRenderer(scene, THREE);
const emittedSphere = new THREE.Mesh(
    emittedSphereGeometry,
    new THREE.MeshStandardMaterial({
        color: 0xc6c7b8,
        wireframe: false,
    })
);

emitter
    .setRate(new Rate(new Span(2, 5), new Span(0.5, 1)))
    .addInitializers([
        new Mass(1),
        new Radius(5),
        new Life(25, 125),
        new Body(emittedSphere),
        new RadialVelocity(new Span(300, 500), new Vector3D(0, 1, 0), 30),
    ])
    .addBehaviours([new Scale(1.5), new Gravity(1), new Collision(emitter)])
    .emit();

emitter.damping = 0.06;
emitter.setPosition(new Vector3D(-4, 50, -20));
console.log("emitter: ", emitter);

const system = new ParticleSystem();
system
    .addEmitter(emitter)
    .addRenderer(emitterRenderer);

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
    if (UI.bypassCheckbox.checked) {
        pointLight.intensity = 0;
    }

    system.update();
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

export {
    animate,
    freezeColor,
    threeColor,
    spheres,
    lines,
    planes,
    sphereRadius,
    speakersPromise,
    panelsPromise,
    soundPanelsPromise,
    carpetPromise,
    plantPromise,
    lampPromise,
    pointLight,
}
