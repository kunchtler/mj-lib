import * as THREE from "three";
import { BallSound, PerformanceModel } from "../model";
import { CallbackFunction, Clock, ClockEvents } from "../utils";

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

// TODO : Document that "loop" means "loop until next event".
class BallAudio {
    private _jugglerGainNode: GainNode;
    jugglerGainName?: string;
    // audioBuffers: Map<string, AudioBuffer>;
    audio: THREE.PositionalAudio;
    // private _clock: Clock;
    // private _timeline: BallTimeline;
    private _timeoutIdx?: number;
    private _clockListeners: { event: ClockEvents; callback: CallbackFunction }[];
    private _clock: Clock | undefined; //Set only to correctly unset clock callbacks. Access clock via the audioEngine instead.
    private _audioEngine: AudioEngine;
    private _ballID: string;

    constructor(
        audio: THREE.PositionalAudio,
        audioEngine: AudioEngine,
        ballID: string
        // timeline: BallTimeline,
        // clock: Clock,
        // audioBuffers: Map<string, AudioBuffer>
    ) {
        this.audio = audio;
        this._jugglerGainNode = audio.context.createGain();

        // this.audioBuffers = audioBuffers;
        // this._clock = clock;
        this._audioEngine = audioEngine;
        this._clockListeners = [];

        this._ballID = ballID;

        // Change the default ThreeJS audio routing.
        // Disconnect the Positional audio Gain from the AudioListener's gain Node.
        this.audio.gain.disconnect();
        // Connect it to the juggler gain which itself is connected to the perofrmance gain.
        this.audio.gain.connect(this._jugglerGainNode);
        this._jugglerGainNode.connect(this._audioEngine.getPerformanceGain());

        // Change the ball's PositionalAudio properties to match the performance's ones.
        // if (jugglerName !== undefined) {
        //     this.changeJugglerGainForBall(ballID, jugglerName);
        // }

        this.setupClock();
    }

    changeJuggler(jugglerName: string | undefined): void {
        this.jugglerGainName = jugglerName;
        const gainValue =
            jugglerName === undefined ? 1 : this._audioEngine.getJugglerGain(jugglerName);
        this._jugglerGainNode.gain.setValueAtTime(gainValue, 0.01);
    }

    setGain(gain: number): void {
        this.audio.setVolume(gain);
    }

    getGain(): number {
        return this.audio.getVolume();
    }

