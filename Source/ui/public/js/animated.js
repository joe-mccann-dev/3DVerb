
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
    ColorSpan,
} from 'three-nebula';

import * as UI from './index.js';
import * as particleWave from './particle_wave.js'
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
const cubeWidth = 1500;
const cubeHeight = 1000;
const cubeDepth = cubeHeight;

const planes = [];
const lines = [];

const nebula = {};

const emitterLeftX = -140;
const emitterRightX = 160;
const emitterY = 10;
const emitterZ = 10;

const DEFAULT_EMITTER_DAMPING = 0.006;

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
    configNebula();
    
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
    //visualizer.appendChild(stats.dom)
}

function initCamera() {
    aspect = canvas.width / canvas.height;
    camera = new THREE.PerspectiveCamera(75, aspect, 10, 4000);
    camera.position.set(977, 543, 1127);
    camera.lookAt(new THREE.Vector3(172, 80, -20));
    controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotateSpeed = 0.1;
    controls.autoRotate = true;
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

    const sphereFrontZ = forwardMostParticlePositionZ;
    const sphereBackZ = rearMostParticlePositionZ;

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
        opacity: 0.6,
        depthWrite: false
    });
    const cube = new THREE.Mesh(geometry, cubeMaterial);
    cube.position.set(position.x, position.y, position.z);

    return cube;
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
        opacity: 0.8,
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

function animate(time, theta = 0, emitterRadius = 24) {
    time *= 0.001;

    animateNebulaEmitterPositions(theta += 0.13, emitterRadius);
    handleBypassOrFreezeChecked(time);

    stats.update();
    nebula.system.update();
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame((time) => animate(time, theta, emitterRadius));
}

function configNebula() {
    nebula.system = new ParticleSystem();
    const spriteMap = new THREE.TextureLoader().load('assets/PNG/flame_04.png');
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
    nebula.emitterLeft0 = createEmitter();
    nebula.emitterLeft1 = createEmitter();
    nebula.emitterRight0 = createEmitter( { radialVelocity: { axis: new Vector3D(200, 0, 10) } });
    nebula.emitterRight1 = createEmitter( { radialVelocity: { axis: new Vector3D(200, 0, 10) } });

    nebula.emitters.push(nebula.emitterLeft0);
    nebula.emitters.push(nebula.emitterLeft1);
    nebula.emitters.push(nebula.emitterRight0);
    nebula.emitters.push(nebula.emitterRight1);
}

function animateNebulaEmitterPositions(theta, emitterRadius) {
    nebula.emitterLeft0.position.x = emitterLeftX + emitterRadius * Math.cos(theta);
    nebula.emitterLeft0.position.y = emitterY + emitterRadius * Math.sin(theta);
    nebula.emitterLeft0.position.z = emitterZ;

    nebula.emitterLeft1.position.x = emitterLeftX + emitterRadius * Math.cos(theta + Math.PI / 2);
    nebula.emitterLeft1.position.y = emitterY + emitterRadius * Math.cos(theta + Math.PI / 2);
    nebula.emitterLeft1.position.z = emitterZ;

    nebula.emitterRight0.position.x = emitterRightX + emitterRadius * Math.cos(theta);
    nebula.emitterRight0.position.y = emitterY + emitterRadius * Math.sin(theta);
    nebula.emitterRight0.position.z = emitterZ;

    nebula.emitterRight1.position.x = emitterRightX + emitterRadius * Math.cos(theta + Math.PI / 2);
    nebula.emitterRight1.position.y = emitterY + emitterRadius * Math.cos(theta + Math.PI / 2);
    nebula.emitterRight1.position.z = emitterZ;
}

function createEmitter(options = {}) {
    const emitter = new Emitter()
        .setRate(new Rate(new Span(1, 2), 0.18))
        .setInitializers(getStandardInitializers(options))

    emitter.damping = 0.06;
    return emitter;
}

function getStandardInitializers(options = {}) {
    return [
        new Mass(options.mass ?? new Span(2, 4), new Span(20, 40)),
        new Life(options.life ?? 1.2),
        new Body(nebula.sprite),
        new Radius(options.radius ?? 24),
        new RadialVelocity(
            options.radialVelocity?.speed ?? new Span(20, 100),
            options.radialVelocity?.axis ?? leftEmitterRadVelocityAxis(),
            options.radialVelocity?.theta ?? 24,
        )
    ]
}

