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
    constructor(nebulaParams, scene, threeModule) {
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
    }

    // << PUBLIC >>
    get particleSystem() {
        return this.#particleSystem;
    }

    // https://github.com/creativelifeform/three-nebula/blob/master/website/components/Examples/EightDiagrams/init.js
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

    handleOutputChange(amplitude, currentOutput, surroundingCube) {
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

            this.#handleParticlesCollidingWithCube(emitter, surroundingCube);
        });
    }

    handleRoomSizeChange() {
        this.resetParticles();

        this.#nebulaParams.radiusScale = this.#nebulaParams.calculateRadius();
        // in handleOutputChange() outputScaleForLife is passed in to calculateLifeScale to further modulate lifeScale based on output
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
        const spriteMap = new this.#THREE.TextureLoader().load('assets/sprites/flare_01.png');
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
            .setRate(new Rate(2, 0.46))
            .setInitializers(this.#getStandardInitializers(options))
            .setBehaviours(this.#getStandardBehaviours(options));

        this.#addEmitterToParticleSystem(emitter);
        return emitter;
    }

    #addEmitterToParticleSystem(emitter) {
        this.#particleSystem.addEmitter(emitter);
    }

    #handleParticlesCollidingWithCube(emitter, surroundingCube) {
        if (emitter) {
            const cubeGeometryParams = surroundingCube.geometry.parameters;
            const cubeHalfDepth = cubeGeometryParams.depth * 0.5;
            const cubeHalfHeight = cubeGeometryParams.height * 0.5;
            const cubeHalfWidth = cubeGeometryParams.width * 0.5;

            const cubeScaleVector3 = surroundingCube.userData.scale;
            const reflectionBuffer = 80;
            const MAX_VELOCITY = 220;

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


                    if (particle.position.z >= cubeFrontFaceZ - reflectionBuffer) {
                        particle.velocity.z *= this.#reverseVelocityFactor(index);
                        forceBehaviour.force.z *= this.#reverseForceFactor(index);


                        if (this.#nebulaParams.visualParamsObject.currentDamp > 0.45) {
                            particle.addBehaviour(
                                new Color(new ColorSpan(COLORS.spriteColors), new ColorSpan(COLORS.dampingColors), 1 / (this.#nebulaParams.lifeScale), ease.easeOutSine)
                            );

                            // fade out particle to slightly less than its alpha at emission time
                            particle.addBehaviour(
                                new Alpha(1, 0.72)
                            )

                            // scale particle back down to slightly smaller than its size at emission time
                            particle.addBehaviour(
                                new Scale(1, 0.94)
                            )
                        }
                        
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
            // slight fade in
            new Alpha(
                options.alpha?.alphaA ?? 0.75,
                options.alpha?.alphaB ?? 1.0,
            ),
            new Color(
                options.color?.colorA ?? new ColorSpan(COLORS.spriteColors),
                options.color?.colorB ?? new ColorSpan(COLORS.spriteColors)
            ),
            // slight scale up
            new Scale(
                options.scale?.scaleA ?? 0.75,
                options.scale?.scaleB ?? 1.0
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
