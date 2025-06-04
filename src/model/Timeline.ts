import { BallModel } from "./BallModel";
import { HandModel } from "./HandModel";
import { TableModel } from "./TableModel";
import { OrderedMap } from "js-sdsl";

// TODO : time redundant if in EventType ? Remove it ?
// Garbage in, garbage out.

//TODO : Methods to create / modify / delete events without interacting with OrderedMap directly ?
//TODO : Rename key to time ?
// (and to not mess up modifying or fusing of events for instance)
/**
 * Generic timeline class. Allows a single event to exist at different times.
 * Internally, uses js-sdsl OrderedMap class to keep elements ordered as they are added.
 */
export class Timeline<TimeType, EventType> extends OrderedMap<TimeType, EventType> {
    /**
     * Get the closest event before a given time.
     * @param time a time to search for.
     * @param strict whether the returned event's time is < or <= than the time we're looking for.
     * Defaults to <.
     * @returns
     * - [null, null] if no event is after the target time.
     * - [time, event] otherwise.
     */
    prevEvent(time: TimeType, strict = false): [TimeType, EventType] | [null, null] {
        const it = strict ? this.reverseUpperBound(time) : this.reverseLowerBound(time);
        //We make a copy of the contents of the list because the list itself
        //is a proxy otherwise (which has unfridenly console.logs).
        return it.isAccessible() ? [...it.pointer] : [null, null];
    }

    /**
     * Get the closest event after a given time.
     * @param time a time to search for.
     * @param strict whether the returned event's time is > or >= than the time we're looking for.
     * Defaults to >=.
     * @returns
     * - [null, null] if no event is before the target time.
     * - [time, event] otherwise.
     */
    nextEvent(time: TimeType, strict = true): [TimeType, EventType] | [null, null] {
        const it = strict ? this.upperBound(time) : this.lowerBound(time);
        return it.isAccessible() ? [...it.pointer] : [null, null];
    }

    /**
     * Get the bounds (first and last event) of the timeline.
     * @returns
     * - [null, null] if no event is in the timeline.
     * - [startTime, endTime] otherwise.
     */
    timeBounds(): [TimeType, TimeType] | [null, null] {
        const itBegin = this.begin();
        const itEnd = this.rBegin();
        if (!itBegin.isAccessible()) {
            // We can access the beginning if and only if we can access the end.
            return [null, null];
        }
        return [itBegin.pointer[0], itEnd.pointer[0]];
    }

    /**
     * Create a string of the whole timeline in a human friendly fashion.
     * @param stringifyTime an optional function to stringify the time.
     * @param stringifyEvent an optional function to stringify the events.
     * @returns a string.
     */
    stringify(
        stringifyTime?: (key: TimeType) => string,
        stringifyEvent?: (elem: EventType) => string
    ) {
        let text = "";
        this.forEach(([time, event]) => {
            text += `\
${stringifyTime === undefined ? time : stringifyTime(time)}: \
${stringifyEvent === undefined ? event : stringifyEvent(event)}\n`;
        });
        return text;
    }
}

/**
 * Basic interface for a juggling event. All juggling events interfaces extend it.
 */
export interface BaseEvent {
    /**
     * The time the event happens at in seconds.
     */
    time: number;
    /**
     * Represent the event in a human readible format (useful for debugging).
     * @returns a pretty string.
     */
    stringify: () => string;
}

/**
 * Interface for a sound event. TODO : Not really because it is a member of the events having sound. to change ?
 */
export interface EventSound {
    /**
     * The name of the sound to play.
     */
    name: string | string[];
    /**
     * Whether the sound should loop until the next event.
     */
    loop?: boolean;
}

/**
 * Base interface for all events involving a ball.
 */
export interface BallEventInterface extends BaseEvent {
    /**
     * The ball the event references.
     */
    ball: BallModel;
    /**
     * Verb charcterising the event (eg. tossed, caught, ...) to help with printing debug information.
     */
    actionDescription: string;
    /**
     * Access the next ball event in the ball's timeline of events.
     * @returns
     * - [null, null] if this event is the last and there aren't any after.
     * - [timeOfTheEvent, event] otherwise.
     */
    nextBallEvent: () => [number, BallTimelineEvent] | [null, null];
    /**
     * Access the previous ball event in the ball's timeline of events.
     * @returns
     * - [null, null] if this event is the first and there aren't any before.
     * - [timeOfTheEvent, event] otherwise.
     */
    prevBallEvent: () => [number, BallTimelineEvent] | [null, null];
    /**
     * Whether the ball should emit some sound when that event happens.
     */
    sound?: EventSound;
}

/**
 * Base interface for all events (both single and multi events) involving a hand.
 */
