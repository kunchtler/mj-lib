import * as THREE from "three";
import { BallModel } from "../model/BallModel";
import { BallAudio, BallAudioParams } from "./audio/BallAudio";
import { ThreeAudio, ThreePositionalAudio } from "./CustomThreeAudio";

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

export type BallSimParams = {
    model: BallModel;
    // id?: string;
    // threeObject: THREE.Object3D;
    // audio?: BallAudio;
};

export type BallInfo = {
    radius: number;
};

export class BallSim {
    model: BallModel;
    audio?: BallAudio;
    private _prevTime?: number;
    // threeObject: THREE.Object3D;

    constructor({ model }: BallSimParams) {
        this.model = model;
        this._prevTime = undefined;
        // this.audio = audio;
        // this.threeObject = threeObject;
    }

    fillPositionInfo({ radius }: BallInfo) {
        this.model.radius = radius;
    }

    isAudioEnabled(): boolean {
        return this.audio !== undefined;
    }

    enableAudio({ threeAudio, bufferMap, connectTo }: BallAudioParams): void {
        if (this.audio !== undefined) {
            return;
        }
        this.audio = new BallAudio({ bufferMap, threeAudio, connectTo });
    }

    disableAudio(): void {
        if (this.audio === undefined) {
            return;
        }
        this.audio.dispose();
    }

    //TODO : Review how prev_time works
    triggerSound(time: number, isPaused: boolean): void {
        if (this.audio === undefined) {
            return;
        }
        const prevEventInfo = this.model.timeline.prevEvent(time);
        if (prevEventInfo[0] !== null && !isPaused) {
            const [prevEventTime, { sound: soundToPlay }] = prevEventInfo;
            if (this._prevTime !== undefined && this._prevTime <= prevEventTime) {
                if (soundToPlay === undefined) {
                    if (this.audio.node.getLoop()) {
                        //Stop the previous sound (in case it was looping for instance).
                        this.audio.node.stop();
                    }
                } else if (typeof soundToPlay.name === "string") {
                    this.audio.play(soundToPlay.name, soundToPlay.loop);
                } else {
                    const random_idx = Math.floor(Math.random() * soundToPlay.name.length);
                    this.audio.play(soundToPlay.name[random_idx], soundToPlay.loop);
                }
            }
        }
        this._prevTime = time;
    }

    dispose() {
        this.disableAudio();
    }
}