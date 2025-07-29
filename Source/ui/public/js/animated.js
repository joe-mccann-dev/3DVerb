
import * as THREE from 'three';
import * as promises from './threeDModels.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as UI from './index.js';
import * as particleWave from './particle_wave.js'
import Stats from 'three/addons/libs/stats.module.js';
import * as Utility from './utility.js';
import * as COLORS from './colors.js';
import VisualParams from './visual_params.js'
import NebulaParams from './nebula_params.js'
import NebulaSystem from './nebula_system.js';

let camera, scene, renderer;
let cubeTextureLoader, environmentMap, textureLoader, alphaMap;
let visualizer, visualizerStyle, canvas, stats;
let aspect, controls;
let pointLight;

const objects = [];

const spheres = [];
let sphereRadius;
let surroundingCube;
const cubeWidth = 1500;
const cubeHeight = 600;
const cubeDepth = cubeHeight * 1.2;

const planes = [];
const lines = [];

const visualParams = new VisualParams();
const nebulaParams = new NebulaParams(visualParams);
let nebulaSystem;

init();

function init() {
    initScene();
    initRenderer();
    initCamera();
    addPointLight();
    particleWave.setupParticles();
    addSurroundingCube();
    addSpheres();
    addPlanes();
    addLines();
    nebulaSystem = new NebulaSystem(nebulaParams, scene, THREE, surroundingCube)
    
    for (const location in particleWave.waves) {
        scene.add(particleWave.waves[location]);
    }
    promises.addModelsToScene();
    requestAnimationFrame(animate);
}

function initScene() {
    scene = new THREE.Scene();
    cubeTextureLoader = new THREE.CubeTextureLoader();
    environmentMap = cubeTextureLoader.load([
        '../assets/environment_map/mountain/px.png',
        '../assets/environment_map/mountain/nx.png',
        '../assets/environment_map/mountain/py.png',
        '../assets/environment_map/mountain/ny.png',
        '../assets/environment_map/mountain/pz.png',
        '../assets/environment_map/mountain/nz.png'
    ]);
    scene.background = environmentMap;
    scene.environment = environmentMap;
    textureLoader = new THREE.TextureLoader;
    alphaMap = textureLoader.load('assets/sky_grayscale.png');
}

function initRenderer() {
    visualizer = document.getElementById("visualizer");
    visualizerStyle = getComputedStyle(visualizer);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(parseInt(visualizerStyle.width), parseInt(visualizerStyle.height));
    renderer.shadowMap.enabled = true;
    canvas = renderer.domElement;
    visualizer.appendChild(canvas);
    stats = new Stats();
    visualizer.appendChild(stats.dom)
}

function initCamera() {
    aspect = canvas.width / canvas.height;
    camera = new THREE.PerspectiveCamera(75, aspect, 10, 4000);
    camera.position.set(977, 443, 877);
    camera.lookAt(new THREE.Vector3(172, 80, -20));
    controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotateSpeed = 0.1;
    //controls.autoRotate = true;
    //controls.addEventListener('change', () => {
    //    console.log('position:', camera.position);
    //    console.log('target:', controls.target);
    //});
}
function addPointLight() {
    pointLight = new THREE.PointLight(0xc9c893, 200000);
    pointLight.position.set(-30, 90, -10);
    pointLight.castShadow = true;
    pointLight.shadow.camera.left = -10;
    pointLight.shadow.camera.right = 10;
    pointLight.shadow.camera.top = 10;
    pointLight.shadow.camera.bottom = -10;
    pointLight.shadow.camera.near = 1;
    pointLight.shadow.camera.far = 70;
    pointLight.shadow.mapSize.width = 2048;
    pointLight.shadow.mapSize.height = 2048;


    const sphereSize = 20;
    const pointLightHelper = new THREE.PointLightHelper(pointLight, sphereSize);
    scene.add(pointLightHelper);

    scene.add(pointLight);
}

