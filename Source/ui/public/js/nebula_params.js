import * as Utility from './utility.js'
import ParticleSystem, { Vector3D } from 'three-nebula';
export default class NebulaParams {
    static minSpeed = 20;
    static maxSpeed = 80;

    static minLife = 4;
    static maxLife = 10;
    static dampingPercentage = 0.7;
    static roomSizePercentage = 0.3;

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
        const logBase = 2;

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
        const logScale = 20;
        const scale = Utility.getLogScaledValue(
            NebulaParams.minLeftVelocity,
            NebulaParams.maxLeftVelocity,
            this.#visualParamsObject.currentWidth,
            logScale);

        this.#leftAxis = new Vector3D(scale, NebulaParams.leftYVelocity, NebulaParams.leftZVelocity);
        return this.#leftAxis;
    }

    #calculateRightAxisVector() {
        const logScale = 20;
        const scale = Utility.getLogScaledValue(
            NebulaParams.minRightVelocity,
            NebulaParams.maxRightVelocity,
            this.#visualParamsObject.currentWidth,
            logScale);

        this.#rightAxis = new Vector3D(scale, NebulaParams.rightYVelocity, NebulaParams.rightZVelocity);
        return this.#rightAxis;
    }

    get baseForce() {
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