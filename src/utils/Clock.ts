import { EventDispatcher } from "./EventDispatcher";

export interface ClockParam {
    startTime?: number;
    playbackRate?: number;
    autoplay?: boolean;
    bounds?: [number | undefined, number | undefined];
    loop?: boolean;
}

export type ClockEvents =
    | "start"
    | "pause"
    | "ended"
    // | "timeUpdate"
    | "playbackRateChange"
    | "boundsChange"
    | "loopChange"
    | "manualTimeUpdate";

//TODO : Try playbackrate of 0 + negative.
//TODO 30/05/25 : Remove manual trigger and make it responability of person using a clock to have updates ?
// Or allow both with option to customize callback frequency. Properly handle the stop signal that must arrive on time.

// TODO : Use state machine
// TODO : Check for events fired
// TODO : Check for endTimeout Reconstruction.
// TODO : CHeck that emit event is at the end of the functions.
// TODO : Use getters / setters for public ?
// TODO : All seconds or miliseconds ?

/**
 * High precision clock supporting a custom playback rate. It fires many events detailed below, that can have custom callbacks set with the addEventListener method.
 *
 * NB : The getTime always return the new time, where the clock HTMLMediaElements use may return the same time multiple calls in a row.
 *
 * **Events fired:**
 * - start: Whenever the clock starts.
 * - pause: Whenever the clock pauses.
 * - ended: Whenever the clock pauses because it reaches its ending bound or is disposed of.
 * - playbackRateChange: Whenever the playback rate changes.
 * - boundsChange: Whevenever the bounds (start or end time) change.
 * - loopChange : Whenever the clock is set to loop / unloop.
 * - manualTimeUpdate : Whenever a manual change occurs within the clock (either because of a call to setTime(), or because it looped and jumped back to the beginning).
 */
export class Clock extends EventDispatcher<ClockEvents> /*implements TimeController*/ {
    private _lastUpdateTime: number;
    private _lastKnownTime: number;
    private _playbackRate: number;
    private _endTimeoutIdx?: number;
    private _bounds: [number | undefined, number | undefined];
    private _loop: boolean;
    private _isTicking: boolean;
    // private _timeupdateInterval?: number;
    // private _timeupdateIntervalTime: number;

    /**
     * TODOSignals
     * @param param0
     */
    constructor({ startTime, playbackRate, autoplay, bounds, loop }: ClockParam = {}) {
        super();
        this._lastUpdateTime = performance.now() / 1000;
        this._lastKnownTime = startTime ?? 0;
        this._playbackRate = playbackRate ?? 1.0;
        this._bounds = bounds ?? [undefined, undefined];
        this._loop = loop ?? false;
        this._isTicking = false;

        if (autoplay === true) {
            this.start();
        }
    }

    /**
     * Create a timeout to handle what happens when the clock reaches its end bounds.
     */
    private _createEndTimeout(): void {
        // If there is no bound in the direction the clock is ticking, there is no end to reach.
        const endBound = this._bounds[this._endBoundIdx()]; 
        if (endBound === undefined) {
            return;
        }

        // Note : changing the bounds or playback rate or pausing triggers the deletion of the following tiemout and recreates it
        // if needed. Thus we are sure it will be called with the current values of playback rate and bounds, and it will still be playing.
        this._endTimeoutIdx = setTimeout(
            () => {
                if (this.getLoop()) {
                    // Loop back to the start (considering the ticking direction).
                    this.restart();
                    // Recreate the stop interval. No need to delete it first as we are in the current timeout function.
                    this._createEndTimeout();
                } else {
                    // Stop playback exactly at the time of the ending bound (but don't trigger a manual update event).
                    // See note above.
                    this._isTicking = false;
                    this._setTimeNoEventTrigger(this._bounds[this._endBoundIdx()]!);
                    this.dispatchEvent("ended");
                }
            },
            this.realTimeUntil(endBound) * 1000
        );
    }