    setupClock(): void {
        // Cleanup last clock.
        if (this._clock !== undefined) {
            this.unsetupClock();
        }

        // Setup new clock.
        this._clock = this._audioEngine.getClock();
        if (this._clock === undefined) {
            return;
        }

        // Create callbacks
        const onStart = () => {
            this.createTimeout(0);
        };
        const onPause = () => {
            this.audio.stop(); // TODO : Should call pause ?
            this.clearTimeout();
        };
        // If the playback rate changes, we need to recompute the delay.
        // TODO : Create a method in the clock to create a callback at some given point ? So that we do not need to account for that.
        const reload = () => {
            this.reload();
        };

        // Remember about callbacks to delete them on dismount.
        this._clockListeners = [
            { event: "start", callback: onStart },
            { event: "pause", callback: onPause },
            { event: "manualTimeUpdate", callback: reload },
            { event: "playbackRateChange", callback: reload },
            { event: "ended", callback: onPause }
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

    reload() {
        this.clearTimeout();
        if (this._audioEngine.getClock()?.isTicking()) {
            this.createTimeout(0);
        }
    }

    unsetupClock() {
        if (this._clock === undefined) {
            return;
        }
        this.clearTimeout();
        this.audio.stop();
        for (const { event, callback } of this._clockListeners) {
            this._clock.removeEventListener(event, callback);
        }
        this._clock = undefined;
        this._clockListeners = [];
        this.changeJuggler(undefined);
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
        const audioBuffer = this._audioEngine.audioBuffers.get(sound.name);
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
            const clock = this._audioEngine.getClock();
            const timeline = this._audioEngine
                .getPerformanceModel()
                ?.balls.get(this._ballID)?.timeline;
            if (timeline === undefined || clock === undefined) {
                // There are missing parameters, so we live early.
                return;
            }

            const time = clock.getTime();
            if (clock.getPlaybackRate() < 0) {
                return; // TODO ?
            }

            // const [prevEvTime, prevEv] = timeline.prevEvent(time);
            // //1. Play sound if needed when starting.
            // if (prevEvTime !== null) {
            //     // Check if we are held by another juggler.
            //     if (prevEv.location.type === "held") {
            //         this.changeJuggler(prevEv.location.jugglerName);
            //     }
            //     this.playSound(prevEv.sound, time - prevEvTime);
            // }

            //1. Play sound if needed.

            // We look for the previous event that has sound information.
            const startIt = timeline.begin();
            if (!startIt.isAccessible()) {
                // There is no event at all, so there is nothing to do.
                return;
            }
            // Indicates whether a sound should play.
            let shouldPlay: boolean;
            // Indicates whether we should mute the current playing sound (if there is one).
            let shouldStop = false;
            // Indicates whether when creating the timeout for the next sound, we should use
            // the time of the next event, or the next event that has sound.
            let timeoutNextEvent = false;
            // TODO : In the future, have a "stop looping" event ?

            const prevIt = timeline.prevEventIt(time);
            if (prevIt.isAccessible() && prevIt.pointer[1].sound?.loop === true) {
                // The previous event was a loop one, so we'll play the sound.
                shouldPlay = true;
                timeoutNextEvent = true;
            } else {
                const startTime = startIt.pointer[0];
                while (
                    prevIt.isAccessible() &&
                    startTime < prevIt.pointer[0] &&
                    prevIt.pointer[1].sound === undefined
                ) {
                    prevIt.pre();
                }

                if (prevIt.isAccessible()) {
                    if (prevIt.pointer[1].sound === undefined) {
                        // No sound event, nothing to play.
                        shouldPlay = false;
                    } else if (prevIt.pointer[1].sound.loop) {
                        // The last sound event was set to loop,
                        // but since we've met other events the sound stopped.
                        shouldPlay = false;
                        shouldStop = true;
                    } else {
                        // A non looping sound event that should play.
                        shouldPlay = true;
                    }
                } else {
                    shouldPlay = false;
                }
            }

            // If we found a suitable one, play it !
            if (shouldPlay) {
                const [prevEvTime, prevEv] = prevIt.pointer;
                if (prevEv.location.type === "held") {
                    // Check if we are held by another juggler.
                    this.changeJuggler(prevEv.location.jugglerName);
                }
                this.playSound(prevEv.sound!, time - prevEvTime);
            }
            if (shouldStop) {
                this.playSound(undefined);
            }

            // 2. Program to play the next sound.

            // Compute when the time at which the timeout should occur.
            let timeoutTime: number | null = null;
            const it = timeline.nextEventIt(time);
            if (timeoutNextEvent) {
                // Special case if we started playing a looping sound : we need on the very next event,
                // whether a sound is playing or not, to stop playing the looped sound.
                timeoutTime = it.isAccessible() ? it.pointer[0] : null;
            } else {
                // Figure out when the next sound event is.
                while (it.isAccessible() && it.pointer[1].sound === undefined) {
                    it.next();
                }
                timeoutTime = it.isAccessible() ? it.pointer[0] : null;
            }

            // Create the timeout (factoring in the clock's playback speed).
            if (timeoutTime !== null) {
                const newDelay = clock.realTimeUntil(timeoutTime);
                this.createTimeout(newDelay >= 0 ? newDelay : 0);
            } else {
                this._timeoutIdx = undefined;
                return;
            }
        }, delay * 1000);
    }

    clearTimeout() {
        if (this._timeoutIdx === undefined) {
            return;
        }
        clearTimeout(this._timeoutIdx);
        this._timeoutIdx = undefined;
    }

