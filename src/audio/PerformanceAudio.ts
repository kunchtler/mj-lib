import * as THREE from "three";

// ThreeJS requires an audioListener to create audio objects.
// We create a decoy one that we immediately unbind
// const _decoyListener = (() => {
//     const listener = new THREE.AudioListener();
//     listener.gain.disconnect();
//     return listener;
// })();

// export class PositionalAudio3 extends THREE.PositionalAudio {
//     constructor() {
//         super(_decoyListener);
//     }
// }

export class PerformanceAudio {
    private balls: Map<
        string,
        { audio: THREE.PositionalAudio; jugglerGain: GainNode; jugglerGainName?: string }
    >;
    private jugglerVolume: Map<string, number>;
    private performanceGain: GainNode;
    private _playbackRate: number;
    private _isPaused: boolean;
    private _listener: THREE.AudioListener;

    constructor(listener: THREE.AudioListener) {
        this.balls = new Map();
        this.jugglerVolume = new Map();
        this._playbackRate = 1;
        this._isPaused = false;
        this._listener = listener;
        // We create a gain node to control the whole's performance volume.
        this.performanceGain = listener.context.createGain();
        // This gain node is connected to the listener's gain node (the master volume).
        this.performanceGain.connect(listener.getInput());
    }

    addBallAudio(ballID: string, audio: THREE.PositionalAudio, jugglerName?: string): void {
        // Add the ball's audio data to the map.
        const jugglerGain = audio.context.createGain();
        this.balls.set(ballID, { audio: audio, jugglerGain: jugglerGain });

        // Change the default ThreeJS audio routing.
        // Disconnect the Positional audio Gain from the AudioListener's gain Node.
        audio.gain.disconnect();
        // Connect it to the juggler gain, and then to the performance gain.
        audio.gain.connect(jugglerGain);
        jugglerGain.connect(this.performanceGain);

        // Change the ball's PositionalAudio properties to match the performance's ones.
        audio.setPlaybackRate(this._playbackRate);
        if (jugglerName !== undefined) {
            this.changeBallJuggler(ballID, jugglerName);
        }
    }

    deleteBallAudio(ballID: string) {
        // Remove from the balls map.
        const ballData = this.balls.get(ballID);
        if (ballData === undefined) {
            return;
        }
        this.balls.delete(ballID);

        // Reconfigure the audio routing as it used to be.
        ballData.audio.gain.disconnect(ballData.jugglerGain);
        ballData.jugglerGain.disconnect(this.performanceGain);
        ballData.audio.gain.connect(this._listener.gain);

        // Stop any ongoing sound.
        ballData.audio.stop();
    }

    setJugglerVolume(jugglerName: string, volume: number): void {
        this.jugglerVolume.set(jugglerName, volume);
    }

    getJugglerVolume(jugglerName: string): number | undefined {
        return this.jugglerVolume.get(jugglerName);
    }

    setBallVolume(ballID: string, volume: number): void {
        this.balls.get(ballID)?.audio.setVolume(volume);
    }

    getBallVolume(ballID: string): number | undefined {
        return this.balls.get(ballID)?.audio.getVolume();
    }

    changeBallJuggler(ballID: string, jugglerName: string): void {
        const ballData = this.balls.get(ballID);
        if (ballData === undefined) {
            return;
        }
        ballData.jugglerGainName = jugglerName;
        const targetVolume = this.jugglerVolume.get(jugglerName);
        if (targetVolume === undefined) {
            return;
        }
        this.balls.get(ballID)?.jugglerGain.gain.setValueAtTime(targetVolume, 0.01);
    }

    getBallJuggler(ballID: string): string | undefined {
        return this.balls.get(ballID)?.jugglerGainName;
    }

    setPlaybackRate(rate: number) {
        this._playbackRate = rate;
        // Change all of the ball's audio playback rate.
        for (const [, { audio }] of this.balls) {
            audio.setPlaybackRate(rate);
        }
    }

    getPlaybackRate() {
        return this._playbackRate;
    }

    playBallSound(ballID: string, audioBuffer: AudioBuffer, loop = false, startAt = 0) {
        const ballData = this.balls.get(ballID);
        if (ballData === undefined) {
            return;
        }
        ballData.audio.stop();
        ballData.audio.setBuffer(audioBuffer);
        ballData.audio.offset = startAt;
        ballData.audio.setLoop(loop);
        if (!this._isPaused) {
            ballData.audio.play();
        }
    }

    isPaused(): boolean {
        return this._isPaused;
    }

    pause(): void {
        this._isPaused = true;
        for (const [, { audio }] of this.balls) {
            audio.pause();
        }
    }

    unpause(): void {
        this._isPaused = false;
        for (const [, { audio }] of this.balls) {
            audio.pause();
        }
    }

    stop(): void {
        for (const [, { audio }] of this.balls) {
            audio.stop();
        }
    }

    dispose(): void {
        // Remove all balls
        for (const ballID of this.balls.keys()) {
            this.deleteBallAudio(ballID);
        }

        // Disconnect the performance gain.
        this.performanceGain.disconnect();
    }
}

// setClock(clock: Clock) {
//         // 1. Remove the old timeConductor's event listeners.
//         this._clockRemoveEventListenersFunc.forEach((callback) => {
//             callback();
//         });

//         // 2. Set the new clock.
//         this._clock = clock;

//         const removePlay = clock.addEventListener("play", () => {
//             for (const ball of this.balls.values()) {
//                 ball.unpause();
//             }
//         });
//         const removePause = clock.addEventListener("pause", () => {
//             for (const ball of this.balls.values()) {
//                 ball.pause();
//             }
//         });
//         const removeReachedEnd = clock.addEventListener("reachedEnd", () => {
//             for (const ball of this.balls.values()) {
//                 ball.stop();
//             }
//         });
//         const removePlaybackRateChange = clock.addEventListener("playbackRateChange", () => {
//             for (const ball of this.balls.values()) {
//                 ball.setPlaybackRate(clock.getPlaybackRate());
//             }
//         });
//         this._clockRemoveEventListenersFunc = [
//             removePlay,
//             removePause,
//             removePlaybackRateChange,
//             removeReachedEnd
//         ];
//     }