function getStandardBehaviours(options = {}, emitter) {
    return [
        new Alpha(
            options.alpha?.alphaA ?? 0.5,
            options.alpha?.alphaB ?? 1,
        ),
        new Color(
            options.color?.colorA ?? new ColorSpan(COLORS.spriteColors),
            options.color?.colorB ?? new ColorSpan(COLORS.spriteColors)
        ),
        new Scale(
            options.scale?.scaleA ?? 1,
            options.scale?.scaleB ?? 0.5
        ),
        //new Collision(
        //    options.collision?.emitter ?? emitter,
        //    options.collision?.useMass ?? true,
        //),
        new Force(
            options.force?.fx ?? 0.2,
            options.force?.fy ?? 0.2,
            options.force?.fz ?? 0.2,
        ),
        //new Gravity(
        //   4.2
        //)
    ]
}

function collideFunction(emitter) {
    if (emitter) {
        const cubeHalfDepth = cubeDepth * 0.5;
        const cubeHalfHeight = cubeHeight * 0.5;
        const cubeHalfWidth = cubeWidth * 0.5;

        const cubeScaleVector3 = surroundingCube.userData.scale;
        const reflectionBuffer = 75;

        if (cubeScaleVector3) {
            const cubeScaleZ = cubeScaleVector3.z;
            const cubeScaleY = cubeScaleVector3.y;
            const cubeScaleX = cubeScaleVector3.x;

            const cubeLeftFaceX = (surroundingCube.position.x) - (cubeHalfWidth * cubeScaleX);
            const cubeRightFaceX = (surroundingCube.position.x) + (cubeHalfWidth * cubeScaleX)

            const cubeTopFaceY = (surroundingCube.position.y + (cubeHalfHeight * cubeScaleY));
            const cubeBottomFaceY = (surroundingCube.position.y - (cubeHalfHeight * cubeScaleY));

            const cubeFrontFaceZ = (surroundingCube.position.z + (cubeHalfDepth * cubeScaleZ));
            const cubeBackFaceZ = (surroundingCube.position.z - (cubeHalfDepth * cubeScaleZ));

            emitter.particles.forEach((particle, index) => {
                const forceBehaviour = particle.behaviours.find((behaviour) => {
                    return behaviour.type === "Force";
                });

                //const gravityBehaviour = particle.behaviours.find((behaviour) => {
                //    return behaviour.type === "Gravity";
                //})

                if (particle.position.z >= cubeFrontFaceZ - reflectionBuffer) {
                    particle.velocity.z *= reverseVelocityFactor(index);
                    forceBehaviour.force.z *= reverseForceFactor(index);
                }

                if (particle.position.z <= cubeBackFaceZ + reflectionBuffer) {
                    particle.velocity.z *= reverseVelocityFactor(index);  
                    forceBehaviour.force.z *= reverseForceFactor(index);
                }

                if (particle.position.y >= cubeTopFaceY - reflectionBuffer) {
                    particle.velocity.y *= reverseVelocityFactor(index);
                    forceBehaviour.force.y *= reverseForceFactor(index);
                    //gravityBehaviour.gravity *= 2;
                }

                if (particle.position.y <= cubeBottomFaceY + reflectionBuffer) {
                    particle.velocity.y *= reverseVelocityFactor(index);
                    forceBehaviour.force.y *= reverseForceFactor(index);
                }

                if (particle.position.x <= cubeLeftFaceX + reflectionBuffer) {
                    particle.velocity.x *= reverseVelocityFactor(index, 200);
                    forceBehaviour.x *= reverseForceFactor(index, 200);
                }

                if (particle.position.x >= cubeRightFaceX - reflectionBuffer) {
                    particle.velocity.x *= reverseVelocityFactor(index, 200);
                    forceBehaviour.x *= reverseForceFactor(index, 200);
                }
            });
        }
    }
}

function reverseVelocityFactor(particleIndex, multiplier = 1) {
    //(-1.0 + Math.sin(Math.random() + particleIndex))
    return (-1.0) * multiplier;
}

function reverseForceFactor(particleIndex, multiplier = 1) {
    return (-1.0) * multiplier;
}

function leftEmitterRadVelocityAxis() {
    return new Vector3D(-200, 50, 10);
}
function rightEmitterRadVelocityAxis() {
    return new Vector3D(200, 50, 10);
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

export {
    animate,
    nebula,
    Vector3D,
    Force,
    ColorSpan,
    scene,
    environmentMap,
    camera,
    pointLight,
    threeColor,
    spheres,
    sphereRadius,
    surroundingCube,
    cubeDepth,
    getStandardInitializers,
    getStandardBehaviours,
    collideFunction,
    leftEmitterRadVelocityAxis,
    rightEmitterRadVelocityAxis,
    objects,
    addToSceneAndObjects,
    DEFAULT_EMITTER_DAMPING,
}
