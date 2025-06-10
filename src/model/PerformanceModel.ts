import { BallModel } from "./BallModel.js";
import { JugglerModel } from "./JugglerModel.js";
import { TableModel } from "./TableModel.js";
// import { Map as FrozenMap, MapOf } from "immutable";

// TODO : Juggler position in model + Table position in model (so tha tthe model in the single source of truth for poitions.)
// TODO : juggling model / simulator / canvas refactor
// TODO 27.05.25 : Do factory method to help with creating pattern instead ?
// TODO 27.05.25 : method to facilitate not having to add balls to the scene
// TODO 27.05.25 : immutable data structures ? + readonly attributes ?
// TODO 27.05.25 : change bounds and duration (normalize) return to undefined instead of [null, null]
// TODO : Handle sounds pausing when simulator pauses.
// TODO : Handle gentle implementation of sounds (do not make them mandatory).
// TODO : More generally, when in render an error is thrown, it shouldn't crash the page.
// TODO : Bowling pin juggler model.
// TODO : How to handle autostart ?
// TODO : Move helpers into custom function to activate / deactivate them at will ?
// TODO : Smooth ball pause sound / play the sound at the right time in the sound if the time has moved to make illusion of movie.
// TODO : Expose playBackRate, gravity
// TODO : Handle adding / removing juggler / patterns + sanitizing

// All positions must be given either as world coordinates, or local coordinates to the same object.

/**
 * Interface for the constructor of PerformanceModel.
 */
export interface PerformanceModelParams {
    /**
     * The balls used in the performance.
     */
    balls?: Map<string, BallModel>;
    /**
     * The jugglers involved in the performance.
     */
    jugglers?: Map<string, JugglerModel>;
    /**
     * The tables used in the performance.
     */
    tables?: Map<string, TableModel>;
}

/**
 * A model class that can perform many computations
 * (position, velocity, ...) representing a whole performance
 * (with jugglers, balls and tables).
 */
export class PerformanceModel {
    /**
     * The balls used in the performance.
     */
    balls: Map<string, BallModel>;
    /**
     * The jugglers involved in the performance.
     */
    jugglers: Map<string, JugglerModel>;
    /**
     * The tables used in the performance.
     */
    tables: Map<string, TableModel>;

    constructor({ balls, jugglers, tables }: PerformanceModelParams = {}) {
        this.balls = balls ?? new Map<string, BallModel>();
        this.jugglers = jugglers ?? new Map<string, JugglerModel>();
        this.tables = tables ?? new Map<string, TableModel>();
    }

    /**
     * Computes the first and last event times.
     * @returns
     * - [null, null] if there are no events.
     * - [startTime, endTime] otherwise.
     */
    patternTimeBounds(): [number, number] | [null, null] {
        let startTime: number | null = null;
        let endTime: number | null = null;
        for (const juggler of this.jugglers.values()) {
            const [handStartTime, handEndTime] = juggler.patternTimeBounds();
            if (startTime === null || (handStartTime !== null && startTime > handStartTime)) {
                startTime = handStartTime;
            }
            if (endTime === null || (handEndTime !== null && endTime > handEndTime)) {
                endTime = handEndTime;
            }
        }
        // TODO : FIX HAND MOVEMENT AT THE END HAPPENING AFTER THE END.
        // @ts-expect-error startTime is null if and only if endTime is null too.
        return [
            startTime === null ? startTime : startTime - 2,
            endTime === null ? endTime : endTime + 2
        ];
    }
}
