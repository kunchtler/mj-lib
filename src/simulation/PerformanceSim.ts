import { PerformanceModel } from "../model/PerformanceModel";
import { TimeConductor } from "../simulator/AudioPlayer";
import * as THREE from "three";
import { JugglerSim } from "./JugglerSim";
import { BallSim } from "./BallSim";
import { TableSim } from "./TableSim";
import { PerformanceAudio } from "./audio/PerformanceAudio";
import { BallAudio } from "./audio/BallAudio";
import { ThreeAudio, ThreePositionalAudio } from "./CustomThreeAudio";
import { setIntersection } from "../utils/SetOperations";
import { immerable } from "immer";

export type PerformanceSimParams = {
    // object3D: THREE.Object3D;
    model: PerformanceModel;
    clock: TimeConductor;
    jugglers?: Map<string, JugglerSim>;
    balls?: Map<string, BallSim>;
    tables?: Map<string, TableSim>;
};

export class PerformanceSim {
    [immerable] = true;
    // object3D: THREE.Object3D;
    model: PerformanceModel;
    audio?: PerformanceAudio;
    jugglers: Map<string, JugglerSim>;
    balls: Map<string, BallSim>;
    tables: Map<string, TableSim>;
    private _clock: TimeConductor;
    // private _clockEventListeners: (() => void)[] = [];

    constructor({ model, jugglers, balls, tables, clock }: PerformanceSimParams) {
        // this.object3D = object3D;
        this.model = model;
        this.jugglers = jugglers ?? new Map<string, JugglerSim>();
        this.balls = balls ?? new Map<string, BallSim>();
        this.tables = tables ?? new Map<string, TableSim>();
        this._clock = clock;
    }

    getClock(): TimeConductor {
        return this._clock;
    }

    setClock(clock: TimeConductor): void {
        this._clock = clock;
        if (this.audio !== undefined) {
            this.audio.setClock(clock);
        }
    }

    isAudioEnabled() {
        return this.audio !== undefined;
    }

    /**
     * Enables audio for the whole troup.
     */
    enableAudio({
        ballsThreeAudio,
        bufferMap,
        context
    }: {
        ballsThreeAudio: Map<string, ThreeAudio | ThreePositionalAudio>;
        bufferMap: Map<string, AudioBuffer>;
        context?: AudioContext;
    }) {
        if (this.audio !== undefined) {
            return;
        }
        this.audio = new PerformanceAudio({ bufferMap, context, clock: this.getClock() });

        // Set the audio nodes for all balls.
        //TODO : Change the way this works. + Delete ball.enable as it won't link to PerformanceAudio
        for (const [name, ballAudio] of ballsThreeAudio) {
            const ball = this.balls.get(name);
            if (ball === undefined) {
                console.warn(`No ball named ${name} exist.`);
                continue;
            }
            ball.enableAudio({
                threeAudio: ballAudio,
                bufferMap: bufferMap,
                connectTo: this.audio.gain
            });
            this.audio.balls.set(name, ball.audio!);
        }
    }

    /**
     * Disables audio for the whole troup.
     * If you only want to temporarily mute the troup, use Troup.setVolume(0) as it doesn't dismount audio nodes.
     */
    disableAudio(): void {
        if (this.audio === undefined) {
            return;
        }
        // Dispose of the PerformanceAudio
        this.audio.dispose();
        this.audio = undefined;
        // Dispose of all audio nodes in the performance.
        for (const ball of this.balls.values()) {
            ball.disableAudio();
        }
    }

    /**
     * Properly disposes of the internal ressources of the troup
     * (namely event listeners, audio nodes, ...)
     */
    dispose(): void {
        // Audio
        this.disableAudio();
    }

    /**
     * Checks if the performance is correctly linked to the model.
     *  - For each element in the model (juggler, ball, table), there is one element in the simulation (everything will animate properly) that is linked to that element of the model.
     * Things not checked :
     *  - For each element in the simulation, there is one element in the model (you may have unused models).
     * @returns whether all elements are in place to run the simulation. Running it if it is false may not necessarily disfunction, but may lead to strange results.
     */
    // validateModel(): boolean {
    //     // const missingEntities: (Ball | Juggler | Table)[];
    //     //TODO : Add check for hands, and others...
    //     for (const [name, jugglerModel] of this.model.jugglers) {
    //         const jugglerSim = this.jugglers.get(name);
    //         if (jugglerSim === undefined || jugglerSim.model !== jugglerModel) {
    //             return false;
    //         }
    //     }
    //     for (const [name, jugglerModel] of this.model.jugglers) {
    //         const jugglerSim = this.jugglers.get(name);
    //         if (jugglerSim === undefined || jugglerSim.model !== jugglerModel) {
    //             return false;
    //         }
    //     }
    //     for (const [name, jugglerModel] of this.model.jugglers) {
    //         const jugglerSim = this.jugglers.get(name);
    //         if (jugglerSim === undefined || jugglerSim.model !== jugglerModel) {
    //             return false;
    //         }
    //     }
    //     return true;
    // }
}

