import { PerformanceModel } from "../model/PerformanceModel";
import { TimeConductor } from "../simulator/AudioPlayer";
import * as THREE from "three";
import { JugglerSim } from "./JugglerSim";
import { BallSim } from "./BallSim";
import { TableSim } from "./TableSim";

export type PerformanceSimParams = {
    object3D: THREE.Object3D;
    model: PerformanceModel;
    clock: TimeConductor;
    audioEnabled: boolean;
    jugglers?: Map<string, JugglerSim>;
    balls?: Map<string, BallSim>;
    tables?: Map<string, TableSim>;
};

export class PerformanceSim {
    object3D: THREE.Object3D;
    model: PerformanceModel;
    jugglers: Map<string, JugglerSim>;
    balls: Map<string, BallSim>;
    tables: Map<string, TableSim>;
    private _clock: TimeConductor;
    private _audioEnabled: boolean;
    private _clockEventListeners: (() => void)[] = [];

    constructor({
        object3D,
        model,
        clock,
        audioEnabled,
        jugglers,
        balls,
        tables
    }: PerformanceSimParams) {
        this.object3D = object3D;
        this.model = model;
        this._clock = clock;
        this._audioEnabled = audioEnabled;
        this.jugglers = jugglers ?? new Map<string, JugglerSim>();
        this.balls = balls ?? new Map<string, BallSim>();
        this.tables = tables ?? new Map<string, TableSim>();
    }

    /**
     * Checks if the performance is correctly linked to the model.
     *  - For each element in the model (juggler, ball, table), there is one element in the simulation (everything will animate properly) that is linked to that element of the model.
     * Things not checked :
     *  - For each element in the simulation, there is one element in the model (you may have unused models).
     * @returns whether all elements are in place to run the simulation. Running it if it is false may not necessarily disfunction, but may lead to strange results.
     */
    validateModel(): boolean {
        // const missingEntities: (Ball | Juggler | Table)[];
        //TODO : Add check for hands, and others...
        for (const [name, jugglerModel] of this.model.jugglers) {
            const jugglerSim = this.jugglers.get(name);
            if (jugglerSim === undefined || jugglerSim.model !== jugglerModel) {
                return false;
            }
        }
        for (const [name, jugglerModel] of this.model.jugglers) {
            const jugglerSim = this.jugglers.get(name);
            if (jugglerSim === undefined || jugglerSim.model !== jugglerModel) {
                return false;
            }
        }
        for (const [name, jugglerModel] of this.model.jugglers) {
            const jugglerSim = this.jugglers.get(name);
            if (jugglerSim === undefined || jugglerSim.model !== jugglerModel) {
                return false;
            }
        }
        return true;
    }

    addBall(name: string, ball: BallSim): void {}

    removeBall(name: string): void {}

    addJuggler(name: string, juggler: JugglerSim): void {}

    removeJuggler(name: string): void {}

    addTable(name: string, table: TableSim): void {}

    removeTable(name: string): void {}

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
            // this.requestRenderIfNotRequested();
        });
        // Event listener when pause is pressed.
        const removeEventListenerPause = this._clock.addEventListener("pause", () => {
            for (const ball of this.balls.values()) {
                //TODO : Make proper pause ?
                ball.sound?.node.stop();
            }
            // this.requestRenderIfNotRequested(); // TODO : Needed ?
        });
        // Event listener when time changes manually. (Also gets called additionnaly when timer is ticking, TODO fix with either manualUpdate event, or by offsetting to UI the periodic checks (better).)
        const updateEventListenerPlay = this._clock.addEventListener("timeUpdate", () => {
            // this.requestRenderIfNotRequested();
        });
        this._clockEventListeners = [
            removeEventListenerPlay,
            removeEventListenerPause,
            updateEventListenerPlay
        ];
    }

    getVolume(): number | undefined {
        // return this.listener?.
        return undefined;
    }

    setVolume(gain: number): void {
        // this.listener?.setMasterVolume(gain);
    }

    isAudioEnabled() {
        return this._audioEnabled;
    }

    /**
     * Enables audio for the whole troup.
     */
    enableAudio() {
        if (this.isAudioEnabled()) {
            return;
        }
        //TODO
        this._audioEnabled = true;
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
        this._audioEnabled = false;
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
