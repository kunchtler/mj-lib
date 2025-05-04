// Si on fait des play/pause constamment, this.media.currentTime n'aura pas forcément le temps de bien s'update.
//TODO : At some point, rather than CustomEvents, use Signals/Observer library ?
//TODO : Streamline TimeController / TimeConductor / AudioPalyer names ?
//TODO : Rename as Clock ?

import { EventDispatcher } from "../utils/EventDispatcher";
import { Simulator, TimeController } from "./Simulator";

export interface TimeConductorParam {
    startTime?: number;
    playbackRate?: number;
    autoplay?: boolean;
    bounds?: [number | undefined, number | undefined];
}

type TimeConductorEvents =
    | "play"
    | "pause"
    | "reachedEnd"
    | "timeUpdate"
    | "playbackRateChange"
    | "boundsChange";
// | "manualUpdate";

//TODO : remove some unused methods (currentTiem vs setTime / getTime, which is better to indicate that something is happening behind the scenes).
//TODO : clean TimeController interface.
//TODO : Try playbackrate of 0 + negative.

/**
 * The TimeConductor class provides a high precision clock, that is more reactive than the one HTMLMediaElements use, supporting a custom playback rate. It fires many events detailed below, that can have custom callbacks set with the addEventListener method.
 * 
 * TODO : MediaPlayer, to put up to date, allows to use that clock with an HTMLMediaElement.
 * 
 * **Events fired:**
 * - play: Whenever the clock starts.
 * - pause: Whenever the clock pauses.
 * - reachedEnd: Whenever the clock reached its upper bound (max time).
 * - timeUpdate: A convenience signals that fires whenever the time changes via setTime, or every 100 ms while the clock is ticking. TODO CHANGE that second one, should be handled bu UI ?
 * - playbackRateChange: Whenever the playback rate changes.
 * - boundsChange: Whevenever the bounds (start and end time) change. 
 */
export class TimeConductor extends EventDispatcher<TimeConductorEvents> /*implements TimeController*/ {
    private _lastUpdateTime: number;
    private _lastKnownTime: number;
    private _playbackRate: number;
    private _paused: boolean;
    private _timeupdateInterval?: number;
    private _bounds: [number | undefined, number | undefined];

    /**
     * TODOSignals
     * @param param0
     */
    constructor({ startTime, playbackRate, autoplay, bounds }: TimeConductorParam = {}) {
        super();
        this._lastUpdateTime = performance.now() / 1000;
        this._lastKnownTime = startTime ?? 0;
        this._playbackRate = playbackRate ?? 1.0;
        this._paused = true;
        this._bounds = bounds ?? [undefined, undefined];

        if (autoplay === true) {
            this.play().catch(() => {
                throw new Error();
            });
        }
    }

    private _stopOnEnd(): void {
        clearInterval(this._timeupdateInterval);
        this._lastKnownTime = this.getTime();
        this._paused = true;
        if (this._bounds[1] !== undefined) {
            this.setTime(this._bounds[1]);
        } else {
            this.dispatchEvent("timeUpdate");
        }
        this.dispatchEvent("reachedEnd");
    }

    /**
     * Starts the clock whenever
     * @returns a void promise. TODO: Change ?
     */
    play(): Promise<void> {
        this._lastUpdateTime = performance.now() / 1000;
        this._paused = false;
        this.dispatchEvent("play");
        this._timeupdateInterval = window.setInterval(() => {
            if (this._bounds[1] !== undefined && this.getTime() >= this._bounds[1]) {
                this._stopOnEnd();
            }
            this.dispatchEvent("timeUpdate");
        }, 100);
        return Promise.resolve();
    }

    /**
     * Pauses the clock.
     */
    pause(): void {
        if (this.isPaused()) {
            return;
        }
        clearInterval(this._timeupdateInterval);
        this._lastKnownTime = this.getTime();
        this._paused = true;
        this.dispatchEvent("pause");
        this.dispatchEvent("timeUpdate");
    }

    /**
     * Stops the clock (restarts the clock and pauses it).
     */
    stop(): void {
        this.pause();
        this.restart();
    }

    /**
     * Restarts the clock.
     */
    restart(): void {
        if (this.getBounds()[0] === null) {
            console.warn("No start time is specified in TimeConductor. Will go back to 0.");
        }
        this.setTime(this.getBounds()[0] ?? 0);
    }

