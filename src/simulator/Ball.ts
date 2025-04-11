import * as THREE from "three";
import { GRAVITY } from "../utils/constants";
import {
    CatchEvent,
    ThrowEvent,
    TablePutEvent,
    TableTakeEvent,
    BallTimelineEvent,
    BallTimeline
} from "./Timeline";
import { Juggler } from "./Juggler";

// TODO : CamelCase for every variable.
//TODO : Make errors thrown be console log when not in debug mode to prevent app blocking ?
//TODO : Better encapsulate what parameters are dependent on which (for ex, ofor combo mesh + radius)
interface BallConstructorInterface {
    radius?: number;
    mesh?: THREE.Mesh;
    id?: string;
    timeline?: BallTimeline;
    // default_table?: Table;
    defaultJuggler?: Juggler;
    sound?: {
        node: THREE.Audio | THREE.PositionalAudio;
        buffers: Map<string, AudioBuffer>;
    };
}

// function create_audio(note_name: string): HTMLAudioElement {
//     throw new Error("Not implemented");
// }

//TODO : Fusionner les évènements de main et de balles ?
//TODO : Defaults for constructors here and in simulator
//TODO : Checks that hand/ball examined is indeed for this ball / hand and not another ?
//TODO : Remove Tone to only use WebAudio API / THREEjs audio.
//TODO : Better handling of sound when ball is caught / is launched / is flying (unify this ?)
//TODO : At some point, custom sound nodes ?
//TODO : Pause / Unpause sound.

export class Ball {
    readonly radius: number;
    mesh: THREE.Mesh;
    id: string;
    timeline: BallTimeline;
    sound?: {
        node: THREE.Audio | THREE.PositionalAudio;
        buffers: Map<string, AudioBuffer>;
    };
    defaultJuggler?: Juggler;
    // defaultTable?: Table;
    private _prevTime?: number;

    constructor({
        radius,
        mesh,
        id,
        timeline,
        // default_table,
        defaultJuggler,
        sound
    }: BallConstructorInterface = {}) {
        this.radius = radius ?? 0.1;
        this.mesh =
            mesh ?? new THREE.Mesh(createBallGeometry(this.radius), createBallMaterial("red"));
        this.timeline = timeline ?? new BallTimeline();
        this.id = id ?? "None";
        // this.defaultTable = default_table;
        this.defaultJuggler = defaultJuggler;
        this.sound = sound;
        if (this.sound !== undefined) {
            this.mesh.add(this.sound.node);
        }
        this._prevTime = undefined;
    }

    //TODO : Move this as static for events
    throwTimelineError(event1: BallTimelineEvent | null, event2: BallTimelineEvent | null): void {
        const str1 =
            event1 === null
                ? `has previous event null`
                : `is ${event1.errorBallStatus} at time ${event1.time}`;
        const str2 =
            event2 === null
                ? `has previous event null`
                : `is ${event2.errorBallStatus} at time ${event2.time}`;
        throw Error(`Ball ${this.id} ${str1} and ${str2}.`);
    }

    positionAtEvent(event: BallTimelineEvent | null): THREE.Vector3 {
        if (event === null) {
            throw Error();
        } else if (
            event instanceof CatchEvent ||
            event instanceof ThrowEvent ||
            event instanceof TableTakeEvent
        ) {
            //TableTakeEvent for now here as the ball teleports from table to hand, so is in hand.
            //With proper animations, could change.
            return event.hand.positionAtEvent(event.handMultiEvent());
        } else if (event instanceof TablePutEvent) {
            return event.table.ballPosition(this);
        }
        throw Error("Unimplemented behaviour");
    }

