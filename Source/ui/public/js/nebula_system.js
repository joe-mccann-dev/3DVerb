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
    ColorSpan,
    RandomDrift,
    Gravity,
    ease,
} from 'three-nebula';

import * as COLORS from './colors.js';
import NebulaParams from './nebula_params.js';
import * as Utility from './utility.js';

export default class NebulaSystem {

    static EMITTER_LEFT_X = -140;
    static EMITTER_RIGHT_X = 160;
    static EMITTER_Y = 10;
    static EMITTER_Z = 10;
    static NUM_EMITTERS = 4;

    #nebulaParams;
    #particleSystem;
    #sprite;
    #emitters;
    #scene;
    #THREE;
    #surroundingCube;

    constructor(nebulaParams, scene, threeModule, surroundingCube) {
        this.#nebulaParams = nebulaParams;
        this.#scene = scene;
        this.#THREE = threeModule;
        this.#particleSystem = new ParticleSystem();
        this.#sprite = this.#createSprite();
        this.#emitters = this.#createEmitters();
  
        this.#particleSystem.addRenderer(
            new SpriteRenderer(
                this.#scene,
                this.#THREE));
        this.#surroundingCube = surroundingCube;
    }

    // << PUBLIC >>
    get particleSystem() {
        return this.#particleSystem;
    }

    animateEmitterPositions(theta, emitterRadius) {
        for (let i = 0; i < NebulaSystem.NUM_EMITTERS; i++) {
            const currentEmitter = this.#emitters[i];
            const isLeft = i < 2;
            const baseX = isLeft ? NebulaSystem.EMITTER_LEFT_X : NebulaSystem.EMITTER_RIGHT_X;
            const baseY = NebulaSystem.EMITTER_Y;
            const baseZ = NebulaSystem.EMITTER_Z;

            const angle = theta + (i % 2 === 0 ? 0 : Math.PI / 2);

            currentEmitter.position.x = baseX + emitterRadius * Math.cos(angle);
            currentEmitter.position.y = baseY + emitterRadius * Math.sin(angle);
            currentEmitter.position.z = baseZ;

        }
    }

    handleOutputChange(amplitude, currentOutput) {
        const outputScaleForLife = Utility.getLogScaledValue(1, amplitude, (1 / -currentOutput), 10)
        //console.log("outputScaleForLife: ", outputScaleForLife);

        this.#nebulaParams.lifeScale = this.#nebulaParams.calculateLifeScale(outputScaleForLife);
        this.#nebulaParams.speedScale = this.#nebulaParams.calculateSpeedScale(amplitude);

        //console.log("this.#nebulaParams.lifeScale: ", this.#nebulaParams.lifeScale);

        this.#emitters.forEach((emitter, emitterIndex) => {
            emitter.initializers = emitter.initializers.filter((i) => i.type !== 'Life');
            const newLifeInitializer = new Life(this.#nebulaParams.lifeScale);

            emitter.initializers.push(newLifeInitializer);

            const radialVelocity = emitter.initializers.find(i => i.type === 'RadialVelocity');
            radialVelocity.radiusPan = new Span(this.#nebulaParams.speedScale);

            emitter.behaviours = emitter.behaviours.filter(b => b.type !== 'Force');
            const forceValues = this.#nebulaParams.forceValues(emitterIndex);
            const newForce = new Force(
                forceValues.x,
                forceValues.y,
                forceValues.z
            );
            emitter.behaviours.push(newForce);

            this.#handleParticlesCollidingWithCube(emitter);
        });
    }

    handleRoomSizeChange() {
        this.resetParticles();

        this.#nebulaParams.radiusScale = this.#nebulaParams.calculateRadius();
        this.#nebulaParams.lifeScale = this.#nebulaParams.calculateLifeScale();

        this.#emitters.forEach((emitter) => {
            emitter.initializers = emitter.initializers.filter((i) => i.type !== 'Radius' && i !== 'Life' );
            const newRadiusInitializer = new Radius(this.#nebulaParams.radiusScale);
            const newLifeInitializer = new Life(this.#nebulaParams.lifeScale);

            console.log("newLifeScale in roomSizeChange: ", this.#nebulaParams.lifeScale);

            emitter.initializers.push(newRadiusInitializer);
            emitter.initializers.push(newLifeInitializer);

            const lifeInitializer = emitter.initializers.find(i => i.type === 'Life');
            lifeInitializer.lifePan = new Span(this.#nebulaParams.lifeScale);


            emitter.behaviours = emitter.behaviours.filter(b => b.type !== 'RandomDrift');
            const driftValues = this.#nebulaParams.driftValues;
            const newRandomDriftBehaviour = new RandomDrift(
                driftValues.x,
                driftValues.y,
                driftValues.z,
                driftValues.delay,
                driftValues.life,
                ease.easeOutSine);

            emitter.behaviours.push(newRandomDriftBehaviour);
        });
    }

    handleWidthChange() {
        this.#emitters.forEach((emitter, emitterIndex) => {
            emitter.initializers = emitter.initializers.filter(initializer => initializer.type !== 'RadialVelocity');
            const axis = this.#nebulaParams.calculateLeftOrRightAxisVector(emitterIndex);
            const newRadialVelocity = new RadialVelocity(this.#nebulaParams.speedScale, axis, NebulaParams.velocityTheta);
            //console.log(newRadialVelocity.dir);
            emitter.initializers.push(newRadialVelocity);
        });
    }

    // prevent particles from "floating" outside cuboid when decreasing room size
    resetParticles() {
        this.#emitters.forEach((emitter) => {
            emitter.particles.forEach((particle) => {
                particle.dead = true;
            });
        });
    }

