import * as Utility from './utility.js'
import ParticleSystem, { Vector3D } from 'three-nebula';
export default class NebulaParams {
    static minSpeed = 20;
    static maxSpeed = 80;

    static minLife = 4;
    static maxLife = 16;

    static DEFAULT_LIFE = 0.2;
    static DEFAULT_SPEED = 0.2;

    static forceFloor = 2;
    static forceCeiling = 12;

    static minRadius = 30;
    static maxRadius = 80;

    static minDriftX = 30;
    static maxDriftX = 100;
    static minDriftY = 50;
    static maxDriftY = 150;
    static minDriftZ = 50;
    static maxDriftZ = 200;

    static minLeftVelocity = 150;
    static maxLeftVelocity = -600;
    static minRightVelocity = -150;
    static maxRightVelocity = 600;
    static leftYVelocity = -100;
    static leftZVelocity = 10;
    static rightYVelocity = 100;
    static rightZVelocity = 10;
    static velocityTheta = 20;

    #lifeScale
    #speedScale
    #radiusScale
    #leftAxis
    #rightAxis

    #visualParamsObject

    constructor(visualParams) {
        this.#visualParamsObject = visualParams
    }

    get visualParamsObject() { return this.#visualParamsObject }

    get lifeScale() {
        return this.#lifeScale;
    }
    set lifeScale(newLifeScale) {
        this.#lifeScale = newLifeScale
    }

    calculateLifeScale() {
        const roomSize = this.visualParamsObject.currentSize;
        const damping = this.visualParamsObject.currentDamp;
        const inverseDamping = 1 - damping;
        const dampFactor = 0.4;
        const roomFactor = 0.6
        const combined = dampFactor * inverseDamping + roomFactor * roomSize;

        if (this.visualParamsObject.isLowOutput) {
            return NebulaParams.DEFAULT_LIFE;
        } else {
            return Utility.getLinearScaledValue(
                NebulaParams.minLife,
                NebulaParams.maxLife,
                combined
            );
        }
    }

    get speedScale() {
        return this.#speedScale;
    }

    set speedScale(newSpeedScale) {
        this.#speedScale = newSpeedScale;
    }

    calculateSpeedScale(amplitude) {
        if (this.visualParamsObject.isLowOutput) {
            return NebulaParams.DEFAULT_SPEED;
        } else {
            const logBase = 2;
            return Utility.getLogScaledValue(
                NebulaParams.minSpeed,
                NebulaParams.maxSpeed,
                amplitude,
                logBase);
        }
    }

    get radiusScale() {
        return this.#radiusScale;
    }
    set radiusScale(newRadiusScale) {
        this.#radiusScale = newRadiusScale
    }

    calculateRadius() {
        return Utility.getLinearScaledValue(
            NebulaParams.minRadius,
            NebulaParams.maxRadius,
            this.visualParamsObject.currentSize);
    }

    get leftAxis() {
        return this.#leftAxis;
    }

    set leftAxis(newLeftAxis) {
        this.#leftAxis = newLeftAxis;
    }

    calculateLeftAxisVector() {
        const scale = Utility.getLogScaledValue(
            NebulaParams.minLeftVelocity,
            NebulaParams.maxLeftVelocity,
            this.visualParamsObject.currentWidth,
            Math.E);

        return new Vector3D(scale, NebulaParams.leftYVelocity, NebulaParams.leftZVelocity);
    }

    get rightAxis() {   
        return this.#rightAxis;
    }
    set rightAxis(newRightAxis) {
        this.#rightAxis = newRightAxis
    }

    calculateRightAxisVector() {
        const scale = Utility.getLogScaledValue(
            NebulaParams.minRightVelocity,
            NebulaParams.maxRightVelocity,
            this.visualParamsObject.currentWidth,
            Math.E);

        return new Vector3D(scale, NebulaParams.rightYVelocity, NebulaParams.rightZVelocity);
    }

    get baseForce() {
        //console.log("this.speedScale: ", this.speedScale);
        return Utility.getLogScaledValue(
            NebulaParams.forceFloor,
            NebulaParams.forceCeiling,
            this.speedScale,
            Math.E
        );
    }

    forceX(index) {
        return index < 2
            ? -(this.baseForce * 0.5)
            : this.baseForce * 0.5;
    }

    forceY() {
        return this.baseForce * 0.4;
    }

    forceZ() {
        return this.baseForce;
    }

    forceValues(index) {
        return {
            x: this.forceX(index),
            y: this.forceY(),
            z: this.forceZ()
        }
    }

    driftX() { 
        return this.scaledDriftValue(
            NebulaParams.minDriftX,
            NebulaParams.maxDriftX,
            this.visualParamsObject.currentSize
        )
    }

    driftY() {
        return this.scaledDriftValue(
            NebulaParams.minDriftY,
            NebulaParams.maxDriftY,
            this.visualParamsObject.currentSize
        )
    }

    driftZ() {
        return this.scaledDriftValue(
            NebulaParams.minDriftZ,
            NebulaParams.maxDriftZ,
            this.visualParamsObject.currentSize
        )
    }

    get driftValues() {
        return {
            x: this.driftX(),
            y: this.driftY(),
            z: this.driftZ()
        }
    }

    scaledDriftValue(min, max, roomSize) {
        return Utility.getLinearScaledValue(min, max, roomSize);
    }
}