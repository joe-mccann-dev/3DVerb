import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { environmentMap, addToSceneAndObjects } from './animated.js';

const loader = new GLTFLoader();
const speakersPromise = new Promise((resolve, reject) => {
    loader.load('assets/krk_classic_5_studio_monitor_speaker.glb', function (glb) {
        const speakers = [];
        const leftSpeaker = glb.scene;
        leftSpeaker.envMap = environmentMap;
        leftSpeaker.receiveShadow = true;
        leftSpeaker.scale.set(45, 45, 45);     
        leftSpeaker.position.set(-140, -20, -20);
        speakers.push(leftSpeaker);

        const rightSpeaker = leftSpeaker.clone();
        rightSpeaker.envMap = environmentMap;
        rightSpeaker.position.x += 300;

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
        carpet.scale.set(120, 100, 100);
        carpet.position.set(10, -98, 85);

        resolve(carpet);
    }, undefined, reject);
});

const lampPromise = new Promise((resolve, reject) => {
    loader.load('assets/floor_lamp.glb', function (glb) {
        const lamp = glb.scene;
        lamp.envMap = environmentMap;
        lamp.receiveShadow = true;
        lamp.castShadow = true;
        lamp.scale.set(100, 100, 100);
        lamp.position.set(-30, 0, -10);
        lamp.rotateY(Math.PI / 4)

        resolve(lamp);
    }, undefined, reject);
});

const panelPromise = new Promise((resolve, reject) => {
    loader.load('assets/wall_wood_panels.glb', function (glb) {
        const panel = glb.scene;
        panel.envMap = environmentMap;
        panel.receiveShadow = true;
        panel.scale.set(150, 150, 150);
        panel.position.set(-25, -10, -80);
        panel.rotateZ(Math.PI / 2);

        resolve(panel);
    }, undefined, reject);
});

const plantPromise = new Promise((resolve, reject) => {
    loader.load('assets/tall_house_plant.glb', function (glb) {
        const plant = glb.scene;
        plant.envMap = environmentMap;
        plant.receiveShadow = true;
        plant.castShadow = true;
        plant.scale.set(0.35, 0.35, 0.35);
        plant.position.set(60, -80, 90);

        resolve(plant);
    }, undefined, reject);
});

const soundPanelPromise = new Promise((resolve, reject) => {
    loader.load('assets/sound_proof_panel.glb', function (glb) {
        const panel = glb.scene;

        panel.envMap = environmentMap;
        panel.scale.set(5, 5, 5);
        panel.position.set(55, 45, -90);
        panel.rotateX(Math.PI / 2);

        resolve(panel);
    }, undefined, reject);
});

function addModelsToScene() {
    speakersPromise.then((speakers) => {
        speakers.forEach((speaker) => {
            addToSceneAndObjects(speaker);
        });
    });
    carpetPromise.then((carpet) => {
        addToSceneAndObjects(carpet);
    });
    lampPromise.then((lamp) => {
        addToSceneAndObjects(lamp);
    });
    panelPromise.then((panel) => {
        addToSceneAndObjects(panel);
    });
    plantPromise.then((plant) => {
        addToSceneAndObjects(plant);
    });
    soundPanelPromise.then((soundPanel) => {
        addToSceneAndObjects(soundPanel);
    });
}

export {
    addModelsToScene,
}