    stopEmitting() {
        this.#emitters.forEach(emitter => emitter.stopEmit());
    }

    resumeEmitting() {
        this.#emitters.forEach((emitter) => {
            if (!emitter.isEmitting) {
                emitter.emit();
            }
        });
    }

    // << PRIVATE >>
    #createSprite() {
        const spriteMap = new this.#THREE.TextureLoader().load('assets/PNG/flare_01.png');
        const spriteMaterial = new this.#THREE.SpriteMaterial({
            map: spriteMap,
            color: COLORS.spriteColor,
            blending: this.#THREE.AdditiveBlending,
            fog: true,
        });
        return new this.#THREE.Sprite(spriteMaterial);
    }

    #createEmitters() {
        const result = [];
        for (let i = 0; i < NebulaSystem.NUM_EMITTERS; i++) {
            if (i < 2) {
                result.push(this.#createEmitter())
            } else {
                result.push(this.#createEmitter({ radialVelocity: { axis: new Vector3D(200, 0, 10) } }));
            }
        }
        return result;
    }

    #createEmitter(options = {}) {
        const emitter = new Emitter()
            .setRate(new Rate(2, 0.2))
            .setInitializers(this.#getStandardInitializers(options))
            .setBehaviours(this.#getStandardBehaviours(options));

        this.#addEmitterToParticleSystem(emitter);
        return emitter;
    }

    #addEmitterToParticleSystem(emitter) {
        this.#particleSystem.addEmitter(emitter);
    }

    #handleParticlesCollidingWithCube(emitter) {
        if (emitter) {
            const cubeGeometryParams = this.#surroundingCube.geometry.parameters;
            const cubeHalfDepth = cubeGeometryParams.depth * 0.5;
            const cubeHalfHeight = cubeGeometryParams.height * 0.5;
            const cubeHalfWidth = cubeGeometryParams.width * 0.5;

            const cubeScaleVector3 = this.#surroundingCube.userData.scale;
            const reflectionBuffer = 80;
            const MAX_VELOCITY = 250;

            if (cubeScaleVector3) {
                const cubeScaleZ = cubeScaleVector3.z;
                const cubeScaleY = cubeScaleVector3.y;
                const cubeScaleX = cubeScaleVector3.x;

                const cubeLeftFaceX = (this.#surroundingCube.position.x) - (cubeHalfWidth * cubeScaleX);
                const cubeRightFaceX = (this.#surroundingCube.position.x) + (cubeHalfWidth * cubeScaleX)

                const cubeTopFaceY = (this.#surroundingCube.position.y + (cubeHalfHeight * cubeScaleY));
                const cubeBottomFaceY = (this.#surroundingCube.position.y - (cubeHalfHeight * cubeScaleY));

                const cubeFrontFaceZ = (this.#surroundingCube.position.z + (cubeHalfDepth * cubeScaleZ));
                const cubeBackFaceZ = (this.#surroundingCube.position.z - (cubeHalfDepth * cubeScaleZ));

                emitter.particles.forEach((particle, index) => {
                    const forceBehaviour = particle.behaviours.find((behaviour) => {
                        return behaviour.type === "Force";
                    });

                    if (particle.position.z >= cubeFrontFaceZ - reflectionBuffer) {
                        particle.velocity.z *= this.#reverseVelocityFactor(index);
                        forceBehaviour.force.z *= this.#reverseForceFactor(index);

                        //particle.addBehaviour(
                        //    new Color(new ColorSpan(COLORS.spriteColors), new ColorSpan(COLORS.rainbowColors), 0.5)
                        //);
                    }

                    if (particle.position.z <= cubeBackFaceZ + reflectionBuffer) {
                        particle.velocity.z *= this.#reverseVelocityFactor(index);
                        forceBehaviour.force.z *= this.#reverseForceFactor(index);
                    }

                    if (particle.position.y >= cubeTopFaceY - reflectionBuffer) {
                        particle.velocity.y *= this.#reverseVelocityFactor(index, 2 + Math.random());
                        forceBehaviour.force.y *= this.#reverseForceFactor(index);

                    }

                    if (particle.position.y <= cubeBottomFaceY + reflectionBuffer) {
                        particle.velocity.y *= this.#reverseVelocityFactor(index, 2 + Math.random());
                        forceBehaviour.force.y *= this.#reverseForceFactor(index);
                    }

                    if (particle.position.x <= cubeLeftFaceX + reflectionBuffer) {
                        particle.velocity.x *= this.#reverseVelocityFactor(index, 2 + Math.random());
                        forceBehaviour.force.x *= this.#reverseForceFactor(index);
                    }

                    if (particle.position.x >= cubeRightFaceX - reflectionBuffer) {
                        particle.velocity.x *= this.#reverseVelocityFactor(index, 2 + Math.random());
                        forceBehaviour.force.x *= this.#reverseForceFactor(index);
                    }

                    particle.velocity.clampLength(0, MAX_VELOCITY);

                    if (particle.position.x < cubeLeftFaceX - reflectionBuffer ||
                        particle.position.x > cubeRightFaceX + reflectionBuffer) {
                        particle.dead = true;
                    }
                });
            }
        }
    }

    #reverseVelocityFactor(index, multiplier = 1) {
        return (-1.0) * (multiplier * Math.sin((1 / index) + Math.random()));
    }

    #reverseForceFactor(index, multiplier = 1) {
        return (-1.0) * (multiplier * Math.cos((1 / index) + Math.random()));
    }

    #getStandardInitializers(options = {}) {
        return [
            new Mass(options.mass ?? new Span(2, 4), new Span(20, 40)),
            new Life(options.life ?? 5),
            new Body(this.#sprite),
            new Radius(options.radius ?? 80),
            new RadialVelocity(
                options.radialVelocity?.speed ?? new Span(20, 60),
                options.radialVelocity?.axis ?? new Vector3D(-200, 50, 10),
                options.radialVelocity?.theta ?? 20,
            )
        ];
    }

    #getStandardBehaviours(options = {}, emitter) {
        return [
            new Alpha(
                options.alpha?.alphaA ?? 1,
                options.alpha?.alphaB ?? 0.75,
            ),
            new Color(
                options.color?.colorA ?? new ColorSpan(COLORS.spriteColors),
                options.color?.colorB ?? new ColorSpan(COLORS.spriteColors)
            ),
            new Scale(
                options.scale?.scaleA ?? 1,
                options.scale?.scaleB ?? 0.5
            ),
            new Collision(
                options.collision?.emitter ?? emitter,
                options.collision?.useMass ?? true,
            ),
            new Gravity(1.2),
            new Force(
                options.force?.fx ?? 0.2,
                options.force?.fy ?? 0.2,
                options.force?.fz ?? 0.2,
            ),
            new RandomDrift(
                options.randomDrift?.driftX ?? 50,
                options.randomDrift?.driftY ?? 120,
                options.randomDrift?.driftZ ?? 250,
                options.randomDrift?.delay ?? 0.2,
                options.randomDrift?.life ?? 3,
                options.randomDrift?.ease ?? ease.easeOutSine
            )
        ];
    }
}
