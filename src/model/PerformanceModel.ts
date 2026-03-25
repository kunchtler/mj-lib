import { Object3D, Vector3 } from "three";
import { BallModel } from "./BallModel.js";
import { HandModel } from "./HandModel.js";
import { JugglerModel } from "./JugglerModel.js";
import { MapCallbacks } from "./MapCallbacks.js";
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
 * Position where objects will go in case of an error or empty timeline.
 */
export const VERY_VERY_FAR_VEC = new Vector3(0, -1000, 0);

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
    readonly balls: MapCallbacks<string, BallModel>;
    /**
     * The jugglers involved in the performance.
     */
    readonly jugglers: MapCallbacks<string, JugglerModel>;
    /**
     * The tables used in the performance.
     */
    readonly tables: MapCallbacks<string, TableModel>;

    readonly _object: Object3D;

    constructor({ balls, jugglers, tables }: PerformanceModelParams = {}) {
        this._object = new Object3D();

        const threeObj = this._object;

        // BallModels map creation
        const onBallSet = (ballID: string, ballModel: BallModel) => {
            ballModel.performance.set(this);
            threeObj.add(ballModel._object);
        };
        const onBallDelete = (ballID: string, ballModel?: BallModel) => {
            if (ballModel !== undefined) {
                ballModel.performance.set(undefined);
                threeObj.remove(ballModel._object);
            }
        };
        const errorMessageBall = (ballID: string) => `Unknown ball ID "${ballID}"`;
        this.balls = new MapCallbacks<string, BallModel>({
            onSetElement: onBallSet,
            onDeleteElement: onBallDelete,
            errorMessageGet: errorMessageBall,
            entries: balls
        });

        // JugglerModels map creation
        const onJugglerSet = (jugglerName: string, jugglerModel: JugglerModel) => {
            jugglerModel.performance.set(this);
            threeObj.add(jugglerModel._object);
            // Also add the performance to the hands.
            jugglerModel.hands[0].performance.set(this);
            jugglerModel.hands[1].performance.set(this);
        };
        const onJugglerDelete = (ballID: string, jugglerModel?: JugglerModel) => {
            if (jugglerModel !== undefined) {
                jugglerModel.performance.set(undefined);
                threeObj.remove(jugglerModel._object);
                // Also remove the performance from the hands.
                jugglerModel.hands[0].performance.set(this);
                jugglerModel.hands[1].performance.set(this);
            }
        };
        const errorMessageJuggler = (jugglerName: string) =>
            `Unknown juggler name "${jugglerName}"`;
        this.jugglers = new MapCallbacks<string, JugglerModel>({
            onSetElement: onJugglerSet,
            onDeleteElement: onJugglerDelete,
            errorMessageGet: errorMessageJuggler,
            entries: jugglers
        });

        // TableModels map creation
        const onTableSet = (tableID: string, tableModel: TableModel) => {
            threeObj.add(tableModel._object);
        };
        const onTableDelete = (ballID: string, tableModel?: TableModel) => {
            if (tableModel !== undefined) {
                threeObj.remove(tableModel._object);
            }
        };
        const errorMessageTable = (tableID: string) => `Unknown table ID "${tableID}"`;
        this.tables = new MapCallbacks<string, TableModel>({
            onSetElement: onTableSet,
            onDeleteElement: onTableDelete,
            errorMessageGet: errorMessageTable,
            entries: tables
        });
    }

    /**
     * Computes the first and last event times.
     * @returns
     * - [null, null] if there are no events.
     * - [startTime, endTime] otherwise.
     */
    patternTimeBounds(): [number, number] | [null, null] {
        let minStartTime: number | null = null;
        let maxEndTime: number | null = null;

        // Iterate through the jugglers.
        for (const juggler of this.jugglers.values()) {
            const [handStartTime, handEndTime] = juggler.patternTimeBounds();
            if (minStartTime === null || (handStartTime !== null && handStartTime < minStartTime)) {
                minStartTime = handStartTime;
            }
            if (maxEndTime === null || (handEndTime !== null && maxEndTime < handEndTime)) {
                maxEndTime = handEndTime;
            }
        }

        // Iterate through the balls.
        for (const ball of this.balls.values()) {
            const [ballStartTime, ballEndTime] = ball.timeline.timeBounds();
            if (minStartTime === null || (ballStartTime !== null && ballStartTime < minStartTime)) {
                minStartTime = ballStartTime;
            }
            if (maxEndTime === null || (ballEndTime !== null && maxEndTime < ballEndTime)) {
                maxEndTime = ballEndTime;
            }
        }


        // @ts-expect-error startTime is null if and only if endTime is null too.
        return [minStartTime, maxEndTime];
    }

    // addBall(): BallModel {}

    // addJuggler(): JugglerModel {}

    // addTable(): TableModel {}

    // deleteBall(): boolean {}

    // deleteJuggler(): boolean {}

    // deleteTable(): boolean {}

    // getJuggler(jugglerName: string): JugglerModel {
    //     const jugglerModel = this.jugglers.get(jugglerName);
    //     if (jugglerModel === undefined) {
    //         throw Error(`Unknown juggler name "${jugglerName}"`);
    //     }
    //     return jugglerModel;
    // }

    getHand(jugglerName: string, isRightHand: boolean): HandModel {
        return this.jugglers.getSurely(jugglerName).hands[isRightHand ? 1 : 0];
    }

    // getBall(ballID: string): BallModel {
    //     const ballModel = this.balls.get(ballID);
    //     if (ballModel === undefined) {
    //         throw Error(`Unknown ball ID "${ballID}"`);
    //     }
    //     return ballModel;
    // }

    // getTable(tableID: string): TableModel {
    //     const TableModel = this.tables.get(tableID);
    //     if (TableModel === undefined) {
    //         throw Error(`Unknown table name "${tableID}"`);
    //     }
    //     return TableModel;
    // }
}