    /**
     * Returns the playback rate of the clock, ie how fast it goes. Default speed is 1.
     */
    getPlaybackRate(): number {
        return this._playbackRate;
    }

    /**
     * Sets the playback rate of the clock, ie how fast it will go. Default speed is 1.
     * @param value the playback rate.
     */
    setPlaybackRate(value: number) {
        //Compute last known time *before* setting playbackrate
        //as playbackrate is used in currentTime calculation.
        this._lastKnownTime = this.getTime();
        this._lastUpdateTime = performance.now() / 1000;
        this._playbackRate = value;
        this.dispatchEvent("playbackRateChange");
    }

    /**
     * Gets the current time of the clock.
     * @returns the time in seconds.
     */
    getTime(): number {
        if (this.isPaused()) {
            return this._lastKnownTime;
        } else {
            return (
                this._lastKnownTime +
                (performance.now() / 1000 - this._lastUpdateTime) * this._playbackRate
            );
        }
    }

    /**
     * Sets the time of the clock.
     * @param time the time in seconds.
     */
    setTime(time: number): void {
        this._lastUpdateTime = performance.now() / 1000;
        this._lastKnownTime = time;
        this.dispatchEvent("timeUpdate");
    }

    /**
     *
     * @returns whether the clock is not ticking.
     */
    isPaused(): boolean {
        return this._paused;
    }

    /**
     * Gets the bounds of the clock.
     * @returns a 2 element array with the start time and the end time in seconds if they are defined, undefined if not.
     */
    getBounds(): [number | undefined, number | undefined] {
        return this._bounds;
    }

    /**
     * Sets the bounds of the clock.
     * @param bounds a 2-element array with the start time and the end time in seconds. They may be undefined.
     */
    setBounds(bounds: [number | undefined, number | undefined]) {
        this._bounds = bounds;
        this.dispatchEvent("boundsChange");
    }
}

// TODO : For simulator, rather use the div containing the simulator + add clock as div ?
// So that events can propagate through the DOM ?
// TODO : Once react, use parent that will bind this elems together.
export function bindTimeConductorAndSimulator(timeconductor: TimeConductor, simulator: Simulator) {
    timeconductor.addEventListener("pause", simulator.requestPause.bind(simulator));
    timeconductor.addEventListener("play", simulator.requestPlay.bind(simulator));
    // timeconductor.addEventListener("manualUpdate", simulator.requestRenderIfNotRequested);
}

export class MediaPlayer implements TimeController {
    media: HTMLMediaElement;
    _lastUpdateTime: number;
    _lastKnownTime: number;

    constructor(media: HTMLMediaElement) {
        this.media = media;
        this._lastUpdateTime = performance.now() / 1000;
        this._lastKnownTime = this.media.currentTime;
    }

    play(): Promise<void> {
        this._lastUpdateTime = performance.now() / 1000;
        this._lastKnownTime = this.media.currentTime;
        return this.media.play();
    }

    pause(): void {
        this.media.pause();
    }

    set currentTime(time: number) {
        this.media.currentTime = time;
        this._lastUpdateTime = performance.now() / 1000;
        this._lastKnownTime = time;
    }

    get currentTime(): number {
        if (this.paused) {
            return this.media.currentTime;
        } else {
            return (
                this._lastKnownTime +
                (performance.now() / 1000 - this._lastUpdateTime) * this.media.playbackRate
            );
        }
    }

    set playbackRate(value: number) {
        //Compute last known time *before* setting playbackrate
        //as playbackrate is used in currentTime calculation.
        this._lastKnownTime = this.currentTime;
        this._lastUpdateTime = performance.now() / 1000;
        this.media.playbackRate = value;
    }

    get playbackRate(): number {
        return this.media.playbackRate;
    }

    get paused(): boolean {
        return this.media.paused;
    }

    get playing(): boolean {
        return !this.media.paused;
    }

    get duration(): number {
        return this.media.duration;
    }

    get readyState(): number {
        return this.media.readyState;
    }

    getTime(): number {
        return this.currentTime;
    }

    setTime(time: number): void {
        this.currentTime = time;
    }

    isPaused(): boolean {
        return this.paused;
    }
}
