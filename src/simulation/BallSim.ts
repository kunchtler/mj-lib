import * as THREE from "three";
import { BallModel } from "../model/BallModel";
import { ThreeAudio, ThreePositionalAudio } from "./CustomThreeAudio";
import { instance } from "three/tsl";
import { JugglerSim } from "./JugglerSim";

// TODO : CamelCase for every variable.
//TODO : Make errors thrown be console log when not in debug mode to prevent app blocking ?
//TODO : Better encapsulate what parameters are dependent on which (for ex, ofor combo mesh + radius)

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

// TODO : Properly handle changing ball's object3D or juggler ?

interface BallSimParams {
    object3D: THREE.Object3D;
    model: BallModel;
    id?: string;
    audio?: BallAudio;
}

export class BallSim {
    model: BallModel;
    object3D: THREE.Object3D;
    id: string;
    audio?: BallAudio;
    private _prevTime?: number;

    constructor({ model, object3D, id, audio }: BallSimParams) {
        this.model = model;
        this.object3D = object3D;
        this.id = id ?? "None";
        this.audio = audio;
        if (this.audio !== undefined) {
            this.object3D.add(this.audio.node);
        }
        this._prevTime = undefined;
    }

    isAudioEnabled(): boolean {
        return this.audio !== undefined;
    }

    enableAudio(listener: THREE.AudioListener, buffers: Map<string, AudioBuffer>): void {
        if (this.audio !== undefined) {
            return;
        }
        const audioNode = new THREE.PositionalAudio(listener);
        this.object3D.add(audioNode);
        this.audio = {
            node: audioNode,
            buffers: buffers
        };
    }

    disableAudio(): void {
        if (this.audio === undefined) {
            return;
        }
        // Remove from the mesh.
        this.object3D.remove(this.audio.node);
        // Stop the sound.
        this.audio.node.stop();
        // Disconnect from all audio nodes and filters.
        this.audio.node.disconnect();
        // Clear buffer
        this.audio.node.buffer = null;
        this.audio = undefined;
    }

    //TODO : Review how prev_time works
    triggerSound(time: number, isPaused: boolean): void {
        const prevEventInfo = this.model.timeline.prevEvent(time);
        if (prevEventInfo[0] !== null && !isPaused) {
            const [prevEventTime, { sound: soundToPlay }] = prevEventInfo;
            if (this._prevTime !== undefined && this._prevTime <= prevEventTime) {
                if (soundToPlay === undefined) {
                    if (this.audio?.node.getLoop() === true) {
                        //Stop the previous sound (in case it was looping for instance).
                        this.audio.node.stop();
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

    dispose() {
        //TODO
    }
}

export class BallAudio {
    bufferMap: Map<string, AudioBuffer>;
    readonly node: ThreeAudio | ThreePositionalAudio;
    private _ball: WeakRef<BallSim>;

    constructor(
        ball: BallSim,
        listener: THREE.AudioListener,
        bufferMap: Map<string, AudioBuffer>,
        positional = true
    ) {
        this._ball = new WeakRef(ball);
        this.bufferMap = bufferMap;
        this.node = positional ? new ThreePositionalAudio(listener) : new ThreeAudio(listener);
        this.ball.object3D.add(this.node);
    }

    get ball(): BallSim {
        const ball = this._ball.deref();
        if (ball === undefined) {
            throw ReferenceError("No ball ref. This shouldn't happen.");
        }
        return ball;
    }

    isAudioPositional(): boolean {
        return this.node instanceof ThreePositionalAudio;
    }

    setVolume(value: number) {
        this.node.setVolume(value);
    }

    getVolume(): number {
        return this.node.getVolume();
    }

    connectToJuggler(juggler: JugglerSim): void {
        this.node.disconnect();
        const gain = juggler.getGainNode();
        if (gain !== undefined) {
            this.node.connectTo(gain);
        }
    }

    play(soundName: string, loop = false): void {
        const soundBuffer = this.bufferMap.get(soundName);
        if (soundBuffer === undefined) {
            console.log(`Ball has no known sound "${soundName}" in buffer to play.`);
            return;
        }
        this.node.stop();
        this.node.setBuffer(soundBuffer);
        this.node.setLoop(loop);
        this.node.play();
    }

    pause() {
        this.node.pause();
    }

    unpause() {
        this.node.play();
    }

    stop() {
        this.node.stop();
    }

    dispose() {
        // Remove from the mesh.
        this.ball.object3D.remove(this.node);
        // Stop the sound.
        this.stop();
        // Disconnect from all audio nodes and filters.
        this.node.disconnect();
        // Clear buffer
        this.node.buffer = null;
    }
}

export function createBallGeometry(radius = 0.1) {
    return new THREE.SphereGeometry(radius, 8, 8);
}

export function createBallMaterial(color: THREE.ColorRepresentation) {
    return new THREE.MeshPhongMaterial({ color: color });
}
