import {
    AirborneBallEvent,
    BallEvent,
    HeldBallEvent,
    TableBallEvent
} from "./timelines/BallTimeline";
import { BallTimeline } from "./timelines/BallTimeline";
import { ballPosition, ballVelocityAtStartEnd } from "./BallPhysics";
import { PerformanceModelRef, PerformanceRefParams } from "./PerformanceChild";
import { Object3D, Vector3, Vector3Tuple } from "three";
import { VERY_VERY_FAR_VEC } from "./PerformanceModel";
import { ThreeSyncedScale } from "./ThreeSyncedProperty";

//TODO : Remove ID alltogether in the whole project for balls. We only have the name (which must be unique) and the eventual sound the ball makes.
//TODO : Make errors thrown be console log when not in debug mode to prevent app blocking ?
//TODO : What is readonly ?
//TODO : velocity
//TODO : acceleration

/**
 * Interface for the constructor of BallModel.
 */
type BallModelParams = {
    /**
     * The unique ID of the ball that identifies it from other balls.
     */
    id: string;
    /**
     * The radius of the ball.
     */
    radius?: number;
    /**
     * The timeline of events (tosses, catches, ...) of the ball.
     */
    timeline?: BallTimeline;
    scale?: Vector3;
};

/**
 * A model class that can perform many computations
 * (position, velocity, ...) representing a ball.
 */
export class BallModel {
    /**
     * The radius of the ball.
     */
    radius: number;
    /**
     * The unique ID amongst of ball of the ball. TODO : Will change.
     */
    id: string;

    scale: ThreeSyncedScale;

    /**
     * The timeline of events (throws, catches, ...) of the ball.
     */
    timeline: BallTimeline;

    performance: PerformanceModelRef;

    readonly _object = new Object3D();

    constructor({ radius, id, timeline, scale }: BallModelParams) {
        this.id = id;
        this.radius = radius ?? 0.1;
        this.timeline = timeline ?? new BallTimeline();
        this.scale = new ThreeSyncedScale(this._object, scale);
        this.performance = new PerformanceModelRef();
    }

    scaledRadius(): number {
        // TODO : Handle the fact that the ball's scale may not be the same number on all axis... I'm sad...
        return this.radius * Math.max(...this.scale.getGlobal());
    }

    /**
     * Return the ball's position on the table.
     * @param tableID the unique ID of the table in the performance.
     * @param spot the spot's name on the table if there is one, undefined otherwise.
     * @returns the position of the center of the ball.
     */
    positionOnTable(tableID: string, spot: string | undefined): Vector3 {
        const performance = this.performance.get();
        if (performance === undefined) {
            return VERY_VERY_FAR_VEC.clone();
        }
        const spotGlobalPos = performance.getTable(tableID).spotPosition(spot);
        spotGlobalPos.y += this.scaledRadius();
        return spotGlobalPos;
    }
}
