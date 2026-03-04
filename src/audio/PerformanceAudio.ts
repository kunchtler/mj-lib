import * as THREE from "three";
import { BallSound, BallTimeline } from "../model";
import { CallbackFunction, Clock, ClockEvents, EventDispatcher } from "../utils";

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
class BallAudio {
    // private _jugglerGainNode: GainNode;
    // private _jugglerGainName?: number;
    audioBuffers: Map<string, AudioBuffer>;
    audio: THREE.PositionalAudio;
    private _clock: Clock;
    private _timeline: BallTimeline;
    private _timeoutIdx?: number;
    private _clockListeners: { event: ClockEvents; callback: CallbackFunction }[];
    changeJugglerGain: (jugglerName: string) => void;

    constructor(
        audio: THREE.PositionalAudio,
        timeline: BallTimeline,
        clock: Clock,
        audioBuffers: Map<string, AudioBuffer>,
        changeJugglerGain: (jugglerName: string) => void
    ) {
        this.audio = audio;
        this._timeline = timeline;
        this.audioBuffers = audioBuffers;
        this.changeJugglerGain = changeJugglerGain;
        this._clock = clock;
        this._clockListeners = [];
        this._setupClock();
    }

    setClock(clock: Clock) {
        this._unsetupClock();
        this._clock = clock;
        this._setupClock();
    }

    getClock(): Clock {
        return this._clock;
    }

    private _setupClock(): void {
        // Create callbacks
        const onStart = () => {
            this.createTimeout(0);
        };
        const onPause = () => {
            this.audio.stop(); // TODO : Should call pause ?
            this.clearTimeout();
        };
        const onManualTimeUpdate = () => {
            this.clearTimeout();
            this.createTimeout(0);
        };
        // If the playback rate changes, we need to recompute the delay.
        // TODO : Create a method in the clock to create a callback at some given point ? So that we do not need to account for that.
        const onPlayBackRateChange = () => {
            this.clearTimeout();
            this.createTimeout(0); // TODO : Test. May cause sound jitter by stopping and replaying current sound.
        };

        // Remember about callbacks to delete them on dismount.
        this._clockListeners = [
            { event: "start", callback: onStart },
            { event: "pause", callback: onPause },
            { event: "manualTimeUpdate", callback: onManualTimeUpdate },
            { event: "playbackRateChange", callback: onPlayBackRateChange }
        ];

        // Link callbacks to clock.
        for (const { event, callback } of this._clockListeners) {
            this._clock.addEventListener(event, callback);
        }

        // If the clock is already running, we've missed the start event, so we manually trigger the onStart event.
        if (this._clock.isTicking()) {
            onStart();
        }
    }

    private _unsetupClock() {
        this.clearTimeout();
        this.audio.stop();
        for (const { event, callback } of this._clockListeners) {
            this._clock.removeEventListener(event, callback);
        }
    }

    setTimeline(timeline: BallTimeline) {
        this._timeline = timeline;
        this.audio.stop();
        this.clearTimeout();
        if (this._clock.isTicking()) {
            this.createTimeout(0);
        }
    }

    getTimeline(): BallTimeline {
        return this._timeline;
    }
    /**
     * Have the ball play a sound immediately.
     * @param sound the sound name as found in the audio buffer.
     * @param startAt when in the sound to start (in seconds). Defaults to 0s.
     */
    playSound(sound: BallSound | undefined, startAt = 0): void {
        // Stop any previous sound.
        this.audio.stop();
        if (sound === undefined) {
            // We return early, just stopping sounds.
            return;
        }
        // Find the audio buffer.
        const audioBuffer = this.audioBuffers.get(sound.name);
        if (audioBuffer === undefined) {
            // Sound buffer not found, play nothing.
            return;
        }
        this.audio.setBuffer(audioBuffer);
        this.audio.offset = startAt;
        this.audio.setLoop(sound.loop);
        this.audio.play();
    }

    /**
     * Create a timeout to handle what sound to play after the given delay. Calls itself recursively to handle sound after sound.
     * @param delay
     */
    createTimeout(delay: number): void {
        this._timeoutIdx = setTimeout(() => {
            //1. Play sound if needed when starting.
            const time = this._clock.getTime();
            if (this._clock.getPlaybackRate() < 0) {
                return; // TODO ?
            }
            const [prevEvTime, prevEv] = this._timeline.prevEvent(time);
            if (prevEvTime !== null) {
                // Check if we are held by another juggler.
                if (prevEv.location.type === "held") {
                    this.changeJugglerGain(prevEv.location.jugglerName);
                }
                this.playSound(prevEv.sound, time - prevEvTime);
            }

            //2. Program to play the next sound.
            const [nextEvTime, _] = this._timeline.nextEvent(time);
            if (nextEvTime !== null) {
                const newDelay = this._clock.realTimeUntil(nextEvTime);
                this.createTimeout(newDelay >= 0 ? newDelay : 0);
            } else {
                this._timeoutIdx = undefined;
                return;
            }
        }, delay);
    }

    clearTimeout() {
        clearTimeout(this._timeoutIdx);
        this._timeoutIdx = undefined;
    }