function addSpheres() {
    sphereRadius = 5.2;
    const sphereWidthSegments = 16;
    const sphereHeightSegments = 20;
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, sphereWidthSegments, sphereHeightSegments);

    const positionArray = particleWave.waves.top.geometry.attributes.position.array;
    const positionArrayBottom = particleWave.waves.bottom.geometry.attributes.position.array

    const leftMostParticlePositionX = positionArray[0];
    const rightMostParticlePositionX = positionArray[positionArray.length - 3];

    const topParticlePositionY = positionArray[1];
    const bottomParticlePositionY = positionArrayBottom[1];

    const forwardMostParticlePositionZ = positionArray[positionArray.length - 1];
    const rearMostParticlePositionZ = positionArray[2];

    const sphereLeftX = leftMostParticlePositionX;
    const sphereRightX = rightMostParticlePositionX;
    
    const sphereTopY = topParticlePositionY;
    const sphereBottomY = bottomParticlePositionY;

    const frontZOffset = 300;
    const backZOffset = 200;
    const sphereFrontZ = forwardMostParticlePositionZ + frontZOffset;
    const sphereBackZ = rearMostParticlePositionZ - backZOffset;

    spheres.push(
        // left
        makeSphere(sphereGeometry, new THREE.Vector3(sphereLeftX, sphereBottomY, sphereFrontZ)),
        makeSphere(sphereGeometry, new THREE.Vector3(sphereLeftX, sphereTopY, sphereFrontZ)),
        makeSphere(sphereGeometry, new THREE.Vector3(sphereLeftX, sphereBottomY, sphereBackZ)),
        makeSphere(sphereGeometry, new THREE.Vector3(sphereLeftX, sphereTopY, sphereBackZ)),

        //right
        makeSphere(sphereGeometry, new THREE.Vector3(sphereRightX, sphereBottomY, sphereFrontZ)),
        makeSphere(sphereGeometry, new THREE.Vector3(sphereRightX, sphereTopY, sphereFrontZ)),
        makeSphere(sphereGeometry, new THREE.Vector3(sphereRightX, sphereBottomY, sphereBackZ)),
        makeSphere(sphereGeometry, new THREE.Vector3(sphereRightX, sphereTopY, sphereBackZ))
    );
}

function makeSphere(geometry, position, color = COLORS.sphereColor) {
    const material = new THREE.MeshStandardMaterial({
        color: color,
        envMap: environmentMap,
        //alphaMap: alphaMap,
        transparent: true,
        opacity: 0.9,
        envMapIntensity: 12.0,
        depthWrite: false,
        wireframe: true,
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(position.x, position.y, position.z);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    sphere.metalness = 40;

    addToSceneAndObjects(sphere);
    return sphere;
}

function scaleAnchorSpheres(mixValue, scaleFactor) {
    spheres.forEach((sphere) => {
        const sphereSize = sphereRadius + (mixValue * scaleFactor);
        sphere.scale.copy(sphere.userData.originalScale);
        sphere.scale.multiplyScalar(sphereSize);
    });
}

function scaleAnchorSpheresPosition(scale) {
    const currentSeparation = particleWave.getCurrentSeparation();
    spheres.forEach((sphere, index) => {

        sphere.position.copy(sphere.userData.originalPosition);

        const minX = 10 * particleWave.getCurrentSeparation();
        const maxX = 15 * particleWave.getCurrentSeparation();
        const xOffset = Utility.getLogScaledValue(minX, maxX, scale, Math.E);
        const sphereXOffset = index < 4 ? -xOffset : xOffset;

        const zOffset = currentSeparation;
        const sphereZOffset = sphere.position.z < 0 ? -zOffset : zOffset;

        const sphereXScale = scale * (sphere.position.x + sphereXOffset);
        const sphereZScale = scale * (sphere.position.z + sphereZOffset);

        sphere.position.set(sphereXScale, sphere.position.y, sphereZScale);
    });
}

function addSurroundingCube() {
    const cubeWidthSegments = 20;
    const cubeHeightSegments = 20; 
    const cubeGeometry = new THREE.BoxGeometry(cubeWidth, cubeHeight, cubeDepth, cubeWidthSegments, cubeHeightSegments);
    surroundingCube = makeSurroundingCube(cubeGeometry, new THREE.Vector3(50, 50, 50));
    addToSceneAndObjects(surroundingCube);
}

function makeSurroundingCube(geometry, position) {
    const cubeMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.sidePlaneColor,
        envMap: environmentMap,
        envMapIntensity: 100.0,
        metalness: 1.0,
        roughness: 0.18,
        alphaMap: alphaMap,
        transparent: true,
        opacity: 0.8,
        depthWrite: false
    });
    const cube = new THREE.Mesh(geometry, cubeMaterial);
    cube.position.set(position.x, position.y, position.z);

    return cube;
}

function scaleSurroundingCube(scale) {
    surroundingCube.scale.copy(surroundingCube.userData.originalScale);
    surroundingCube.position.copy(surroundingCube.userData.originalPosition);

    surroundingCube.scale.multiplyScalar(scale);
    surroundingCube.userData.scale = surroundingCube.scale;

    surroundingCube.position.multiplyScalar(scale);
    surroundingCube.userData.position = surroundingCube.position;
}