    dispose() {
        this.unsetupClock();
        // Reconfigure the audio routing as it used to be.
        this.audio.gain.disconnect(this._jugglerGainNode);
        this._jugglerGainNode.disconnect(this._audioEngine.getPerformanceGain());
        this.audio.gain.connect(this._audioEngine.getListener().gain);
    }
}

export type AudioEngineParams = {
    listener: THREE.AudioListener;
    clock?: Clock;
    model?: PerformanceModel;
    buffersMap?: Map<string, AudioBuffer>;
};

/**
 * Manages the audio of a performance with proper audio Routing.
 * We have :
 * - Each ball has a THREE.PositionalAudio, which has a gain linked to it to control the volume of the ball directly.
 * - We link each of those gain to a unique "JugglerGain" per ball, which allows jugglers to have different volumes.
 * - Each of those JugglerGain is linked to the same PerformanceGain, which controls the colume of the whole performance.
 * - The performance gain is connected to a THREE.AudioListener.
 */
export class AudioEngine {
    private _balls: Map<string, BallAudio>;
    private _jugglerGains: Map<string, number>;
    private _performanceGain: GainNode;
    private _listener: THREE.AudioListener;
    private _clock: Clock | undefined;
    private _model: PerformanceModel | undefined;
    audioBuffers: Map<string, AudioBuffer>;

    constructor({ listener, clock, model, buffersMap }: AudioEngineParams) {
        this._balls = new Map();
        this._jugglerGains = new Map();
        this._listener = listener;
        this.audioBuffers = buffersMap ?? new Map<string, AudioBuffer>();
        // We create a gain node to control the whole's performance volume.
        this._performanceGain = listener.context.createGain();
        // This gain node is connected to the listener's gain node (the master volume).
        this._performanceGain.connect(listener.getInput());
        this.setClock(clock);
        this.setPerformanceModel(model);
    }

    setBallAudio(ballID: string, audio: THREE.PositionalAudio): void {
        // Handle a ball with the existing ID properly.
        if (this._balls.has(ballID)) {
            this.deleteBallAudio(ballID);
        }

        const ballAudio = new BallAudio(audio, this, ballID);
        this._balls.set(ballID, ballAudio);
    }

    deleteBallAudio(ballID: string) {
        // Remove from the balls map.
        const ballAudio = this._balls.get(ballID);
        if (ballAudio === undefined) {
            return;
        }
        this._balls.delete(ballID);

        // Reconfigure the audio routing as it used to be.
        ballAudio.dispose();
    }

    setJugglerGain(jugglerName: string, gainValue: number): void {
        const juggler = this._jugglerGains.get(jugglerName);

        if (juggler === undefined) {
            this._jugglerGains.set(jugglerName, gainValue);
            return;
        }
        for (const ball of this._balls.values()) {
            if (ball.jugglerGainName === jugglerName) {
                ball.changeJuggler(jugglerName);
            }
        }
    }

    getJugglerGain(jugglerName: string): number {
        return this._jugglerGains.get(jugglerName) ?? 1;
    }

    getPerformanceGain(): GainNode {
        return this._performanceGain;
    }

    // setListener(listener: THREE.AudioListener) {
    //     this._listener =
    // }

    // getListener(): THREE.AudioListener {
    //     return this._listener;
    // }

    setClock(clock: Clock | undefined) {
        for (const ball of this._balls.values()) {
            ball.setupClock();
        }
        this._clock = clock;
    }

    getClock(): Clock | undefined {
        return this._clock;
    }

    setPerformanceModel(model: PerformanceModel | undefined) {
        for (const ball of this._balls.values()) {
            ball.reload();
        }
        this._model = model;
    }

    getPerformanceModel(): PerformanceModel | undefined {
        return this._model;
    }

    getListener(): THREE.AudioListener {
        return this._listener;
    }

    dispose(): void {
        // Remove all balls
        for (const ballID of this._balls.keys()) {
            this.deleteBallAudio(ballID);
        }

        // Disconnect the performance gain.
        this._performanceGain.disconnect();
    }
}
