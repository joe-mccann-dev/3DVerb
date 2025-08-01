
import * as THREE from 'three';
import * as UI from './index.js';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as Utility from './utility.js';
import * as COLORS from './colors.js';
import * as models from './threeDModels.js';
import VisualParams from './visual_params.js'
import NebulaParams from './nebula_params.js'
import NebulaSystem from './nebula_system.js';
import ParticleWave from './particle_wave.js'

export default class AnimationController {
    static CUBE_WIDTH = 1500;
    static CUBE_HEIGHT = 600;
    static CUBE_DEPTH = AnimationController.CUBE_HEIGHT * 1.5;
    static SPHERE_RADIUS = 5;

    #scene;
    #renderer = new THREE.WebGLRenderer({ antialias: true });
    #canvas;
    #stats;
    #camera;
    #orbitControls;
    #pointLight;

    #spheres = [];
    #planes = [];
    #lines = [];
    #surroundingCube;
    #environmentMap;
    #alphaMap;

    #visualParams;
    #nebulaParams;
    #nebulaSystem;
    #particleWave;

    // << PUBLIC >> 
    constructor() {
        // maintain binding of "this" to AnimationController instance when called from index.js
        this.animate = this.animate.bind(this);
        this.#initScene();

        this.#prepareDOM();
        this.#initCamera();
        this.#particleWave = new ParticleWave(this.#camera, this.#environmentMap, THREE, this.#scene);
        this.#addPointLight();
        this.#addSurroundingCube();

        models.addModelsToScene(this.#scene, this.#environmentMap);

        this.#addSpheres();
        this.#addPlanes();
        this.#addLines();
        this.#visualParams = new VisualParams();
        this.#nebulaParams = new NebulaParams(this.#visualParams);
        this.#nebulaSystem = new NebulaSystem(this.#nebulaParams, this.#scene, THREE)
        this.#setUserData();
        this.scaleSurroundingCube(this.#visualParams.cubeScale); 
    }

    animate(time, theta = 0, emitterRadius = 16) {
        time *= 0.001;
        console.log("this inside animate(): ", this);
        if (!this.#bypassIsChecked()) {
            this.#rotateSpheres(time);
            this.#nebulaSystem.animateEmitterPositions(theta, emitterRadius);
            this.#nebulaSystem.particleSystem.update();
        }

        this.#stats.update();
        this.#orbitControls.update();
        this.#renderer.render(this.#scene, this.#camera);
        requestAnimationFrame((time) => this.animate(time, theta, emitterRadius));
    }

    get visualParams() {
        return this.#visualParams;
    }

    get nebulaParams() {
        return this.#nebulaParams;
    }

    get nebulaSystem() {
        return this.#nebulaSystem;
    }

    get particleWave() {
        return this.#particleWave;
    }

    get surroundingCube() {
        return this.#surroundingCube;
    }

    get pointLight() {
        return this.#pointLight;
    }

    scaleSurroundingCube(scale) {
        this.#surroundingCube.scale.copy(this.#surroundingCube.userData.originalScale);
        this.#surroundingCube.position.copy(this.#surroundingCube.userData.originalPosition);

        this.#surroundingCube.scale.multiplyScalar(scale);
        this.#surroundingCube.userData.scale = this.#surroundingCube.scale;

        this.#surroundingCube.position.multiplyScalar(scale);
        this.#surroundingCube.userData.position = this.#surroundingCube.position;
    }

    scaleAnchorSpheres(mixValue, scaleFactor) {
        this.#spheres.forEach((sphere) => {
            const sphereSize = AnimationController.SPHERE_RADIUS + (mixValue * scaleFactor);
            sphere.scale.copy(sphere.userData.originalScale);
            sphere.scale.multiplyScalar(sphereSize);
        });
    }