function addPlanes() {
    const planeGeometry = new THREE.PlaneGeometry(500, 400, 4, 4);
    const verticalPlaneGeometry = new THREE.PlaneGeometry(500, 250, 4, 4);
    const speakerStandGeometry = new THREE.PlaneGeometry(120, 100, 4, 4);
    const horizontalPlaneRotation = new THREE.Vector3(-Math.PI / 2, 0, 0);
    const verticalPlaneRotation = new THREE.Vector3(-Math.PI, 0, 0);
    planes.push(
        makePlane(planeGeometry, COLORS.bottomPlaneColor, new THREE.Vector3(10, -100, 50), horizontalPlaneRotation),
        //makePlane(planeGeometry, COLORS.sidePlaneColor, new THREE.Vector3(50, 200, 50), horizontalPlaneRotation),
        makePlane(verticalPlaneGeometry, COLORS.sidePlaneColor, new THREE.Vector3(10, 0, -90), verticalPlaneRotation),

        // speaker stands
        makePlane(speakerStandGeometry, COLORS.speakerStandColor, new THREE.Vector3(-140, -20, -20), horizontalPlaneRotation),
        makePlane(speakerStandGeometry, COLORS.speakerStandColor, new THREE.Vector3(160, -20, -20), horizontalPlaneRotation)
    );
}

function makePlane(geometry, color, position, rotation) {
    const material = new THREE.MeshStandardMaterial({
        color: color,
        envMap: environmentMap,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.set(rotation.x, rotation.y, rotation.z)
    plane.position.set(position.x, position.y, position.z);
    plane.castShadow = true;

    addToSceneAndObjects(plane);
    return plane;
}

function addLines() {
    lines.push(
        // speaker stands
        makeLine(-140, -140, -100, -20, -20, -20, COLORS.speakerStandColor),
        makeLine(160, 160, -100, -20, -20, -20, COLORS.speakerStandColor),
    );
}

function makeLine(src_x, dest_x, src_y, dest_y, src_z, dest_z, color = COLORS.bottomPlaneColor) {
    const distance = Math.sqrt(
        (dest_x - src_x) ** 2 +
        (dest_y - src_y) ** 2 +
        (dest_z - src_z) ** 2
    );

    // use box geometry as a line so lines react to light
    const geometry = new THREE.BoxGeometry(2, 2, distance);

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

    addToSceneAndObjects(line);
    return line;
}

function addToSceneAndObjects(objectToAdd) {
    scene.add(objectToAdd);
    objects.push(objectToAdd);
}

function animate(time, theta = 0, emitterRadius = 16) {
    time *= 0.001;
    
    if (!bypassIsChecked()) {
        rotateSpheres(time);
        nebulaSystem.animateEmitterPositions(theta, emitterRadius);
        nebulaSystem.particleSystem.update();
    }

    stats.update();
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame((time) => animate(time, theta, emitterRadius));
}

function freezeAnchorSpheres() {
    spheres.forEach((sphere) => {
        sphere.material.color.copy(new THREE.Color(COLORS.freezeColor));
    });

    nebulaSystem.stopEmitting();
}

function unFreezeAnchorSpheres() {
    nebulaSystem.resumeEmitting();
    spheres.forEach((sphere) => {
        sphere.material.color.copy(sphere.userData.color);
    });
}

function handleBypassChecked() {
    if (!bypassIsChecked()) { return; }

    nebulaSystem.stopEmitting();
    pointLight.intensity = 0;
    spheres.forEach((sphere) => {
        sphere.rotation.x = 0;
        sphere.rotation.y = 0;
    });
}

function handleBypassNotChecked() {
    if (bypassIsChecked()) { return; }

    nebulaSystem.resumeEmitting();
}

function rotateSpheres(time) {
    if (!freezeIsChecked() && !bypassIsChecked()) {
        spheres.forEach((sphere, index) => {
            const speed = 1 + index * 0.1;
            const rotation = time * speed;
            sphere.rotation.y = rotation;
        });
    }
}

function setUserData() {
    spheres.forEach((sphere) => {
        if (!sphere.userData.color) {
            sphere.userData.color = sphere.material.color.clone();
        }

        sphere.userData.originalScale = sphere.scale.clone();
        sphere.userData.originalPosition = sphere.position.clone();
    });

    pointLight.userData.originalIntensity = pointLight.intensity;
    surroundingCube.userData.originalScale = surroundingCube.scale.clone();
    surroundingCube.userData.originalPosition = surroundingCube.position.clone();
}

function bypassIsChecked() {
    return UI.bypassAndMono.bypass.element.checked;
}

function freezeIsChecked() {
    return UI.freeze.element.checked;
}

export {
    animate,
    nebulaSystem,
    visualParams,
    nebulaParams,
    scene,
    environmentMap,
    camera,
    pointLight,
    spheres,
    sphereRadius,
    surroundingCube,
    scaleSurroundingCube,
    scaleAnchorSpheres,
    scaleAnchorSpheresPosition,
    objects,
    addToSceneAndObjects,
    setUserData,
    handleBypassChecked,
    handleBypassNotChecked,
    freezeAnchorSpheres,
    unFreezeAnchorSpheres,
}
