
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
const fuchsia600 = 0xc026d3;
// END COLORS

// THREE JS CODE
const scene = new Scene();
const renderer = new WebGLRenderer({ antialias: true });

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
const camera = new PerspectiveCamera(50, aspect, 0.1, 32);

camera.position.set(0, -12, 12); 
camera.lookAt(new Vector3(0, 0, 0));

const light = new DirectionalLight(0xffffed, 3);
light.position.set(0, -14, 16);
light.castShadow = true;

// (Optional) Adjust shadow camera for better coverage and quality
light.shadow.camera.left = -10;
light.shadow.camera.right = 10;
light.shadow.camera.top = 10;
light.shadow.camera.bottom = -10;
light.shadow.camera.near = 1;
light.shadow.camera.far = 50;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
scene.add(light);

const ambientLight = new AmbientLight(0xffffed, 0.5);
scene.add(ambientLight);
scene.background = new Color(mediumDarkGray);

const pmrem = new PMREMGenerator(renderer).fromScene(scene);

const sphereRadius = 0.4;
const sphereWidthSegments = 8;
const sphereHeightSegments = 10;
const sphereGeometry = new SphereGeometry(sphereRadius, sphereWidthSegments, sphereHeightSegments);
const centerSphereRadius = 0.6;
const centerSphereGeometry = new SphereGeometry(centerSphereRadius, sphereWidthSegments, sphereHeightSegments);


const spheres = [
    makeSphere(sphereGeometry, mediumIndigo, [-5, -4, 0]),
    makeSphere(sphereGeometry, darkGray, [-5, 4, 0]),
    makeSphere(sphereGeometry, mediumDarkAmber, [5, 4, 0]),
    makeSphere(sphereGeometry, lightYellow, [5, -4, 0]),
    makeSphere(centerSphereGeometry, lightIndigo, [0, 0, 0]),
];

function makeSphere(geometry, color, positions) {
    const material = new MeshStandardMaterial({ color: color, envMap: pmrem });

    const sphere = new Mesh(geometry, material);
    scene.add(sphere);

    sphere.position.set(positions[0], positions[1], positions[2]);

    sphere.castShadow = true;
    sphere.receiveShadow = true;

    return sphere;
}


const lines = [
    addLineGeometry(-5, 5, 4, 4, 0, 0, fuchsia600),
    addLineGeometry(-5, -5, 4, -4, 0, 0, fuchsia600),
    addLineGeometry(-5, 5, -4, -4, 0, 0, fuchsia600),
    addLineGeometry(5, 5, -4, 4, 0, 0, fuchsia600),

    // lines connecting to center sphere
    addLineGeometry(-5, 0, 4, 0, 0, 6),
    addLineGeometry(5, 0, 4, 0, 0, 6),
    addLineGeometry(-5, 0, -4, 0, 0, 6),
    addLineGeometry(5, 0, -4, 0, 0, 6),

    // lines connecting to bottom
    addLineGeometry(-5, 0, -4, 0, 0, -4, lightYellow),
    addLineGeometry(-5, 0, 4, 0, 0, -4, lightYellow),
    addLineGeometry(5, 0, 4, 0, 0, -4, lightYellow),
    addLineGeometry(5, 0, -4, 0, 0, -4  , lightYellow),
]

const planeGeometry = new PlaneGeometry(17.5, 18);
const planeMaterial = new MeshStandardMaterial({ color: 0x64748b });
const plane = new Mesh(planeGeometry, planeMaterial);
//plane.rotation.x = Math.PI / 6;
plane.position.y = 6; 
plane.position.z = -6;
plane.position.x = 0;
plane.receiveShadow = true;
scene.add(plane);

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
        wireframe: true
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
    sphereRadius,
}