    dispose() {
        this.clearTimeout();
        this._unsetupClock();
    }

    // dispose() {
    //     // Reconfigure the audio routing as it used to be.
    //     this._audio.gain.disconnect(this._jugglerGainNode);
    //     this._jugglerGainNode.disconnect(this._performanceGainNode);
    //     ballData.audio.gain.connect(this._listener.gain);

    //     // Stop any ongoing sound.
    //     ballData.audio.stop();
    // }
}

/**
 * Manages the audio of a performance with proper audio Routing.
 * We have :
 * - Each ball has a THREE.PositionalAudio, which has a gain linked to it to control the volume of the ball directly.
 * - We link each of those gain to a unique "JugglerGain" per ball, which allows jugglers to have different volumes.
 * - Each of those JugglerGain is linked to the same PerformanceGain, which controls the colume of the whole performance.
 * - The performance gain is connected to a THREE.AudioListener.
 */
export class AudioEngine {
    private _balls: Map<
        string,
        { audio: BallAudio; jugglerGainNode: GainNode; jugglerGainName?: string }
    >;
    private _jugglers: Map<string, { gainValue: number; balls: Set<string> }>;
    private _performanceGain: GainNode;
    private _listener: THREE.AudioListener;
    private _clock: Clock;
    private _model: Model;

    constructor(listener: THREE.AudioListener) {
        this._balls = new Map();
        this._jugglers = new Map();
        this._playbackRate = 1;
        this._isPaused = false;
        this._listener = listener;
        // We create a gain node to control the whole's performance volume.
        this._performanceGain = listener.context.createGain();
        // This gain node is connected to the listener's gain node (the master volume).
        this._performanceGain.connect(listener.getInput());
    }

    addBallAudio(
        ballID: string,
        audio: THREE.PositionalAudio,
        jugglerName?: string,
        timeline: BallTimeline
    ): void {
        // Add the ball's audio data to the map.
        const jugglerGain = audio.context.createGain();
        this._balls.set(ballID, { audio: audio, jugglerGainNode: jugglerGain });

        // Change the default ThreeJS audio routing.
        // Disconnect the Positional audio Gain from the AudioListener's gain Node.
        audio.gain.disconnect();
        // Connect it to the juggler gain which itself is connected to the perofrmance gain.
        audio.gain.connect(jugglerGain);
        jugglerGain.connect(this._performanceGain);

        // Change the ball's PositionalAudio properties to match the performance's ones.
        audio.setPlaybackRate(this._playbackRate);
        if (jugglerName !== undefined) {
            this.changeJugglerGainForBall(ballID, jugglerName);
        }
    }

    deleteBallAudio(ballID: string) {
        // Remove from the balls map.
        const ballData = this._balls.get(ballID);
        if (ballData === undefined) {
            return;
        }
        this._balls.delete(ballID);

        // Reconfigure the audio routing as it used to be.
        ballData.audio.gain.disconnect(ballData.jugglerGainNode);
        ballData.jugglerGainNode.disconnect(this._performanceGain);
        ballData.audio.gain.connect(this._listener.gain);

        // Stop any ongoing sound.
        ballData.audio.stop();
    }

    setJugglerGain(jugglerName: string, gainValue: number): void {
        const juggler = this._jugglers.get(jugglerName);
        if (juggler === undefined) {
            this._jugglers.set(jugglerName, { balls: new Set(), gainValue });
            return;
        }
        for (const ballID of juggler.balls) {
            this._balls.get(ballID)!.jugglerGainNode.gain.setValueAtTime(gainValue, 0.01);
        }
    }

    getJugglerGain(jugglerName: string): number | undefined {
        return this._jugglers.get(jugglerName)?.gainValue;
    }

    setBallVolume(ballID: string, volume: number): void {
        this._balls.get(ballID)?.audio.setVolume(volume);
    }

    getBallVolume(ballID: string): number | undefined {
        return this._balls.get(ballID)?.audio.getVolume();
    }

    // setListener(listener: THREE.AudioListener) {
    //     this._listener =
    // }

    // getListener(): THREE.AudioListener {
    //     return this._listener;
    // }

    changeJugglerGainForBall(ballID: string, jugglerName: string): void {
        const ballData = this._balls.get(ballID);
        if (ballData === undefined) {
            return;
        }
        ballData.jugglerGainName = jugglerName;
        const targetVolume = this._jugglers.get(jugglerName);
        if (targetVolume === undefined) {
            return;
        }
        this._balls.get(ballID)?.jugglerGainNode.gain.setValueAtTime(targetVolume, 0.01);
    }

    getBallJuggler(ballID: string): string | undefined {
        return this._balls.get(ballID)?.jugglerGainName;
    }

    // ballIDs() {
    //     return this._balls.keys();
    // }

    // jugglerNames() {
    //     return this._jugglers.keys();
    // }

    dispose(): void {
        // Remove all balls
        for (const ballID of this._balls.keys()) {
            this.deleteBallAudio(ballID);
        }

        // Disconnect the performance gain.
        this._performanceGain.disconnect();
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