    //TODO : Logique des enchainements d'evenement pour la balle éparpillé dans le code...
    //TODO : Change hand.position to hand.ball_position
    /**
     * @param time The time in seconds.
     * @returns The position of the ball at that given time.
     */
    position(time: number): THREE.Vector3 {
        const [, prevEvent] = this.timeline.prevEvent(time);
        const [, nextEvent] = this.timeline.nextEvent(time);

        if (prevEvent === null) {
            if (nextEvent === null) {
                // if (this.defaultTable !== undefined) {
                //     return this.defaultTable.ballPosition(this);
                // } else if (this.defaultJuggler?.default_table !== undefined) {
                //     return this.defaultJuggler.default_table.ballPosition(this);
                if (this.defaultJuggler?.defaultTable !== undefined) {
                    return this.defaultJuggler.defaultTable.ballPosition(this);
                } else {
                    return new THREE.Vector3(-100, -100, -100);
                    // this.throwTimelineError(prevEvent, nextEvent);
                }
            }
            if (nextEvent instanceof CatchEvent) {
                this.throwTimelineError(prevEvent, nextEvent);
            }
            if (nextEvent instanceof ThrowEvent || nextEvent instanceof TablePutEvent) {
                return nextEvent.hand.position(time);
            }
            if (nextEvent instanceof TableTakeEvent) {
                return nextEvent.table.ballPosition(this);
            }
        }
        if (prevEvent instanceof CatchEvent) {
            if (
                nextEvent === null ||
                nextEvent instanceof ThrowEvent ||
                nextEvent instanceof TablePutEvent
            ) {
                return prevEvent.hand.position(time);
            }
            if (nextEvent instanceof CatchEvent || nextEvent instanceof TableTakeEvent) {
                this.throwTimelineError(prevEvent, nextEvent);
            } //Stop the looping if was set to loop.
        }
        if (prevEvent instanceof ThrowEvent) {
            if (nextEvent instanceof CatchEvent) {
                return thrownBallPosition(
                    prevEvent.hand.positionAtEvent(prevEvent.handMultiEvent()),
                    prevEvent.time,
                    nextEvent.hand.positionAtEvent(nextEvent.handMultiEvent()),
                    nextEvent.time,
                    time
                );
            }
            if (nextEvent instanceof TablePutEvent) {
                return thrownBallPosition(
                    prevEvent.hand.positionAtEvent(prevEvent.handMultiEvent()),
                    prevEvent.time,
                    nextEvent.table.ballPosition(this),
                    nextEvent.time,
                    time
                );
            }
            if (
                nextEvent === null ||
                nextEvent instanceof ThrowEvent ||
                nextEvent instanceof TableTakeEvent
            ) {
                this.throwTimelineError(prevEvent, nextEvent);
            }
        }
        if (prevEvent instanceof TablePutEvent) {
            if (nextEvent === null || nextEvent instanceof TableTakeEvent) {
                return prevEvent.table.ballPosition(this);
            }
            if (
                nextEvent instanceof CatchEvent ||
                nextEvent instanceof ThrowEvent ||
                nextEvent instanceof TablePutEvent
            ) {
                this.throwTimelineError(prevEvent, nextEvent);
            }
        }
        if (prevEvent instanceof TableTakeEvent) {
            if (
                nextEvent === null ||
                nextEvent instanceof ThrowEvent ||
                nextEvent instanceof TablePutEvent
            ) {
                return prevEvent.hand.position(time);
            }
            if (nextEvent instanceof CatchEvent || nextEvent instanceof TableTakeEvent) {
                this.throwTimelineError(prevEvent, nextEvent);
            }
        }
        throw Error("Unimplemented behaviour");
    }

    velocityAtCatchThrowEvent(event: CatchEvent | ThrowEvent): THREE.Vector3 {
        let prevEvent: BallTimelineEvent | null;
        let nextEvent: BallTimelineEvent | null;
        let isThrown: boolean;
        if (event instanceof CatchEvent) {
            prevEvent = event.prevBallEvent()[1];
            nextEvent = event;
            isThrown = false;
        } else {
            prevEvent = event;
            nextEvent = event.nextBallEvent()[1];
            isThrown = true;
        }
        //Validation of events ?
        if (
            prevEvent instanceof ThrowEvent &&
            (nextEvent instanceof CatchEvent || nextEvent instanceof TablePutEvent)
        ) {
            return thrownBallVelocityAtStartEnd(
                this.positionAtEvent(prevEvent),
                prevEvent.time,
                this.positionAtEvent(nextEvent),
                nextEvent.time,
                isThrown
            );
        }
        throw Error("Unimplemented behaviour");
    }

    // /**
    //  * @param time The time in seconds
    //  * @returns The velocity of the ball at that given time.
    //  */
    // velocity(time: number) {
    //     const [t0, prev_event] = this.timeline.prev_event(time);
    //     const [t1, next_event] = this.timeline.next_event(time);

