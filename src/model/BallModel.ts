import * as THREE from "three";
import {
    CatchEvent,
    TossEvent,
    TablePutEvent,
    TableTakeEvent,
    BallTimelineEvent
} from "./timelines/TimelineEvents";
import { BallTimeline } from "./timelines/BallTimeline";
import { JugglerModel } from "./JugglerModel";
import { ballPosition, ballVelocityAtStartEnd } from "./BallPhysics";

//TODO : Remove ID alltogether in the whole project for balls. We only have the name (which must be unique) and the eventual sound the ball makes.
//TODO : Make errors thrown be console log when not in debug mode to prevent app blocking ?
//TODO : What is readonly ?
//TODO : velocity
//TODO : acceleration

/**
 * Interface for the constructor of BallModel.
 */
interface BallModelParams {
    /**
     * The name of the ball. TODO : Will change.
     */
    name?: string;
    /**
     * The unique ID amongst of ball of the ball. TODO : Will change.
     */
    id?: string;
    /**
     * The radius of the ball.
     */
    radius?: number;
    /**
     * The timeline of events (throws, catches, ...) of the ball.
     */
    timeline?: BallTimeline;
    /**
     * A juggler the ball belongs to (if it makes sense, a ball may travel between jugglers all the time for instance).
     */
    defaultJuggler?: JugglerModel;
}

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
    /**
     * The name of the ball. TODO : Will change.
     */
    name: string;
    /**
     * The timeline of events (throws, catches, ...) of the ball.
     */
    timeline: BallTimeline;
    /**
     * A juggler the ball belongs to (if it makes sense, a ball may travel between jugglers all the time for instance).
     */
    defaultJuggler?: JugglerModel;

    constructor({ radius, id, name, timeline, defaultJuggler }: BallModelParams = {}) {
        this.radius = radius ?? 0.1;
        this.timeline = timeline ?? new BallTimeline();
        this.id = id ?? "None";
        this.name = name ?? "None";
        this.defaultJuggler = defaultJuggler;
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
            return event.hand.positionAtEvent(event.handMultiEvent());
        } else if (event instanceof TablePutEvent) {
            return event.table.ballPosition(this);
        }
        throw Error("Unimplemented behaviour");
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
                // if (this.defaultTable !== undefined) {
                //     return this.defaultTable.ballPosition(this);
                // } else if (this.defaultJuggler?.default_table !== undefined) {
                //     return this.defaultJuggler.default_table.ballPosition(this);
                if (this.defaultJuggler?.defaultTable !== undefined) {
                    return this.defaultJuggler.defaultTable.ballPosition(this);
                } else {
                    return new THREE.Vector3(-100, -100, -100);
                    // this.throwTimelineError(prevEvent, nextEvent);
                }
            }
            if (nextEvent instanceof CatchEvent) {
                this._throwTimelineError(prevEvent, nextEvent);
            }
            if (nextEvent instanceof TossEvent || nextEvent instanceof TablePutEvent) {
                return nextEvent.hand.position(time);
            }
            if (nextEvent instanceof TableTakeEvent) {
                return nextEvent.table.ballPosition(this);
            }
        }
        if (prevEvent instanceof CatchEvent) {
            if (
                nextEvent === null ||
                nextEvent instanceof TossEvent ||
                nextEvent instanceof TablePutEvent
            ) {
                return prevEvent.hand.position(time);
            }
            if (nextEvent instanceof CatchEvent || nextEvent instanceof TableTakeEvent) {
                this._throwTimelineError(prevEvent, nextEvent);
            } //Stop the looping if was set to loop.
        }
        if (prevEvent instanceof TossEvent) {
            if (nextEvent instanceof CatchEvent) {
                return ballPosition(
                    prevEvent.hand.positionAtEvent(prevEvent.handMultiEvent()),
                    prevEvent.time,
                    nextEvent.hand.positionAtEvent(nextEvent.handMultiEvent()),
                    nextEvent.time,
                    time
                );
            }
            if (nextEvent instanceof TablePutEvent) {
                return ballPosition(
                    prevEvent.hand.positionAtEvent(prevEvent.handMultiEvent()),
                    prevEvent.time,
                    nextEvent.table.ballPosition(this),
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
                return prevEvent.table.ballPosition(this);
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
                return prevEvent.hand.position(time);
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
            prevEvent = event.prevBallEvent()[1];
            nextEvent = event;
            isTossed = false;
        } else {
            prevEvent = event;
            nextEvent = event.nextBallEvent()[1];
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
