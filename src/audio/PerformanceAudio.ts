import * as THREE from "three";
import { Clock } from "..";
import { BallAudio } from "./BallAudio";
import { PerformanceView } from "../view/PerformanceView";

export type PerformanceAudioParams = {
    bufferMap?: Map<string, AudioBuffer>;
    ballsAudio?: Map<string, BallAudio>;
    context?: AudioContext;
    clock?: Clock;
};

// import { JugglerAudio } from "./JugglerAudio";

//TODO : How to create BallAudio ????

export class PerformanceAudio {
    gain: GainNode;
    context: AudioContext;
    balls: Map<string, BallAudio>;
    bufferMap: Map<string, AudioBuffer>;
    private _clock?: Clock;
    private _clockRemoveEventListenersFunc: (() => void)[] = [];
    // jugglers = new Map<string, JugglerAudio>();

    constructor({ bufferMap, ballsAudio, context, clock }: PerformanceAudioParams) {
        this.context = context ?? THREE.AudioContext.getContext();
        this.gain = new GainNode(this.context);
        this._clock = clock;
        this.balls = ballsAudio ?? new Map<string, BallAudio>();
        this.bufferMap = bufferMap ?? new Map<string, AudioBuffer>();
    }

    setVolume(value: number): void {
        this.gain.gain.setValueAtTime(value, this.context.currentTime);
    }

    getVolume(): number {
        return this.gain.gain.value;
    }

    // TODO : Unfinished. Need to handle multiple juggler with audio redirection.
    setClock(clock: Clock) {
        // 1. Remove the old timeConductor's event listeners.
        this._clockRemoveEventListenersFunc.forEach((callback) => {
            callback();
        });

        // 2. Set the new clock.
        this._clock = clock;

        const removePlay = clock.addEventListener("play", () => {
            for (const ball of this.balls.values()) {
                ball.unpause();
            }
        });
        const removePause = clock.addEventListener("pause", () => {
            for (const ball of this.balls.values()) {
                ball.pause();
            }
        });
        const removeReachedEnd = clock.addEventListener("reachedEnd", () => {
            for (const ball of this.balls.values()) {
                ball.stop();
            }
        });
        const removePlaybackRateChange = clock.addEventListener("playbackRateChange", () => {
            for (const ball of this.balls.values()) {
                ball.setPlaybackRate(clock.getPlaybackRate());
            }
        });
        this._clockRemoveEventListenersFunc = [
            removePlay,
            removePause,
            removePlaybackRateChange,
            removeReachedEnd
        ];
    }

    dispose() {
        // Remove event listeners.
        this._clockRemoveEventListenersFunc.forEach((callback) => {
            callback();
        });
        // Disconnect this perfomer's gain node.
        this.gain.disconnect();
    }
}
