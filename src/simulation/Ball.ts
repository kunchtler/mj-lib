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
import { BallModel } from "../model/BallModel";

// TODO : CamelCase for every variable.
//TODO : Make errors thrown be console log when not in debug mode to prevent app blocking ?
//TODO : Better encapsulate what parameters are dependent on which (for ex, ofor combo mesh + radius)
interface BallConstructorInterface {
    mesh: THREE.Mesh;
    model: BallModel;
    id?: string;
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
    model: BallModel;
    mesh: THREE.Mesh;
    id: string;
    sound?: {
        node: THREE.Audio | THREE.PositionalAudio;
        buffers: Map<string, AudioBuffer>;
    };
    private _prevTime?: number;

    constructor({ model, mesh, id, sound }: BallConstructorInterface) {
        this.model = model;
        this.mesh = mesh;
        this.id = id ?? "None";
        this.sound = sound;
        if (this.sound !== undefined) {
            this.mesh.add(this.sound.node);
        }
        this._prevTime = undefined;
    }

    isAudioEnabled(): boolean {
        return this.sound !== undefined;
    }

    enableAudio(listener: THREE.AudioListener, buffers: Map<string, AudioBuffer>): void {
        if (this.sound !== undefined) {
            return;
        }
        const audioNode = new THREE.PositionalAudio(listener);
        this.mesh.add(audioNode);
        this.sound = {
            node: audioNode,
            buffers: buffers
        };
    }

    disableAudio(): void {
        if (this.sound === undefined) {
            return;
        }
        // Remove from the mesh.
        this.mesh.remove(this.sound.node);
        // Stop the sound.
        this.sound.node.stop();
        // Disconnect from all audio nodes and filters.
        this.sound.node.disconnect();
        // Clear buffer
        this.sound.node.buffer = null;
        this.sound = undefined;
    }

    setSound();

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

    stopSound(): void {
        this.sound?.node.stop();
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
    updatePosition(time: number): void {
        const position = this.model.position(time);
        this.mesh.position.copy(position);
    }

    //TODO : Review how prev_time works
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