    scaleAnchorSpheresPosition(scale) {
        const currentSeparation = this.#particleWave.currentSeparation;
        this.#spheres.forEach((sphere, index) => {

            sphere.position.copy(sphere.userData.originalPosition);

            const minX = 10 * currentSeparation;
            const maxX = 15 * currentSeparation;
            const xOffset = Utility.getLogScaledValue(minX, maxX, scale, Math.E);
            const sphereXOffset = index < 4 ? -xOffset : xOffset;

            const zOffset = currentSeparation;
            const sphereZOffset = sphere.position.z < 0 ? -zOffset : zOffset;

            const sphereXScale = scale * (sphere.position.x + sphereXOffset);
            const sphereZScale = scale * (sphere.position.z + sphereZOffset);

            sphere.position.set(sphereXScale, sphere.position.y, sphereZScale);
        });
    }

    freezeAnchorSpheres() {
        this.#spheres.forEach((sphere) => {
            sphere.material.color.copy(new THREE.Color(COLORS.freezeColor));
        });

        this.#nebulaSystem.stopEmitting();
    }

    unFreezeAnchorSpheres() {
        this.#nebulaSystem.resumeEmitting();
        this.#spheres.forEach((sphere) => {
            sphere.material.color.copy(sphere.userData.color);
        });
    }

    handleBypassChecked() {
        if (!this.#bypassIsChecked()) { return; }

        this.#nebulaSystem.stopEmitting();
        this.#pointLight.intensity = 0;
        this.#spheres.forEach((sphere) => {
            sphere.rotation.x = 0;
            sphere.rotation.y = 0;
        });
    }

    handleBypassNotChecked() {
        if (this.#bypassIsChecked()) { return; }

        this.#nebulaSystem.resumeEmitting();
    }

    // << PRIVATE >>
    #initScene() {
        this.#scene = new THREE.Scene();
        const cubeTextureLoader = new THREE.CubeTextureLoader();
        this.#environmentMap = cubeTextureLoader.load([
            '../assets/environment_maps/mountain/px.png',
            '../assets/environment_maps/mountain/nx.png',
            '../assets/environment_maps/mountain/py.png',
            '../assets/environment_maps/mountain/ny.png',
            '../assets/environment_maps/mountain/pz.png',
            '../assets/environment_maps/mountain/nz.png'
        ]);

        this.#scene.background = this.#environmentMap;
        this.#scene.environment = this.#environmentMap;

        const textureLoader = new THREE.TextureLoader;
        this.#alphaMap = textureLoader.load('assets/alpha_maps/cloud_grayscale.png');
    }

    #prepareDOM() {
        const visualizer = document.getElementById("visualizer");
        const visualizerStyle = getComputedStyle(visualizer);

        this.#renderer.setSize(
            parseInt(visualizerStyle.width),
            parseInt(visualizerStyle.height)
        );

        this.#renderer.shadowMap.enabled = true;

        this.#canvas = this.#renderer.domElement;
        this.#stats = new Stats();

        visualizer.appendChild(this.#canvas);
        visualizer.appendChild(this.#stats.dom);
    }

    #initCamera() {
        const aspect = this.#canvas.width / this.#canvas.height;

        this.#camera = new THREE.PerspectiveCamera(75, aspect, 10, 4000);
        this.#camera.position.set(977, 443, 877);
        this.#camera.lookAt(new THREE.Vector3(172, 80, -20));

        this.#orbitControls = new OrbitControls(this.#camera, this.#canvas);
        this.#orbitControls.autoRotateSpeed = 0.1;
        this.#orbitControls.autoRotate = true;
        //controls.addEventListener('change', () => {
        //    console.log('position:', camera.position);
        //    console.log('target:', controls.target);
        //});
    }

    #addPointLight() {
        this.#pointLight = new THREE.PointLight(0xc9c893, 200000);
        this.#pointLight.position.set(-30, 90, -10);

        this.#pointLight.castShadow = true;
        this.#pointLight.shadow.camera.left = -10;
        this.#pointLight.shadow.camera.right = 10;
        this.#pointLight.shadow.camera.top = 10;
        this.#pointLight.shadow.camera.bottom = -10;
        this.#pointLight.shadow.camera.near = 1;
        this.#pointLight.shadow.camera.far = 70;
        this.#pointLight.shadow.mapSize.width = this.#canvas.width;
        this.#pointLight.shadow.mapSize.height = this.#canvas.height;

        const pointLightSphereSize = 20;
        const pointLightHelper = new THREE.PointLightHelper(this.#pointLight, pointLightSphereSize);

        this.#scene.add(pointLightHelper);
        this.#scene.add(this.#pointLight);
    }

    #addSurroundingCube() {
        const widthSegments = 20;
        const heightSegments = 20;
        const cubeGeometry = new THREE.BoxGeometry(
            AnimationController.CUBE_WIDTH,
            AnimationController.CUBE_HEIGHT,
            AnimationController.CUBE_DEPTH,
            widthSegments,
            heightSegments
        );

        this.#surroundingCube = this.#makeSurroundingCube(cubeGeometry, new THREE.Vector3(50, 50, 50));

        this.#scene.add(this.#surroundingCube);
    }

    #makeSurroundingCube(geometry, position) {
        const cubeMaterial = new THREE.MeshStandardMaterial({
            envMap: this.#environmentMap,
            envMapIntensity: 500.0,
            transparent: true,
            alphaMap: this.#alphaMap,
            opacity: 0.6,
            depthWrite: false
        });
        const cube = new THREE.Mesh(geometry, cubeMaterial);
        cube.position.set(position.x, position.y, position.z);

        return cube;
    }

    #addSpheres() {
        const sphereRadius = 5;
        const sphereWidthSegments = 12;
        const sphereHeightSegments = 12;
        const sphereGeometry = new THREE.SphereGeometry(sphereRadius, sphereWidthSegments, sphereHeightSegments);

        const positionArray = this.#particleWave.waves.top.geometry.attributes.position.array;
        const positionArrayBottom = this.#particleWave.waves.bottom.geometry.attributes.position.array

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

        this.#spheres.push(
            // left
            this.#makeSphere(sphereGeometry, new THREE.Vector3(sphereLeftX, sphereBottomY, sphereFrontZ)),
            this.#makeSphere(sphereGeometry, new THREE.Vector3(sphereLeftX, sphereTopY, sphereFrontZ)),
            this.#makeSphere(sphereGeometry, new THREE.Vector3(sphereLeftX, sphereBottomY, sphereBackZ)),
            this.#makeSphere(sphereGeometry, new THREE.Vector3(sphereLeftX, sphereTopY, sphereBackZ)),

            //right
            this.#makeSphere(sphereGeometry, new THREE.Vector3(sphereRightX, sphereBottomY, sphereFrontZ)),
            this.#makeSphere(sphereGeometry, new THREE.Vector3(sphereRightX, sphereTopY, sphereFrontZ)),
            this.#makeSphere(sphereGeometry, new THREE.Vector3(sphereRightX, sphereBottomY, sphereBackZ)),
            this.#makeSphere(sphereGeometry, new THREE.Vector3(sphereRightX, sphereTopY, sphereBackZ))
        );
    }

    #makeSphere(geometry, position, color = COLORS.skyBlueColor) {
        const material = new THREE.MeshStandardMaterial({
            color: color,
            envMap: this.#environmentMap,
            //alphaMap: alphaMap,
            transparent: true,
            opacity: 0.9,
            envMapIntensity: 80.0,
            depthWrite: false,
            wireframe: true,
        });

        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(position.x, position.y, position.z);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        sphere.metalness = 40;

        this.#scene.add(sphere);

        return sphere;
    }

    #rotateSpheres(time) {
        if (!this.#freezeIsChecked() && !this.#bypassIsChecked()) {
            this.#spheres.forEach((sphere, index) => {
                const speed = 1 + index * 0.1;
                const rotation = time * speed;
                sphere.rotation.y = rotation;
            });
        }
    }

    #addPlanes() {
        const planeGeometry = new THREE.PlaneGeometry(500, 400, 4, 4);
        const verticalPlaneGeometry = new THREE.PlaneGeometry(500, 250, 4, 4);
        const speakerStandGeometry = new THREE.PlaneGeometry(120, 100, 4, 4);
        const horizontalPlaneRotation = new THREE.Vector3(-Math.PI / 2, 0, 0);
        const verticalPlaneRotation = new THREE.Vector3(-Math.PI, 0, 0);
        this.#planes.push(
            this.#makePlane(planeGeometry, COLORS.bottomPlaneColor, new THREE.Vector3(10, -100, 50), horizontalPlaneRotation),
            //this.#makePlane(planeGeometry, COLORS.sidePlaneColor, new THREE.Vector3(50, 200, 50), horizontalPlaneRotation),
            this.#makePlane(verticalPlaneGeometry, COLORS.sidePlaneColor, new THREE.Vector3(10, 0, -90), verticalPlaneRotation),

            // speaker stands
            this.#makePlane(speakerStandGeometry, COLORS.speakerStandColor, new THREE.Vector3(-140, -20, -20), horizontalPlaneRotation),
            this.#makePlane(speakerStandGeometry, COLORS.speakerStandColor, new THREE.Vector3(160, -20, -20), horizontalPlaneRotation),
        );
    }

    #makePlane(geometry, color, position, rotation) {
        const material = new THREE.MeshStandardMaterial({
            color: color,
            envMap: this.#environmentMap,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
        });

        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.set(rotation.x, rotation.y, rotation.z)
        plane.position.set(position.x, position.y, position.z);
        plane.castShadow = true;

        this.#scene.add(plane);

        return plane;
    }

    #addLines() {
        this.#lines.push(
            // speaker stands
            this.#makeLine(-140, -140, -100, -20, -20, -20, COLORS.speakerStandColor),
            this.#makeLine(160, 160, -100, -20, -20, -20, COLORS.speakerStandColor),
        );
    }

    #makeLine(src_x, dest_x, src_y, dest_y, src_z, dest_z, color = COLORS.bottomPlaneColor) {
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
            envMap: this.#environmentMap,
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

        this.#scene.add(line);

        return line;
    }

    #setUserData() {
        this.#spheres.forEach((sphere) => {
            if (!sphere.userData.color) {
                sphere.userData.color = sphere.material.color.clone();
            }

            sphere.userData.originalScale = sphere.scale.clone();
            sphere.userData.originalPosition = sphere.position.clone();
        });

        this.#pointLight.userData.originalIntensity = this.#pointLight.intensity;
        this.#surroundingCube.userData.originalScale = this.#surroundingCube.scale.clone();
        this.#surroundingCube.userData.originalPosition = this.#surroundingCube.position.clone();
    }

    #bypassIsChecked() {
        return UI.bypassAndMono.bypass.element.checked;
    }

    #freezeIsChecked() {
        return UI.freeze.element.checked;
    }
}