    /**
     * Deletes the existing timeout (that handles what to do when the clock reaches its end bound.)
     */
    private _clearEndTimeout(): void {
        clearTimeout(this._endTimeoutIdx);
        this._endTimeoutIdx = undefined;
    }

    /**
     * Handles the deletion and recreation of the tiemout. Should be called whenever a parameter (playback rate, bounds, ...) changes.
     */
    private _recalibrateEndTimeout(): void {
        this._clearEndTimeout();
        // If we were playing, we need to recreate the handle end timeout.
        if (this.isTicking()) {
            this._createEndTimeout();
        }
    }

    private _endBoundIdx(): number {
        // If the clock ticks forwards, the ending bound is the upper one, and else it is the lower one.
        return this._playbackRate >= 0 ? 1 : 0;
    }

    /**
     * Starts the clock.
     */
    start(): void {
        if (this.isTicking()) {
            // Do nothing if we ask for the clock to play while its playing.
            return;
        }
        this._lastUpdateTime = performance.now() / 1000;
        this._isTicking = true;
        this._createEndTimeout(); // Create a timeout to stop the clock when it reaches its end.
        this.dispatchEvent("start");
    }

    /**
     * Pauses the clock.
     */
    pause(): void {
        if (!this.isTicking()) {
            // Do nothing if we ask the clock to pause while it is paused.
            return;
        }
        this._lastKnownTime = this.getTime();
        this._isTicking = false;
        this._clearEndTimeout(); // Clear the timeout created when the clock started.
        this.dispatchEvent("pause");
    }

    /**
     * Stops the clock (restarts the clock and pauses it).
     */
    // stop(): void {
    //     if (this._state === "stopped") {
    //         return;
    //     }
    //     this._lastKnownTime = this.getTime();
    //     this._clearEndTimeout();
    //     this._state = "stopped";
    //     this.restart();
    //     this.dispatchEvent("ended");
    //     // this.dispatchEvent("timeUpdate");
    // }

    /**
     * Restarts the clock. If it ticked forward in time, goes to the start. If it ticked backwards, goes to the end.
     */
    restart(): void {
        const startBound = this._bounds[(this._endBoundIdx() + 1) % 2];
        if (startBound === undefined) {
            console.warn(
                `No ${this._playbackRate >= 0 ? "start" : "end"} time is specified for this clock. Will go back to 0.`
            );
        }
        this.setTime(startBound ?? 0);
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
        // If we were playing, we need to recreate the handle end timeout.
        this._recalibrateEndTimeout();
        this.dispatchEvent("playbackRateChange");
    }

    /**
     * Gets the current time of the clock.
     * @returns the time in seconds.
     */
    getTime(): number {
        if (!this.isTicking()) {
            return this._lastKnownTime;
        } else {
            return (
                this._lastKnownTime +
                (performance.now() / 1000 - this._lastUpdateTime) * this._playbackRate
            );
        }
    }

    /**
     * Sets the time of the clock without firing an event.
     * @param time the time in seconds.
     */
    private _setTimeNoEventTrigger(time: number): void {
        this._lastUpdateTime = performance.now() / 1000;
        this._lastKnownTime = time;
        // If we were playing, we need to recreate the handle end timeout.
        this._recalibrateEndTimeout();
    }

    /**
     * Sets the time of the clock.
     * @param time the time in seconds.
     */
    setTime(time: number): void {
        this._setTimeNoEventTrigger(time);
        this.dispatchEvent("manualTimeUpdate");
    }

    /**
     * @returns whether the clock is ticking.
     */
    isTicking(): boolean {
        return this._isTicking;
    }

    /**
     * @returns whether the clock is not ticking.
     */
    isStopped(): boolean {
        return !this._isTicking;
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
        // If we were playing, we need to recreate the handle end timeout.
        this._recalibrateEndTimeout();
        this.dispatchEvent("boundsChange");
    }

