import * as THREE from "three";
import {
    AirborneBallEvent,
    BallEvent,
    HeldBallEvent,
    TableBallEvent
} from "./timelines/BallTimeline";
import { BallTimeline } from "./timelines/BallTimeline";
import { ballPosition, ballVelocityAtStartEnd } from "./BallPhysics";
import { PerformanceChild, PerformanceRefParams } from "./PerformanceChild";

//TODO : Remove ID alltogether in the whole project for balls. We only have the name (which must be unique) and the eventual sound the ball makes.
//TODO : Make errors thrown be console log when not in debug mode to prevent app blocking ?
//TODO : What is readonly ?
//TODO : velocity
//TODO : acceleration

const VERY_VERY_FAR_POS: THREE.Vector3Tuple = [0, -1000, 0];

/**
 * Interface for the constructor of BallModel.
 */
type BallModelParams = PerformanceRefParams & {
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
};

/**
 * A model class that can perform many computations
 * (position, velocity, ...) representing a ball.
 */
export class BallModel extends PerformanceChild {
    /**
     * The radius of the ball.
     */
    radius: number;
    /**
     * The unique ID amongst of ball of the ball. TODO : Will change.
     */
    id: string;
    /**
     * The timeline of events (throws, catches, ...) of the ball.
     */
    timeline: BallTimeline;

    constructor({ radius, id, timeline, performance }: BallModelParams) {
        super({ performance });
        this.id = id;
        this.radius = radius ?? 0.1;
        this.timeline = timeline ?? new BallTimeline();
    }

    /**
     * Throws an error when two events occuring next to each other don't make sense.
     * @param event1 the previous event.
     * @param event2 the following event.
     */
    private _throwTimelineError(event1: BallEvent | null, event2: BallEvent | null): void {
        const str1 =
            event1 === null
                ? `has previous event null`
                : `is ${event1.actionDescription} at time ${event1.time}`;
        const str2 =
            event2 === null
                ? `has next event null`
                : `is ${event2.actionDescription} at time ${event2.time}`;
        throw Error(`Ball ${this.id} ${str1} and ${str2}.`);
    }

    /**
     * Returns the ball's position at a specific event from the timeline.
     * @param event the event.
     * @returns the position where that event occurs.
     */
    positionAtEvent(event: BallEvent | null): THREE.Vector3 {
        if (event === null) {
            throw Error();
        } else if (
            event instanceof CatchEvent ||
            event instanceof TossEvent ||
            event instanceof TableTakeEvent
        ) {
            //TableTakeEvent for now here as the ball teleports from table to hand, so is in hand.
            //With proper animations, could change.
            return this.performance
                .getHand(event.jugglerName, event.isRightHand)
                .positionAtEvent(event);
        } else if (event instanceof TablePutEvent) {
            return this.positionOnTable(event.tableID, event.spot);
        }
        throw Error("Unimplemented behaviour");
    }

    /**
     * Return the ball's position on the table.
     * @param tableID the unique ID of the table in the performance.
     * @param spot the spot's name on the table if there is one, undefined otherwise.
     * @returns the position of the center of the ball.
     */
    positionOnTable(tableID: string, spot: string | undefined): THREE.Vector3 {
        const spotPos = this.performance.tables.getSurely(tableID).spotPosition(spot);
        spotPos.y += this.radius;
        return spotPos;
    }

    /** Returns the ball's position at a given time.
     * @param time The time in seconds.
     * @returns The position of the ball at that given time.
     */
    position(time: number): THREE.Vector3 {
        const [prevEventTime, prevEvent] = this.timeline.prevEvent(time);

        if (prevEvent === null) {
            // We need to look at the next event to figure out where the ball
            // should be.
            const [, nextEvent] = this.timeline.nextEvent(time);
            if (nextEvent === null) {
                return new THREE.Vector3(...VERY_VERY_FAR_POS);
            } else if (nextEvent.type === "airborne") {
                this._throwTimelineError(prevEvent, nextEvent);
                return new THREE.Vector3(...VERY_VERY_FAR_POS);
            } else if (nextEvent.type === "held") {
                return this.performance
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
                return new THREE.Vector3(...VERY_VERY_FAR_POS);
            }

            // Check if the ball files from something that we can understand as an origin.
            const [, prevPrevEvent] = this.timeline.prevEvent(prevEventTime, true);
            if (prevPrevEvent === null || prevPrevEvent.type === "airborne") {
                this._throwTimelineError(prevEvent, nextEvent);
                return new THREE.Vector3(...VERY_VERY_FAR_POS);
            }

            // Compute the targets.
            let toPos: THREE.Vector3;
            if (nextEvent.type === "held") {
                // TODO : Compute catch position.
                toPos = this.performance
                    .getHand(nextEvent.jugglerName, nextEvent.rightHand)
                    .ballPositionAtEvent(time);
            } else {
                toPos = this.positionOnTable(nextEvent.tableID, nextEvent.spot);
            }

            let fromPos: THREE.Vector3;
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

    //TODO : Extend to any event.
    //TODO : Extend to velocity at any point (but first, rework hand movement).
    /**
     * Returns the ball's velocity at a specific catch or toss event from the timeline.
     * @param event the event.
     * @returns the velocity at that time.
     */
    velocityOnCatchOrToss(event: AirborneBallEvent, on: "catch" | "toss"): THREE.Vector3 {
        let prevEvent: BallEvent | null;
        let nextEvent: BallEvent | null;
        let isTossed: boolean;
        if (event instanceof CatchEvent) {
            prevEvent = this.timeline.prevEvent(event.time)[1];
            nextEvent = event;
            isTossed = false;
        } else {
            prevEvent = event;
            nextEvent = this.timeline.nextEvent(event.time)[1];
            isTossed = true;
        }
        //Validation of events ?
        if (
            prevEvent instanceof TossEvent &&
            (nextEvent instanceof CatchEvent || nextEvent instanceof TablePutEvent)
        ) {
            return ballVelocityAtStartEnd(
                this.positionAtEvent(prevEvent),
                prevEvent.time,
                this.positionAtEvent(nextEvent),
                nextEvent.time,
                isTossed
            );
        }
        throw Error("Unimplemented behaviour");
    }
}