export interface HandEventInterface extends BaseEvent {
    /**
     * The hand the event references.
     */
    hand: HandModel;
    /**
     * The juggling unit time of the juggler when the event happened.
     */
    unitTime: number;
    /**
     * A method to access the next hand multi-event in the ball's timeline of events.
     */
    nextHandEvent(): [number, HandTimelineEvent] | [null, null];
    /**
     * A method to acces the previous hand multi-event in the ball's timeline of events.
     */
    prevHandEvent(): [number, HandTimelineEvent] | [null, null];
    /**
     * If the current event is part of a bigger multi-event at the same time, this method returns that multi-event.
     */
    handMultiEvent(): HandTimelineEvent | null;
}

/**
 * Class used to represent an event involving both a ball and a hand.
 */
export class AbstractBallHandEvent implements BallEventInterface, HandEventInterface {
    /**
     * Internal reference to the ball, as a WeakRef to also garbage collection.
     */
    private _ballRef: WeakRef<BallModel>;
    /**
     * Internal reference to the hand, as a WeakRef to also garbage collection.
     */
    private _handRef: WeakRef<HandModel>;
    time: number;
    unitTime: number;
    readonly actionDescription: string = "unnamed attribute";
    sound?: EventSound;

    /**
     * @param param.time - the time the event happens at.
     * @param param.unitTime - the unit time of the juggler at that time.
     * @param param.sound - the sound the ball makes at that time.
     * @param param.ball - the ball involved in that event.
     * @param param.hand - the hand involved in that event.
     */
    constructor({
        time,
        unitTime,
        sound,
        ball,
        hand
    }: {
        time: number;
        unitTime: number;
        sound?: string | EventSound;
        ball: BallModel;
        hand: HandModel;
    }) {
        this.time = time;
        this.unitTime = unitTime;
        this._ballRef = new WeakRef(ball);
        this._handRef = new WeakRef(hand);
        this.sound = typeof sound === "string" ? { name: sound } : sound;
    }

    get ball(): BallModel {
        const obj = this._ballRef.deref();
        if (obj === undefined) {
            throw new Error("hand is undefined");
        }
        return obj;
    }

    set ball(newBall: BallModel) {
        this._ballRef = new WeakRef(newBall);
    }

    get hand(): HandModel {
        const obj = this._handRef.deref();
        if (obj === undefined) {
            throw new Error("hand is undefined");
        }
        return obj;
    }

    set hand(newHand: HandModel) {
        this._handRef = new WeakRef(newHand);
    }

    prevBallEvent(): [number, BallTimelineEvent] | [null, null] {
        return this.ball.timeline.prevEvent(this.time, true);
    }

    nextBallEvent(): [number, BallTimelineEvent] | [null, null] {
        return this.ball.timeline.nextEvent(this.time);
    }

    prevHandEvent(): [number, HandTimelineEvent] | [null, null] {
        return this.hand.timeline.prevEvent(this.time, true);
    }

    nextHandEvent(): [number, HandTimelineEvent] | [null, null] {
        return this.hand.timeline.nextEvent(this.time);
    }

    handMultiEvent(): HandTimelineEvent | null {
        const it = this.hand.timeline.find(this.time);
        return it.isAccessible() ? it.pointer[1] : null;
    }

    stringify(): string {
        const soundText =
            this.sound === undefined
                ? ""
                : `emits ${this.sound.loop ? "looping " : ""}sound ${this.sound.name} `;
        return `Ball ${this.ball.name} ${this.actionDescription} by ${this.hand.juggler.name}'s ${this.hand.isRightHand ? "right" : "left"} hand ${soundText}(time: ${this.time}).`;
    }
}

/**
 * Class used to represent an event involving a Hand.
 */
export class AbstractHandEvent implements HandEventInterface {
    /**
     * Internal reference to the hand, as a WeakRef to also garbage collection.
     */
    private _handRef: WeakRef<HandModel>;
    time: number;
    unitTime: number;

    constructor({ time, unitTime, hand }: { time: number; unitTime: number; hand: HandModel }) {
        this.time = time;
        this._handRef = new WeakRef(hand);
        this.unitTime = unitTime;
    }

    get hand(): HandModel {
        const obj = this._handRef.deref();
        if (obj === undefined) {
            throw new Error("hand is undefined");
        }
        return obj;
    }

    set hand(new_hand: HandModel) {
        this._handRef = new WeakRef(new_hand);
    }

    prevHandEvent(): [number, HandTimelineEvent] | [null, null] {
        return this.hand.timeline.prevEvent(this.time, true);
    }

    nextHandEvent(): [number, HandTimelineEvent] | [null, null] {
        return this.hand.timeline.nextEvent(this.time);
    }

    handMultiEvent(): HandTimelineEvent | null {
        const it = this.hand.timeline.find(this.time);
        return it.isAccessible() ? it.pointer[1] : null;
    }

    stringify(): string {
        return `Event with ${this.hand.juggler.name}'s ${this.hand.isRightHand ? "right" : "left"} hand (time: ${this.time}).`;
    }
}

/**
 * Class used to represent an event involving a ball, a table and a hand.
 */