    /**
     * Gets whether the time Conductors loops when reaching the end or not.
     * @returns a boolean value.
     */
    getLoop(): boolean {
        return this._loop;
    }

    /**
     * Sets whether the time conductor should be looping when reaching the end.
     * @param value a boolean value.
     */
    setLoop(value: boolean) {
        this._loop = value;
        // No need to cancel a possible endTimeout. The logic of how to loop is handled inside the timeout callback.
        this.dispatchEvent("loopChange");
    }

    /**
     * Computes in how many real seconds the clock will reacha target time. Accounts for playback rate.
     * @param targetTime the playback time in seconds the clock should reach.
     */
    realTimeUntil(targetTime: number) {
        // If the playback rate is negative, everything still works ;)
        return (targetTime - this.getTime()) / this._playbackRate;
    }

    /**
     * Properly disposes of all event listeners and intervals.
     */
    dispose() {
        this.dispatchEvent("ended");
        this._clearEndTimeout();
        this.removeAllEventListeners();
    }
}

// Test the clock.
// const clock = new Clock({ startTime: -1 });
// clock.addEventListener("start", () => {
//     console.log("start");
// });
// clock.addEventListener("pause", () => {
//     console.log("pause");
// });
// clock.addEventListener("ended", () => {
//     console.log("ended");
// });
// clock.addEventListener("manualTimeUpdate", () => {
//     console.log("manualTimeUpdate");
// });
// clock.addEventListener("playbackRateChange", () => {
//     console.log("playbackRateChange");
// });
// clock.addEventListener("boundsChange", () => {
//     console.log("boundsChange");
// });
// clock.addEventListener("loopChange", () => {
//     console.log("loopChange");
// });

// // clock.setBounds([-5, 5]);
// // clock.setLoop(true);
// setInterval(() => {
//     console.log(clock.getTime());
// }, 10000);
// // setTimeout(() => {
// //     clock.setPlaybackRate(-1.5);
// // }, 3000);
// clock.start();


// export class MediaPlayer implements TimeController {
//     media: HTMLMediaElement;
//     _lastUpdateTime: number;
//     _lastKnownTime: number;

//     constructor(media: HTMLMediaElement) {
//         this.media = media;
//         this._lastUpdateTime = performance.now() / 1000;
//         this._lastKnownTime = this.media.currentTime;
//     }

//     play(): Promise<void> {
//         this._lastUpdateTime = performance.now() / 1000;
//         this._lastKnownTime = this.media.currentTime;
//         return this.media.play();
//     }

//     pause(): void {
//         this.media.pause();
//     }

//     set currentTime(time: number) {
//         this.media.currentTime = time;
//         this._lastUpdateTime = performance.now() / 1000;
//         this._lastKnownTime = time;
//     }

//     get currentTime(): number {
//         if (this.paused) {
//             return this.media.currentTime;
//         } else {
//             return (
//                 this._lastKnownTime +
//                 (performance.now() / 1000 - this._lastUpdateTime) * this.media.playbackRate
//             );
//         }
//     }

//     set playbackRate(value: number) {
//         //Compute last known time *before* setting playbackrate
//         //as playbackrate is used in currentTime calculation.
//         this._lastKnownTime = this.currentTime;
//         this._lastUpdateTime = performance.now() / 1000;
//         this.media.playbackRate = value;
//     }

//     get playbackRate(): number {
//         return this.media.playbackRate;
//     }

//     get paused(): boolean {
//         return this.media.paused;
//     }

//     get playing(): boolean {
//         return !this.media.paused;
//     }

//     get duration(): number {
//         return this.media.duration;
//     }

//     get readyState(): number {
//         return this.media.readyState;
//     }

//     getTime(): number {
//         return this.currentTime;
//     }

//     setTime(time: number): void {
//         this.currentTime = time;
//     }

//     isPaused(): boolean {
//         return this.paused;
//     }
// }
