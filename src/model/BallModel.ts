import {
    AirborneBallEvent,
    BallEvent,
    HeldBallEvent,
    TableBallEvent
} from "./timelines/BallTimeline";
import { BallTimeline } from "./timelines/BallTimeline";
import { ballPosition, ballVelocityAtStartEnd } from "./BallPhysics";
import { PerformanceModelRef } from "./PerformanceChild";
import { Object3D, Vector3, Vector3Tuple } from "three";
import { PerformanceModel, VERY_VERY_FAR_VEC } from "./PerformanceModel";
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
        if (performance === undefined) {
            return VERY_VERY_FAR_VEC.clone();
        }
        const tableModel = this.performance.get().getTable(tableID);
        const spotGlobalPos = tableModel.spotPosition(spot);
        return spotGlobalPos.add(tableModel.upVector().multiplyScalar(this.scaledRadius()));
    }

    /** Returns the ball's position at a given time.
     * @param time The time in seconds.
     * @returns The position of the ball at that given time.
     */
    position(time: number): Vector3 {
        const [prevEventTime, prevEvent] = this.timeline.prevEvent(time);

        if (prevEvent === null) {
            // We need to look at the next event to figure out where the ball should be.
            const [, nextEvent] = this.timeline.nextEvent(time);
            if (nextEvent === null) {
                return VERY_VERY_FAR_VEC.clone();
            } else if (nextEvent.type === "airborne") {
                // this._throwTimelineError(prevEvent, nextEvent);
                return VERY_VERY_FAR_VEC.clone();
            } else if (nextEvent.type === "held") {
                return this.performance
                    .get()
                    .getHand(nextEvent.jugglerName, nextEvent.rightHand)
                    .position(time);
            } else {
                return this.positionOnTable(nextEvent.tableID, nextEvent.spot);
            }
        } else if (prevEvent.type === "airborne") {
            // Check if the ball flies toward something we can interpret as a target.
            const [nextEventTime, nextEvent] = this.timeline.nextEvent(time);
            if (nextEvent === null || nextEvent.type === "airborne") {
                this._throwTimelineError(prevEvent, nextEvent);
                return VERY_VERY_FAR_VEC.clone();
            }

            // Check if the ball files from something that we can understand as an origin.
            const [, prevPrevEvent] = this.timeline.prevEvent(prevEventTime, true);
            if (prevPrevEvent === null || prevPrevEvent.type === "airborne") {
                this._throwTimelineError(prevEvent, nextEvent);
                return VERY_VERY_FAR_VEC.clone();
            }

            // Compute the targets.
            let toPos: Vector3;
            if (nextEvent.type === "held") {
                // TODO : Compute catch position.
                toPos = this.performance
                    .getHand(nextEvent.jugglerName, nextEvent.rightHand)
                    .ballPositionAtEvent(time);
            } else {
                toPos = this.positionOnTable(nextEvent.tableID, nextEvent.spot);
            }

            let fromPos: Vector3;
            if (prevPrevEvent.type === "held") {
                // TODO : Compute toss position.
                // Notice we get the hand from the prevPrevEvent,
                // But we get the toss time from the prevEvent.
                fromPos = this.performance
                    .getHand(prevPrevEvent.jugglerName, prevPrevEvent.rightHand)
                    .ballPositionAtEvent(time);
            } else {
                fromPos = this.positionOnTable(prevPrevEvent.tableID, prevPrevEvent.spot);
            }

            // Compute where we are in the air.
            return ballPosition(fromPos, prevEventTime, toPos, nextEventTime, time);
        } else if (prevEvent.type === "held") {
            return this.performance
                .getHand(prevEvent.jugglerName, prevEvent.rightHand)
                .position(time);
        } else {
            return this.positionOnTable(prevEvent.tableID, prevEvent.spot);
        }
    }
}
