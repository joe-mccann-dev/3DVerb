
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    Color,
    Line,
    LineBasicMaterial,
    BufferGeometry,
    BufferAttribute,
    DirectionalLight,
    AmbientLight,
    CircleGeometry,
    MeshBasicMaterial,
    Mesh

} from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { AnimationMixer } from 'three/src/animation/AnimationMixer.js';

// COLORS
const lightIndigo = 0xBFDBFE;
const mediumIndigo = 0x6366F1;
const darkIndigo = 0x3730A3;
const mediumDarkGray = 0x374151;
const darkGray = 0x111827;
const mediumDarkAmber = 0xB45309;
const coolBlue = 0x60A5FA;
// END COLORS

// THREE JS CODE
const scene = new Scene();
const camera = new PerspectiveCamera(75, (window.innerWidth / window.innerHeight), 0.1, 1000);
const renderer = new WebGLRenderer();

const visualizer = document.getElementById("visualizer");
const visualizerStyle = getComputedStyle(visualizer);
renderer.setSize(parseInt(visualizerStyle.width), parseInt(visualizerStyle.height));
visualizer.appendChild(renderer.domElement);

camera.position.set(10, -5, 20);
camera.lookAt(0, 3, 0);

const loader = new GLTFLoader();
const mixer = new AnimationMixer();

// https://sketchfab.com/3d-models/blue-flower-animated-c20b1f12833148e09f7f49c3dd444906
let animationClip;
loader.load('assets/Blue_end.glb', function (glb) {

    const threeD_Object = glb.scene;
    threeD_Object.scale.set(200, 200, 200);
    threeD_Object.rotateZ(47);
    threeD_Object.rotateY(45);
    threeD_Object.rotateX(-54);
    animationClip = glb.animations[0];
    //const track0 = animationClip["tracks"][0];
    let duration = animationClip["duration"];
    //duration = 20.0;
    animationClip.duration = duration;
    //console.log("duration: ", duration);
    //let track0_times = track0["times"][0];
    //track0_times = 0.56;
    //console.log("track0_times:", track0_times);
    //console.log("track0: ", track0);
    ////animaionClip.duration = 4;
    console.log("animationClip: ", animationClip);
    let action = mixer.clipAction(animationClip, threeD_Object);
    action.play();
    scene.add(threeD_Object);

}, undefined, function (error) {
    console.error(error);
});

const light = new DirectionalLight(0xffffed, 1);
light.position.set(1, 1, 5);
scene.add(light);

const ambientLight = new AmbientLight(0x404040);
scene.add(ambientLight);

scene.background = new Color(mediumDarkGray);

const geometry = new CircleGeometry(6, 32);

let material = new MeshBasicMaterial({ color: mediumDarkAmber });
const circle = new Mesh(geometry, material);
console.log(circle);

scene.add(circle);

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    mixer.update(1 / 60);
}

export {
    animate,
    circle,
    animationClip,
    Color,
    coolBlue,
    mediumDarkAmber
}
