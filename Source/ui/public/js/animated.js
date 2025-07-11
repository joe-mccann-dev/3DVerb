
import * as THREE from 'three';
import * as promises from './threeDModels.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import ParticleSystem, {
    Emitter,
    Rate,
    Span,
    Body,
    Mass,
    Radius,
    Life,
    RadialVelocity,
    Vector3D,
    Alpha,
    Scale,
    Color,
    SpriteRenderer,
    Collision,
    Force,
    Gravity,
} from 'three-nebula';

import * as UI from './index.js';
import { waves, setupParticles } from './particle_wave.js'
import Stats from 'three/addons/libs/stats.module.js';

import * as COLORS from './colors.js';
const threeColor = THREE.Color;

let camera, scene, renderer;
let cubeTextureLoader, environmentMap, textureLoader, alphaMap;
let visualizer, visualizerStyle, canvas, stats;
let aspect, controls;
let pointLight;

const objects = [];

const spheres = [];
let sphereRadius;
let surroundingCube;
const cubeWidth = 1200;
const cubeHeight = 800;
const cubeDepth = 900;

const planes = [];
const lines = [];

const nebula = {};
const emitterLeftX = -20, emitterLeftY = 70;
const emitterRightX = 120, emitterRightY = 70;
const DEFAULT_EMITTER_DAMPING = 0.006;

init();

function init() {
    initScene();
    initRenderer();
    initCamera();
    addPointLight();
    addSpheres();
    addSurroundingCube();
    addPlanes();
    addLines();
    configNebula();
    setupParticles();
    for (const location in waves) {
        scene.add(waves[location]);
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
    //visualizer.appendChild(stats.dom)
}

function initCamera() {
    aspect = canvas.width / canvas.height;
    camera = new THREE.PerspectiveCamera(75, aspect, 10, 2000);
    camera.position.set(303, 408, 880);
    camera.lookAt(new THREE.Vector3(50, 65, -50));
    controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', () => {
        //console.log('position:', camera.position);
        //console.log('target:', controls.target);
    });
}
function addPointLight() {
    pointLight = new THREE.PointLight(0xc9c893, 50000);;
    pointLight.position.set(25, 120, -10);
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
}

function addSpheres() {
    sphereRadius = 3.2;
    const sphereWidthSegments = 30;
    const sphereHeightSegments = 30;
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, sphereWidthSegments, sphereHeightSegments);



    spheres.push(
        makeSphere(sphereGeometry, new THREE.Vector3(-50, -10, 150)),
        makeSphere(sphereGeometry, new THREE.Vector3(-50, 200, 150)),
        makeSphere(sphereGeometry, new THREE.Vector3(-50, -10, -50)),
        makeSphere(sphereGeometry, new THREE.Vector3(-50, 200, -50)),
        //right
        makeSphere(sphereGeometry, new THREE.Vector3(150, -10, 150)),
        makeSphere(sphereGeometry, new THREE.Vector3(150, 200, 150)),
        makeSphere(sphereGeometry, new THREE.Vector3(150, -10, -50)),
        makeSphere(sphereGeometry, new THREE.Vector3(150, 200, -50))
    );
}

function makeSphere(geometry, position, color = COLORS.sphereColor) {
    const material = new THREE.MeshStandardMaterial({
        color: color,
        envMap: environmentMap,
        alphaMap: alphaMap,
        transparent: true,
        envMapIntensity: 10.0,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(position.x, position.y, position.z);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    sphere.metalness = 40;

    addToSceneAndObjects(sphere);
    return sphere;
}

function addSurroundingCube() {
    const cubeWidthSegments = 20;
    const cubeHeightSegments = 20; 
    const cubeGeometry = new THREE.BoxGeometry(cubeWidth, cubeHeight, cubeDepth, cubeWidthSegments, cubeHeightSegments);
    surroundingCube = makeSurroundingCube(cubeGeometry, new THREE.Vector3(50, 80, 50));
    addToSceneAndObjects(surroundingCube);
    
}

function makeSurroundingCube(geometry, position) {
    const cubeMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.topPlaneColor,
        envMap: environmentMap,
        envMapIntensity: 8.0,
        metalness: 0.8,
        roughness: 0.32,
        alphaMap: alphaMap,
        transparent: true,
        opacity: 0.3,
        depthWrite: false
    });
    const cube = new THREE.Mesh(geometry, cubeMaterial);
    cube.position.set(position.x, position.y, position.z);
    //cube.rotateY(-Math.PI);

    return cube;
}
function addPlanes() {
    const planeGeometry = new THREE.PlaneGeometry(210, 210, 4, 4);
    const speakerStandGeometry = new THREE.PlaneGeometry(45, 45, 2, 2);
    const horizontalPlaneRotation = new THREE.Vector3(-Math.PI / 2, 0, 0);
    const verticalPlaneRotation = new THREE.Vector3(-Math.PI, 0, 0);
    planes.push(
        makePlane(planeGeometry, COLORS.sidePlaneColor, new THREE.Vector3(50, -10, 50), horizontalPlaneRotation),
        makePlane(planeGeometry, COLORS.sidePlaneColor, new THREE.Vector3(50, 200, 50), horizontalPlaneRotation),
        makePlane(planeGeometry, COLORS.sidePlaneColor, new THREE.Vector3(50, 95, -50), verticalPlaneRotation),
        // speaker stands
        makePlane(speakerStandGeometry, COLORS.speakerStandColor, new THREE.Vector3(-20, 50, -20), horizontalPlaneRotation),
        makePlane(speakerStandGeometry, COLORS.speakerStandColor, new THREE.Vector3(120, 50, -20), horizontalPlaneRotation)
    );
}

