import * as Utility from './utility.js'
import ParticleSystem, { Vector3D } from 'three-nebula';
export default class NebulaParams {
    static minSpeed = 20;
    static maxSpeed = 60;

    static minLife = 4;
    static maxLife = 10;
    static dampingPercentage = 0.7;
    static roomSizePercentage = 0.3;

    static DEFAULT_LIFE = 0.2;
    static DEFAULT_SPEED = 0.2;

    static forceFloor = 2;
    static forceCeiling = 12;

    static minRadius = 40;
    static maxRadius = 60;

    static minDriftX = 30;
    static maxDriftX = 100;
    static minDriftY = 50;
    static maxDriftY = 150;
    static minDriftZ = 50;
    static maxDriftZ = 200;

    static minLeftVelocity = 2000;
    static maxLeftVelocity = -1000;
    static minRightVelocity = -2000;
    static maxRightVelocity = 1000;
    static leftYVelocity = 100;
    static leftZVelocity = 10;
    static rightYVelocity = 100;
    static rightZVelocity = 10;
    static velocityTheta = 30;

    #lifeScale = NebulaParams.DEFAULT_LIFE;
    #speedScale = NebulaParams.DEFAULT_SPEED;
    #radiusScale = NebulaParams.minRadius;

    #leftAxis = new Vector3D(
        NebulaParams.minLeftVelocity,
        NebulaParams.leftYVelocity,
        NebulaParams.leftZVelocity
    );

    #rightAxis = new Vector3D(
        NebulaParams.minRightVelocity,
        NebulaParams.rightYVelocity,
        NebulaParams.rightZVelocity
    )

    #visualParamsObject

    constructor(visualParams) {
        this.#visualParamsObject = visualParams
    }

    // << PUBLIC >>

    // used in nebulaSystem.handleOutputChange();
    // in onOutputChange(), pass an output scale to make output connected to life
    calculateLifeScale(outputScale = 1) {
        const roomSize = this.#visualParamsObject.currentSize;
        const damping = this.#visualParamsObject.currentDamp;
        
        const inverseDamping = 1 - damping;
        const combined = outputScale * (NebulaParams.dampingPercentage * inverseDamping +
            NebulaParams.roomSizePercentage * roomSize);


        const newLifeScale = this.#visualParamsObject.isLowOutput
            ? NebulaParams.DEFAULT_LIFE
            : Utility.getLinearScaledValue(
                NebulaParams.minLife,
                NebulaParams.maxLife,
                combined
            );
        
        //console.log("newLifeScale modified by outputScale: ", newLifeScale);

        return newLifeScale;
    }

    set lifeScale(newLifeScale) {
        this.#lifeScale = newLifeScale
    }

    get lifeScale() {
        return this.#lifeScale;
    }

    // used in onOutputChange()
    calculateSpeedScale(amplitude) {
        const logBase = 20;

        return this.#visualParamsObject.isLowOutput
            ? NebulaParams.DEFAULT_SPEED
            : Utility.getLogScaledValue(
                NebulaParams.minSpeed,
                NebulaParams.maxSpeed,
                amplitude,
                logBase);
    }

    set speedScale(newSpeedScale) {
        this.#speedScale = newSpeedScale;
    }

    get speedScale() {
        return this.#speedScale;
    }

    // used in onRoomSizeChange()
    calculateRadius() {
        return Utility.getLinearScaledValue(
            NebulaParams.minRadius,
            NebulaParams.maxRadius,
            this.#visualParamsObject.currentSize);
    }

    set radiusScale(newRadiusScale) {
        this.#radiusScale = newRadiusScale
    }

    get radiusScale() {
        return this.#radiusScale;
    }
    // used in onOutputChanged()
    forceValues(index) {
        return {
            x: this.forceX(index),
            y: this.forceY(),
            z: this.forceZ()
        }
    }

    // used in onWidthChange()
    calculateLeftOrRightAxisVector(emitterIndex) {
        return emitterIndex < 2
            ? this.#calculateLeftAxisVector()
            : this.#calculateRightAxisVector();
    }

    #calculateLeftAxisVector() {
        const logScale = 10;
        const scale = Utility.getLogScaledValue(
            NebulaParams.minLeftVelocity,
            NebulaParams.maxLeftVelocity,
            this.#visualParamsObject.currentWidth,
            logScale);

        this.#leftAxis = new Vector3D(scale, NebulaParams.leftYVelocity, NebulaParams.leftZVelocity);
        return this.#leftAxis;
    }

    #calculateRightAxisVector() {
        const logScale = 10;
        const scale = Utility.getLogScaledValue(
            NebulaParams.minRightVelocity,
            NebulaParams.maxRightVelocity,
            this.#visualParamsObject.currentWidth,
            logScale);

        this.#rightAxis = new Vector3D(scale, NebulaParams.rightYVelocity, NebulaParams.rightZVelocity);
        return this.#rightAxis;
    }

    get baseForce() {
        const logBase = 20;
        return Utility.getLogScaledValue(
            NebulaParams.forceFloor,
            NebulaParams.forceCeiling,
            this.speedScale,
            logBase,
        );
    }

    forceX(index) {
        return index < 2
            ? -(this.baseForce * 0.5 * (0.2 + this.#visualParamsObject.currentWidth))
            : (this.baseForce * 0.5 * (0.2 + this.#visualParamsObject.currentWidth))
    }

    forceY() {
        return this.baseForce * 0.4 * (0.4 + this.#visualParamsObject.currentWidth);
    }

    forceZ() {
        return this.baseForce * 0.7 * (0.6 + this.#visualParamsObject.currentWidth);
    }

    driftX() { 
        return this.scaledDriftValue(
            NebulaParams.minDriftX,
            NebulaParams.maxDriftX,
            this.#visualParamsObject.currentSize
        )
    }

    driftY() {
        return this.scaledDriftValue(
            NebulaParams.minDriftY,
            NebulaParams.maxDriftY,
            this.#visualParamsObject.currentSize
        )
    }

    driftZ() {
        return this.scaledDriftValue(
            NebulaParams.minDriftZ,
            NebulaParams.maxDriftZ,
            this.#visualParamsObject.currentSize
        )
    }

    get driftValues() {
        return {
            x: this.driftX(),
            y: this.driftY(),
            z: this.driftZ(),
            delay: 0.2,
            life: 3,
        }
    }

    scaledDriftValue(min, max, roomSize) {
        return Utility.getLinearScaledValue(min, max, roomSize);
    }
}