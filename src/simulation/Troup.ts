import { textureLoad } from "three/tsl";
import { TroupModel } from "../model/TroupModel";
import { TimeConductor } from "../MusicalJuggling";
import * as THREE from "three";
import { Juggler } from "./Juggler";
import { Ball } from "./Ball";

export type TroupParams = {
    model: TroupModel;
    clock: TimeConductor;
    audio: boolean;
    jugglers?: Map<string, Juggler>;
    balls?: Map<string, Ball>;
};

export class Troup {
    model: TroupModel;
    jugglers: Map<string, Juggler>
    balls: Map<string, Ball>
    private _clock: TimeConductor;
    private _audio: boolean;
    private _clockEventListeners: (() => void)[] = [];

    constructor({ model, clock, audio, jugglers, balls }: TroupParams) {
        this.model = model;
        this._clock = clock;
        this._audio = audio;
        this.jugglers = jugglers ?? new Map();
        this.balls = balls ?? new Map();
    }

    attachModel(model: )

    addJuggler(name: string, juggler: Juggler) {

    }

    getClock(): TimeConductor {
        return this._clock;
    }

    //TODO : React friendly ?
    setClock(newClock: TimeConductor) {
        // 1. Remove the old timeConductor's event listeners.
        this._clockEventListeners.forEach((removeEventListenerFunc) => {
            removeEventListenerFunc();
        });

        // 2. Add the new timeConductor and event listeners.
        this._clock = newClock;
        // Event listener when play is pressed.
        const removeEventListenerPlay = this._clock.addEventListener("play", () => {
            this.requestRenderIfNotRequested();
        });
        // Event listener when pause is pressed.
        const removeEventListenerPause = this._clock.addEventListener("pause", () => {
            for (const ball of this.balls.values()) {
                //TODO : Make proper pause ?
                ball.sound?.node.stop();
            }
            this.requestRenderIfNotRequested(); // TODO : Needed ?
        });
        // Event listener when time changes manually. (Also gets called additionnaly when timer is ticking, TODO fix with either manualUpdate event, or by offsetting to UI the periodic checks (better).)
        const updateEventListenerPlay = this._clock.addEventListener("timeUpdate", () => {
            this.requestRenderIfNotRequested();
        });
        this._clockEventListeners = [
            removeEventListenerPlay,
            removeEventListenerPause,
            updateEventListenerPlay
        ];
    }

    getVolume(): number | undefined {
        return this.listener?.
    }

    setVolume(gain: number): void {
        this.listener?.setMasterVolume(gain);
    }

    isAudioEnabled() {
        return this._audio;
    }

    /**
     * Enables audio for the whole troup.
     */
    enableAudio() {
        if (this.isAudioEnabled()) {
            return;
        }
        //TODO
        this._audio = true;
    }

    /**
     * Disables audio for the whole troup.
     * If you only want to temporarily mute the troup, use Troup.setVolume(0) as it doesn't dismount audio nodes.
     */
    disableAudio(): void {
        if (!this.isAudioEnabled()) {
            return;
        }
        //TODO
        this._audio = false;
    }

    /**
     * Properly disposes of the internal ressources of the troup
     * (namely event listeners, audio nodes, ...)
     */
    dispose(): void {
        //TODO : to finish, to check

        // Audio
        this.disableAudio();

        // Clock
        this._clockEventListeners.forEach((removeEventListenerFunc) => {
            removeEventListenerFunc();
        });
    }
}