function makePlane(geometry, color, position, rotation) {
    const material = new THREE.MeshStandardMaterial({
        color: color,
        envMap: environmentMap,
        side: THREE.DoubleSide,
        transparent: true,
        alphaMap: alphaMap,
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
        // lines connecting bottom plane
        makeLine(-50, 150, -10, -10, -50, -50),
        makeLine(-50, -50, -10, -10, 150, -50),
        makeLine(-50, 150, -10, -10, 150, 150),
        makeLine(150, 150, -10, -10, 150, -50),

        // lines connecting bottom to top
        makeLine(-50, -50, -10, 200, -50, -50),
        makeLine(150, 150, -10, 200, -50, -50),

        // lines connecting top plane
        makeLine(-50, 150, 200, 200, 150, 150),
        makeLine(-50, 150, 200, 200, -50, -50),
        makeLine(-50, -50, 200, 200, -50, 150),
        makeLine(150, 150, 200, 200, -50, 150),

        // speaker stands
        makeLine(-20, -20, -10, 50, -20, -20, COLORS.speakerStandColor),
        makeLine(120, 120, -10, 50, -20, -20, COLORS.speakerStandColor),
    );
}

function makeLine(src_x, dest_x, src_y, dest_y, src_z, dest_z, color = COLORS.roomFrameColor) {
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

    addToSceneAndObjects(line);
    return line;
}

function addToSceneAndObjects(objectToAdd) {
    scene.add(objectToAdd);
    objects.push(objectToAdd);
}

function animate(time, theta = 0, emitterRadius = 12) {
    time *= 0.001;

    animateNebulaEmitterPositions(theta += 0.13, emitterRadius);
    //rotateBigSphere(time);
    handleBypassOrFreezeChecked(time);

    stats.update();
    nebula.system.update();
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame((time) => animate(time, theta, emitterRadius));
}

function configNebula() {
    nebula.system = new ParticleSystem();
    const spriteMap = new THREE.TextureLoader().load('assets/wave-scaled.png');
    const spriteMaterial = new THREE.SpriteMaterial({
        map: spriteMap,
        color: COLORS.spriteColor,
        blending: THREE.AdditiveBlending,
        fog: true,
    });
    nebula.sprite = new THREE.Sprite(spriteMaterial);

    createNebulaEmitters();
    nebula.emitters.forEach((emitter) => {
        nebula.system.addEmitter(emitter);
    });
    nebula.system.addRenderer(new SpriteRenderer(scene, THREE));
}

function createNebulaEmitters() {
    nebula.emitters = [];
    nebula.emitterLeft0 = createEmitter(COLORS.darkGreen, COLORS.skyBlue);
    nebula.emitterLeft1 = createEmitter(COLORS.skyBlue, COLORS.darkGreen);
    nebula.emitterRight0 = createEmitter(COLORS.darkBlue, COLORS.grayGreen, { radialVelocity: { axis: new Vector3D(200, 0, 10) } });
    nebula.emitterRight1 = createEmitter(COLORS.grayGreen, COLORS.darkBlue, { radialVelocity: { axis: new Vector3D(200, 0, 10) } });

    nebula.emitterLeft0.position.set(-20, 70, 0);
    nebula.emitterLeft1.position.set(-20, 70, 0);
    nebula.emitterRight0.position.set(120, 70, 0);
    nebula.emitterRight1.position.set(120, 70, 0);

    nebula.emitters.push(nebula.emitterLeft0);
    nebula.emitters.push(nebula.emitterLeft1);
    nebula.emitters.push(nebula.emitterRight0);
    nebula.emitters.push(nebula.emitterRight1);
}

function animateNebulaEmitterPositions(theta, emitterRadius) {
    nebula.emitterLeft0.position.x = emitterLeftX + emitterRadius * Math.cos(theta);
    nebula.emitterLeft0.position.y = emitterLeftY + emitterRadius * Math.sin(theta);
    nebula.emitterLeft1.position.x = emitterLeftX + emitterRadius * Math.cos(theta + Math.PI / 2);
    nebula.emitterLeft1.position.y = emitterLeftY + emitterRadius * Math.cos(theta + Math.PI / 2);

    nebula.emitterRight0.position.x = emitterRightX + emitterRadius * Math.cos(theta);
    nebula.emitterRight0.position.y = emitterRightY + emitterRadius * Math.sin(theta);
    nebula.emitterRight1.position.x = emitterRightX + emitterRadius * Math.cos(theta + Math.PI / 2);
    nebula.emitterRight1.position.y = emitterRightY + emitterRadius * Math.cos(theta + Math.PI / 2);
}

function createEmitter(colorA, colorB, options = {}) {
    const emitter = new Emitter()
        .setRate(new Rate(new Span(3, 6), new Span(0.1, 0.3)))
        .setInitializers(getStandardInitializers(options))
    emitter.setBehaviours(
            getStandardBehaviours(
                { color: { colorA: colorA, colorB: colorB } }),
                emitter
    );
    emitter.damping = 0.06;
    return emitter;
}

function getStandardInitializers(options = {}) {
    return [
        new Mass(options.mass ?? new Span(2, 4), new Span(20, 40)),
        new Life(options.life ?? 1.2),
        new Body(nebula.sprite),
        new Radius(options.radius ?? 30),
        new RadialVelocity(
            options.radialVelocity?.speed ?? new Span(20, 100),
            options.radialVelocity?.axis ?? leftEmitterRadVelocityAxis(),
            options.radialVelocity?.theta ?? 32,
        )
    ]
}

function getStandardBehaviours(options = {}, emitter) {
    return [
        new Alpha(
            options.alpha?.alphaA ?? 0.5,
            options.alpha?.alphaB ?? 0,
        ),
        new Color(
            options.color?.colorA ?? COLORS.darkGreen,
            options.color?.colorB ?? COLORS.skyBlue
        ),
        new Scale(
            options.scale?.scaleA ?? 1,
            options.scale?.scaleB ?? 0.5
        ),
        new Collision(
            options.collision?.emitter ?? emitter,
            options.collision?.useMass ?? true,
        ),
        new Force(
            options.force?.fx ?? 0.2,
            options.force?.fy ?? 2.8,
            options.force?.fz ?? 0.2,
        ),
    ]
}

function collideFunction(emitter) {
    if (emitter) {
        const cubeHalfDepth = cubeDepth / 2;
        const cubeScaleVector3 = surroundingCube.userData.scale;
        if (cubeScaleVector3) {
            const cubeScaleZ = cubeScaleVector3.z;
            const cubeFrontFaceZ = (surroundingCube.position.z + (cubeHalfDepth * cubeScaleZ));
            console.log("cubeFrontFaceZ: ", cubeFrontFaceZ)
            const forceIndex = 0;
            emitter.particles.forEach((particle) => {
                particle.behaviours.forEach((behaviour, index) => {
                    if (behaviour.constructor.name === 'Force') {
                        forceIndex = index;
                    }
                })
                if (particle.position.z >= cubeFrontFaceZ - 40) {
                    particle.velocity.z *= -1;
                    particle.behaviours[forceIndex].force.z *= -1;

                }
            });
        }
    }
}

function leftEmitterRadVelocityAxis() {
    return new Vector3D(-200, 0, 10);
}
function rightEmitterRadVelocityAxis() {
    return new Vector3D(200, 0, 10);
}

function handleBypassOrFreezeChecked(time) {
    if (UI.bypassAndMono.bypass.element.checked) {
        pointLight.intensity = 0;
        spheres.forEach((sphere) => {
            sphere.rotation.x = 0;
            sphere.rotation.y = 0;
        });
        nebula.emitters.forEach(emitter => emitter.stopEmit());
    } else {
        nebula.emitters.forEach((emitter) => {
            if (!emitter.isEmitting) {
                emitter.emit();
            }
        });
    }
    if (!UI.freeze.element.checked && !UI.bypassAndMono.bypass.element.checked) {
        spheres.forEach((sphere, index) => {
            const speed = 1 + index * 0.1;
            const rotation = time * speed;
            sphere.rotation.y = rotation;
        });
    }
}

function rotateBigSphere(time) {
    const bigSphereRotationSpeed = 0.15;
    const rotation = time * bigSphereRotationSpeed;
    bigSphere.rotation.y = rotation;
}

export {
    animate,
    nebula,
    Vector3D,
    Force,
    scene,
    environmentMap,
    camera,
    pointLight,
    threeColor,
    spheres,
    sphereRadius,
    surroundingCube,
    getStandardInitializers,
    getStandardBehaviours,
    collideFunction,
    leftEmitterRadVelocityAxis,
    rightEmitterRadVelocityAxis,
    objects,
    addToSceneAndObjects,
    DEFAULT_EMITTER_DAMPING,
}
