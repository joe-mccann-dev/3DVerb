import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { scene, environmentMap, objects } from './animated.js';

const loader = new GLTFLoader();
const speakersPromise = new Promise((resolve, reject) => {
    loader.load('assets/krk_classic_5_studio_monitor_speaker.glb', function (glb) {
        const speakers = [];
        const leftSpeaker = glb.scene;
        leftSpeaker.envMap = environmentMap;
        leftSpeaker.receiveShadow = true;
        leftSpeaker.scale.set(26, 26, 26);     
        leftSpeaker.position.set(-20, 50, -20);
        speakers.push(leftSpeaker);
        scene.add(leftSpeaker);

        const rightSpeaker = leftSpeaker.clone();
        rightSpeaker.envMap = environmentMap;
        rightSpeaker.position.x += 140;

        speakers.push(rightSpeaker);

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

        resolve(carpet);
    }, undefined, reject);
});

const lampPromise = new Promise((resolve, reject) => {
    loader.load('assets/floor_lamp.glb', function (glb) {
        const lamp = glb.scene;
        lamp.envMap = environmentMap;
        lamp.receiveShadow = true;
        lamp.castShadow = true;
        lamp.scale.set(70, 70, 70);
        lamp.position.set(25, 60, -10);
        lamp.rotateY(Math.PI / 4)

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
        panel.position.set(60, 10, -40);
        panels.push(panel);

        resolve(panels);
    }, undefined, reject);
});

const plantPromise = new Promise((resolve, reject) => {
    loader.load('assets/tall_house_plant.glb', function (glb) {
        const plant = glb.scene;
        plant.envMap = environmentMap;
        plant.receiveShadow = true;
        plant.castShadow = true;
        plant.scale.set(0.24, 0.24, 0.24);
        plant.position.set(80, 5, 10);

        resolve(plant);
    }, undefined, reject);
});

const soundPanelsPromise = new Promise((resolve, reject) => {
    loader.load('assets/sound_proof_panel.glb', function (glb) {
        const panels = [];
        const panel = glb.scene;
        panel.envMap = environmentMap;
        panel.position.set(70, 145, -46);
        panel.rotateX(Math.PI / 2);

        panel.scale.set(4, 4, 4);
        panels.push(panel);

        resolve(panels);
    }, undefined, reject);
});

function addModelsToScene() {
    speakersPromise.then((speakers) => {
        speakers.forEach((speaker) => {
            scene.add(speaker);
            objects.push(speaker);
        })
    });
    carpetPromise.then((carpet) => {
        scene.add(carpet);
        objects.push(carpet);
    });
    lampPromise.then((lamp) => {
        scene.add(lamp);
        objects.push(lamp);
    });
    panelsPromise.then((panels) => {
        panels.forEach((panel) => {
            scene.add(panel);
            objects.push(panel);
        });
    });
    plantPromise.then((plant) => {
        scene.add(plant);
        objects.push(plant);
    });
    soundPanelsPromise.then((soundPanels) => {
        soundPanels.forEach((soundPanel) => {
            scene.add(soundPanel);
            objects.push(soundPanel);
        })
    });
}

addModelsToScene();
