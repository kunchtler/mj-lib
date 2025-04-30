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
}

export class TimeConductor extends EventDispatcher implements TimeController {
    private _lastUpdateTime: number;
    private _lastKnownTime: number;
    private _playbackRate: number;
    private _paused: boolean;
    private _timeupdateInterval?: number;

    constructor({ startTime, playbackRate, autoplay }: TimeConductorParam = {}) {
        super();
        this._lastUpdateTime = performance.now() / 1000;
        this._lastKnownTime = startTime ?? 0;
        this._playbackRate = playbackRate ?? 1.0;
        this._paused = true;

        if (autoplay === true) {
            this.play().catch(() => {
                throw new Error();
            });
        }
    }

    play(): Promise<void> {
        this._lastUpdateTime = performance.now() / 1000;
        this._paused = false;
        this.dispatchEvent("play");
        this._timeupdateInterval = window.setInterval(() => {
            this.dispatchEvent("timeupdate");
        }, 100);
        return Promise.resolve();
    }

    pause(): void {
        this._lastKnownTime = this.currentTime;
        this._paused = true;
        this.dispatchEvent("pause");
        clearInterval(this._timeupdateInterval);
    }

    set currentTime(time: number) {
        this._lastUpdateTime = performance.now() / 1000;
        this._lastKnownTime = time;
        this.dispatchEvent("manualupdate");
    }

    get currentTime(): number {
        if (this.paused) {
            return this._lastKnownTime;
        } else {
            return (
                this._lastKnownTime +
                (performance.now() / 1000 - this._lastUpdateTime) * this._playbackRate
            );
        }
    }

    set playbackRate(value: number) {
        //Compute last known time *before* setting playbackrate
        //as playbackrate is used in currentTime calculation.
        this._lastKnownTime = this.currentTime;
        this._lastUpdateTime = performance.now() / 1000;
        this._playbackRate = value;
    }

    get playbackRate(): number {
        return this._playbackRate;
    }

    get paused(): boolean {
        return this._paused;
    }

    get playing(): boolean {
        return !this._paused;
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

// TODO : For simulator, rather use the div containing the simulator + add clock as div ?
// So that events can propagate through the DOM ?
// TODO : Once react, use parent that will bind this elems together.
export function bindTimeConductorAndSimulator(timeconductor: TimeConductor, simulator: Simulator) {
    timeconductor.addEventListener("pause", simulator.requestPause.bind(simulator));
    timeconductor.addEventListener("play", simulator.requestPlay.bind(simulator));
    timeconductor.addEventListener("manualupdate", simulator.requestRenderIfNotRequested);
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