    //     if (prev_event === null) {
    //         if (next_event === null) {
    //             if (this.default_table === undefined) {
    //                 this.throw_timeline_error(prev_event, next_event);
    //             }
    //             return new THREE.Vector3(0, 0, 0);
    //         }
    //         if (next_event instanceof CatchEvent) {
    //             this.throw_timeline_error(prev_event, next_event);
    //         }
    //         if (next_event instanceof ThrowEvent || next_event instanceof TablePutEvent) {
    //             return next_event.hand.ball_velocity(this, time);
    //         }
    //         if (next_event instanceof TableTakeEvent) {
    //             return new THREE.Vector3(0, 0, 0);
    //         }
    //     }
    //     if (prev_event instanceof CatchEvent) {
    //         if (
    //             next_event === null ||
    //             next_event instanceof ThrowEvent ||
    //             next_event instanceof TablePutEvent
    //         ) {
    //             return prev_event.hand.ball_velocity(this, time);
    //         }
    //         if (next_event instanceof CatchEvent || next_event instanceof TableTakeEvent) {
    //             this.throw_timeline_error(prev_event, next_event);
    //         }
    //     }
    //     if (prev_event instanceof ThrowEvent) {
    //         if (next_event instanceof CatchEvent || next_event instanceof TablePutEvent) {
    //             return this.airborne_velocity(/*TODO*/);
    //             // return Ball.get_airborne_position(
    //             //     prev_event.get_global_position(),
    //             //     prev_event.time,
    //             //     next_event.get_global_position(),
    //             //     next_event.time,
    //             //     time
    //             // );
    //         }
    //         if (
    //             next_event === null ||
    //             next_event instanceof ThrowEvent ||
    //             next_event instanceof TableTakeEvent
    //         ) {
    //             this.throw_timeline_error(prev_event, next_event);
    //         }
    //     }
    //     if (prev_event instanceof TablePutEvent) {
    //         if (next_event === null || next_event instanceof TableTakeEvent) {
    //             return new THREE.Vector3(0, 0, 0);
    //         }
    //         if (
    //             next_event instanceof CatchEvent ||
    //             next_event instanceof ThrowEvent ||
    //             next_event instanceof TablePutEvent
    //         ) {
    //             this.throw_timeline_error(prev_event, next_event);
    //         }
    //     }
    //     if (prev_event instanceof TableTakeEvent) {
    //         if (
    //             next_event === null ||
    //             next_event instanceof ThrowEvent ||
    //             next_event instanceof TablePutEvent
    //         ) {
    //             return prev_event.hand.ball_velocity(this, time);
    //         }
    //         if (next_event instanceof CatchEvent || next_event instanceof TableTakeEvent) {
    //             this.throw_timeline_error(prev_event, next_event);
    //         }
    //     }
    //     throw Error("Unimplemented behaviour");
    // }

    playSound(soundName?: string, loop = false): void {
        if (this.sound === undefined) {
            console.log(
                `Ball ${this.id} can't play sound as it has no AudioNode nor AudioBuffers.`
            );
            return;
        }
        if (soundName === undefined) {
            console.log(`Ball ${this.id} doesn't know what sound to play.`);
            return;
        }
        const soundBuffer = this.sound.buffers.get(soundName);
        if (soundBuffer === undefined) {
            console.log(`Ball ${this.id} has no known sound "${soundName}" in buffer to play.`);
            return;
        }
        if (this.sound.node.isPlaying) {
            this.sound.node.stop();
        }
        this.sound.node.setBuffer(soundBuffer);
        this.sound.node.setLoop(loop);
        this.sound.node.play();
    }

