import * as THREE from "three";
import {
    CatchEvent,
    TossEvent,
    TablePutEvent,
    TableTakeEvent,
    BallTimelineEvent
} from "./timelines/TimelineEvents";
import { BallTimeline } from "./timelines/BallTimeline";
import { ballPosition, ballVelocityAtStartEnd } from "./BallPhysics";
import { PerformanceChild, PerformanceChildParams } from "./PerformanceChild";

//TODO : Remove ID alltogether in the whole project for balls. We only have the name (which must be unique) and the eventual sound the ball makes.
//TODO : Make errors thrown be console log when not in debug mode to prevent app blocking ?
//TODO : What is readonly ?
//TODO : velocity
//TODO : acceleration

/**
 * Interface for the constructor of BallModel.
 */
type BallModelParams = PerformanceChildParams & {
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
    private _throwTimelineError(
        event1: BallTimelineEvent | null,
        event2: BallTimelineEvent | null
    ): void {
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
    positionAtEvent(event: BallTimelineEvent | null): THREE.Vector3 {
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
        const spotPos = this.performance.getTable(tableID).spotPosition(spot);
        spotPos.y += this.radius;
        return spotPos;
    }

    /** Returns the ball's position at a given time.
     * @param time The time in seconds.
     * @returns The position of the ball at that given time.
     */
    position(time: number): THREE.Vector3 {
        const [, prevEvent] = this.timeline.prevEvent(time);
        const [, nextEvent] = this.timeline.nextEvent(time);

        if (prevEvent === null) {
            if (nextEvent === null) {
                return new THREE.Vector3(0, -1000, 0);
            }
            if (nextEvent instanceof CatchEvent) {
                this._throwTimelineError(prevEvent, nextEvent);
            }
            if (nextEvent instanceof TossEvent || nextEvent instanceof TablePutEvent) {
                return this.performance
                    .getHand(nextEvent.jugglerName, nextEvent.isRightHand)
                    .position(time);
            }
            if (nextEvent instanceof TableTakeEvent) {
                return this.positionOnTable(nextEvent.tableID, nextEvent.spot);
            }
        }
        if (prevEvent instanceof CatchEvent) {
            if (
                nextEvent === null ||
                nextEvent instanceof TossEvent ||
                nextEvent instanceof TablePutEvent
            ) {
                return this.performance
                    .getHand(prevEvent.jugglerName, prevEvent.isRightHand)
                    .position(time);
            }
            if (nextEvent instanceof CatchEvent || nextEvent instanceof TableTakeEvent) {
                this._throwTimelineError(prevEvent, nextEvent);
            } //Stop the looping if was set to loop.
        }
        if (prevEvent instanceof TossEvent) {
            if (nextEvent instanceof CatchEvent) {
                return ballPosition(
                    this.performance
                        .getHand(prevEvent.jugglerName, prevEvent.isRightHand)
                        .positionAtEvent(prevEvent),
                    prevEvent.time,
                    this.performance
                        .getHand(nextEvent.jugglerName, nextEvent.isRightHand)
                        .positionAtEvent(nextEvent),
                    nextEvent.time,
                    time
                );
            }
            if (nextEvent instanceof TablePutEvent) {
                return ballPosition(
                    this.performance
                        .getHand(prevEvent.jugglerName, prevEvent.isRightHand)
                        .positionAtEvent(prevEvent),
                    prevEvent.time,
                    this.positionOnTable(nextEvent.tableID, nextEvent.spot),
                    nextEvent.time,
                    time
                );
            }
            if (
                nextEvent === null ||
                nextEvent instanceof TossEvent ||
                nextEvent instanceof TableTakeEvent
            ) {
                this._throwTimelineError(prevEvent, nextEvent);
            }
        }
        if (prevEvent instanceof TablePutEvent) {
            if (nextEvent === null || nextEvent instanceof TableTakeEvent) {
                return this.positionOnTable(prevEvent.tableID, prevEvent.spot);
            }
            if (
                nextEvent instanceof CatchEvent ||
                nextEvent instanceof TossEvent ||
                nextEvent instanceof TablePutEvent
            ) {
                this._throwTimelineError(prevEvent, nextEvent);
            }
        }
        if (prevEvent instanceof TableTakeEvent) {
            if (
                nextEvent === null ||
                nextEvent instanceof TossEvent ||
                nextEvent instanceof TablePutEvent
            ) {
                return this.performance
                    .getHand(prevEvent.jugglerName, prevEvent.isRightHand)
                    .position(time);
            }
            if (nextEvent instanceof CatchEvent || nextEvent instanceof TableTakeEvent) {
                this._throwTimelineError(prevEvent, nextEvent);
            }
        }
        throw Error("Unimplemented behaviour");
    }

    //TODO : Extend to any event.
    //TODO : Extend to velocity at any point (but first, rework hand movement).
    /**
     * Returns the ball's velocity at a specific catch or toss event from the timeline.
     * @param event the event.
     * @returns the velocity at that time.
     */
    velocityAtCatchTossEvent(event: CatchEvent | TossEvent): THREE.Vector3 {
        let prevEvent: BallTimelineEvent | null;
        let nextEvent: BallTimelineEvent | null;
        let isTossed: boolean;
        if (event instanceof CatchEvent) {
            prevEvent = this.performance.getBall(event.ballID).timeline.prevEvent(event.time)[1];
            nextEvent = event;
            isTossed = false;
        } else {
            prevEvent = event;
            nextEvent = this.performance.getBall(event.ballID).timeline.nextEvent(event.time)[1];
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