export class AbstractBallTableHandEvent extends AbstractBallHandEvent {
    /**
     * The tabel the event involves.
     */
    table: TableModel;

    constructor({
        time,
        unitTime,
        ball,
        hand,
        table,
        sound
    }: {
        time: number;
        unitTime: number;
        ball: BallModel;
        hand: HandModel;
        table: TableModel;
        sound?: string | EventSound;
    }) {
        super({ time, unitTime, ball, hand, sound });
        this.table = table;
    }
}

/**
 * Event when a ball is tossed by a hand.
 */
export class TossEvent extends AbstractBallHandEvent {
    readonly actionDescription = "tossed";
}

/**
 * Event when a ball is caught by a hand.
 */
export class CatchEvent extends AbstractBallHandEvent {
    readonly actionDescription = "caught";
}

/**
 * Event when a ball is put on a table with a hand.
 */
export class TablePutEvent extends AbstractBallTableHandEvent {
    readonly actionDescription = "put on table";
}

/**
 * Event when a ball is taken from a table with a hand.
 */
export class TableTakeEvent extends AbstractBallTableHandEvent {
    readonly actionDescription = "taken from table";
}

/**
 * Class that represents multiple hand events happening at the exact same time (for instance, catching multiple balls).
 */
export class HandMultiEvent<T extends HandEventInterface> extends AbstractHandEvent {
    events: T[];
    constructor({
        time,
        unitTime,
        hand,
        events
    }: {
        time: number;
        unitTime: number;
        hand: HandModel;
        events?: T[];
    }) {
        super({ time, unitTime, hand });
        this.events = events ?? [];
    }
}

/** Union of all single-events that a hand can perform in the timeline. */
export type HandTimelineSingleEvent = CatchEvent | TossEvent | TableTakeEvent | TablePutEvent;
/** All multi-events that a hand can perform in the timeline. */
export type HandTimelineEvent = HandMultiEvent<HandTimelineSingleEvent>;
/** All events a that a ball can perform in the timeline. */
export type BallTimelineEvent = CatchEvent | TossEvent | TablePutEvent | TableTakeEvent;

// export class HandMultiCatchThrowEvent extends HandMultiEvent<CatchEvent | ThrowEvent> {}
// export class HandMultiTablePutTakeEvent extends HandMultiEvent<TablePutEvent | TableTakeEvent> {}
// export type HandTimelineEvent = HandMultiCatchThrowEvent | HandMultiTablePutTakeEvent;
// // Make it so balls are unique in events field in HandMultiCatchThrow, and in HandMultiTakePut.

/**
 * Represents the timeline of a ball in the model.
 */
export class BallTimeline extends Timeline<number, BallTimelineEvent> {
    /**
     * Add an event in the timeline (at time event.time)
     * @param ev the event to add.
     */
    addEvent(ev: BallTimelineEvent): void {
        this.setElement(ev.time, ev);
    }

    /**
     * Create a string of the whole timeline in a human friendly fashion.
     * @returns a string.
     */
    stringify(): string {
        return super.stringify(
            (key) => `${key}s`,
            (elem) => elem.stringify()
        );
    }
}

/**
 * Represents the timeline of a hand in the model.
 */
export class HandTimeline extends Timeline<number, HandTimelineEvent> {
    prevEvent(time: number, strict = false): [number, HandTimelineEvent] | [null, null] {
        let lastEvent = super.prevEvent(time, strict);
        while (lastEvent[0] !== null && lastEvent[1].events.length === 0) {
            // Sanitize the event.
            this.eraseElementByKey(time);
            // Look for the previous event.
            lastEvent = super.prevEvent(lastEvent[0], strict);
        }
        return lastEvent;
    }

    nextEvent(time: number, strict = false): [number, HandTimelineEvent] | [null, null] {
        let nextEvent = super.nextEvent(time, strict);
        while (nextEvent[0] !== null && nextEvent[1].events.length === 0) {
            // Sanitize the event.
            this.eraseElementByKey(time);
            // Look for the previous event.
            nextEvent = super.nextEvent(nextEvent[0], strict);
        }
        return nextEvent;
    }

    /**
     * Add a single-event in the timeline (at time event.time).
     * If there were already events happening there, it handles them as
     * a multi-event.
     * @param singleEv the single-event to add.
     */
    addEvent(singleEv: HandTimelineSingleEvent): void {
        const it = this.find(singleEv.time);
        // Case 1: The multi-event doesn't exist, or exists but is empty.
        if (!it.isAccessible() || it.pointer[1].events.length === 0) {
            this.setElement(
                singleEv.time,
                new HandMultiEvent({
                    time: singleEv.time,
                    unitTime: singleEv.unitTime,
                    hand: singleEv.hand,
                    events: [singleEv]
                })
            );
        }
    }

    /**
     * Create a string of the whole timeline in a human friendly fashion.
     * @returns a string.
     */
    stringify(): string {
        return super.stringify(
            (key) => `${key}s`,
            (elem) => elem.stringify()
        );
    }
}