    //TODO : make it so that event.sound if array or undefined in constructor ?
    //TODO : method should rather be in simulator ?
    //TODO : Make it so if the ball has sounds, there are options to play on every event, or catch, or throw.
    //TODO : Make it so if the ball falls after a throw it makes a sound
    //TODO : Rename to play_sound, and have it executed on all events rather than just ball.
    // playOnCatch(time: number): void {
    //     const prev_event = this.timeline.prevEvent(time)[1];
    //     if (prev_event === null) {
    //         this._prevTime = time;
    //         return;
    //     }
    //     if (prev_event.soundName !== null && this._prevTime <= prev_event.time) {
    //         // Play a sound
    //         if (this.sound instanceof Tone.Players) {
    //             const sound_name = prev_event.random_sound_name();
    //             this.sound.player(sound_name).start();
    //         } else if (this.sound instanceof Tone.Player) {
    //             this.sound.start();
    //         }
    //     }
    //     this._prevTime = time;
    // const prev_event = this.timeline.prev_event(time)[1];
    // if (
    //     prev_event !== null &&
    //     prev_event instanceof CatchEvent &&
    //     this._prev_time <= prev_event.time
    // ) {
    //     // Play a sound
    //     if (this.sound instanceof Tone.Players) {
    //         if (prev_event.sound_name !== null) {
    //             const sound_name = prev_event.random_sound_name();
    //             this.sound.player(sound_name).start();
    //         }
    //     } else if (this.sound instanceof Tone.Player) {
    //         this.sound.start();
    //     }
    // }
    // this._prev_time = time;
    // }

    /**
     * Updates the ball's position.
     * @param time Time of the frame to render in seconds.
     */
    render(time: number): void {
        //Receives the time in seconds.
        const position = this.position(time);
        this.mesh.position.copy(position);
    }

    triggerSound(time: number, isPaused: boolean): void {
        const prevEventInfo = this.timeline.prevEvent(time);
        if (prevEventInfo[0] !== null && !isPaused) {
            const [prevEventTime, { sound: soundToPlay }] = prevEventInfo;
            if (this._prevTime !== undefined && this._prevTime <= prevEventTime) {
                if (soundToPlay === undefined) {
                    if (this.sound?.node.getLoop() === true) {
                        //Stop the previous sound (in case it was looping for instance).
                        this.sound.node.stop();
                    }
                } else if (typeof soundToPlay.name === "string") {
                    this.playSound(soundToPlay.name, soundToPlay.loop);
                } else {
                    const random_idx = Math.floor(Math.random() * soundToPlay.name.length);
                    this.playSound(soundToPlay.name[random_idx], soundToPlay.loop);
                }
            }
        }
        this._prevTime = time;
    }

    /**
     * Properly deletes the resources. Call when instance is not needed anymore to free ressources. nullify all reference
     */
    dispose() {
        if (this.mesh.parent !== null) {
            this.mesh.parent.remove(this.mesh);
        }
        // this.geometry.dispose();
        // this.material.dispose();
        // if (this.sound instanceof Tone.Player) {
        //     this.sound.stop();
        // } else if (this.sound instanceof Tone.Players) {
        //     this.sound.stopAll();
        // }
        // this.sound?.dispose();
        // this.panner3D?.dispose();
        this.timeline.clear();
    }
}

export function createBallGeometry(radius = 0.1) {
    return new THREE.SphereGeometry(radius, 8, 8);
}

export function createBallMaterial(color: THREE.ColorRepresentation) {
    return new THREE.MeshPhongMaterial({ color: color });
}

function thrownBallVelocityAtStartEnd(
    pos0: THREE.Vector3,
    t0: number,
    pos1: THREE.Vector3,
    t1: number,
    atStart: boolean
): THREE.Vector3 {
    const dt = t1 - t0;
    const v0x = (pos1.x - pos0.x) / dt;
    const v0z = (pos1.z - pos0.z) / dt;
    const v0y = (dt * GRAVITY) / 2 + (pos1.y - pos0.y) / dt;
    const throw_sign = atStart ? 1 : -1;
    return new THREE.Vector3(v0x, throw_sign * v0y, v0z);
}

function thrownBallPosition(
    pos0: THREE.Vector3,
    t0: number,
    pos1: THREE.Vector3,
    t1: number,
    t: number
): THREE.Vector3 {
    const v0 = thrownBallVelocityAtStartEnd(pos0, t0, pos1, t1, true);
    return new THREE.Vector3(
        v0.x * (t - t0) + pos0.x,
        (-GRAVITY / 2) * (t - t0) ** 2 + v0.y * (t - t0) + pos0.y,
        v0.z * (t - t0) + pos0.z
    );
}

// function thrownBallVelocity(
//     pos0: THREE.Vector3,
//     t0: number,
//     pos1: THREE.Vector3,
//     t1: number,
//     t: number
// ): THREE.Vector3 {
//     const v0 = thrown_ball_velocity_at_start_end(pos0, t0, pos1, t1, true);
//     return new THREE.Vector3(v0.x, -GRAVITY * t + v0.y, v0.z);
// }
