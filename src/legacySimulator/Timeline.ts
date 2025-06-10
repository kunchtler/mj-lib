import { Ball } from "./Ball";
import { Hand } from "./Hand";
import { Table } from "./Table";
import { OrderedMap } from "js-sdsl";

//TODO : Add transition throw -> TablePut.

export class Timeline<KeyType, EventType> extends OrderedMap<KeyType, EventType> {
    //TODO : time redundant if in EventType ?
    //TODO : Remove time
    //TODO : Methods to create / modify / delete events without interacting with OrderedMap directly ?
    //TODO : Rename key to time ?
    // (and to not mess up modifying or fusing of events for instance)
    prevEvent(time: KeyType, strict = false): [KeyType, EventType] | [null, null] {
        const it = strict ? this.reverseUpperBound(time) : this.reverseLowerBound(time);
        //We make a copy of the contents of the list because the list itself
        //is a proxy otherwise (which has unexpected console.logs to watch out for)
        return it.isAccessible() ? [...it.pointer] : [null, null];
    }

    nextEvent(time: KeyType, strict = true): [KeyType, EventType] | [null, null] {
        const it = strict ? this.upperBound(time) : this.lowerBound(time);
        return it.isAccessible() ? [...it.pointer] : [null, null];
    }

    timeBounds(): [KeyType, KeyType] | [null, null] {
        const itBegin = this.begin();
        const itEnd = this.rBegin();
        if (!itBegin.isAccessible()) {
            // We can access the beginning if and only if we can access the end.
            return [null, null];
        }
        return [itBegin.pointer[0], itEnd.pointer[0]];
    }

    prettyPrint(
        stringifyKey?: (key: KeyType) => string,
        stringifyElem?: (elem: EventType) => string
    ): void {
        this.forEach(([time, event]) => {
            console.log(
                `${stringifyKey === undefined ? time : stringifyKey(time)} : \
                ${stringifyElem === undefined ? event : stringifyElem(event)}`
            );
        });
    }
}

export interface BaseEvent {
    time: number;
}

export interface EventSound {
    name: string | string[];
    loop?: boolean;
}

export interface BallEventInterface extends BaseEvent {
    ball: Ball;
    errorBallStatus: string;
    nextBallEvent(): [number, BallTimelineEvent] | [null, null];
    prevBallEvent(): [number, BallTimelineEvent] | [null, null];
    sound?: EventSound;
    // soundNameTillNextEvent?: string;
}

//TODO : Handle unit_time ?
//TODO : Remove time from BaseEvent and only rely on the one of the timeline ?
//TODO : Remove next_hand_event and prev_hand_event from Catch/Throw ? (instead only have hand)
export interface HandEventInterface extends BaseEvent {
    hand: Hand;
    unitTime: number;
    nextHandEvent(): [number, HandTimelineEvent] | [null, null];
    prevHandEvent(): [number, HandTimelineEvent] | [null, null];
    handMultiEvent(): HandTimelineEvent | null;
}

export class AbstractBallHandEvent implements BallEventInterface, HandEventInterface {
    private _ballRef: WeakRef<Ball>;
    private _handRef: WeakRef<Hand>;
    time: number;
    unitTime: number;
    readonly errorBallStatus: string = "unnamed attribute";
    sound?: EventSound;

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
        ball: Ball;
        hand: Hand;
    }) {
        this.time = time;
        this.unitTime = unitTime;
        this._ballRef = new WeakRef(ball);
        this._handRef = new WeakRef(hand);
        this.sound = typeof sound === "string" ? { name: sound } : sound;
    }

    get ball(): Ball {
        const obj = this._ballRef.deref();
        if (obj === undefined) {
            throw new Error("hand is undefined");
        }
        return obj;
    }

    set ball(new_ball: Ball) {
        this._ballRef = new WeakRef(new_ball);
    }

    get hand(): Hand {
        const obj = this._handRef.deref();
        if (obj === undefined) {
            throw new Error("hand is undefined");
        }
        return obj;
    }

    set hand(new_hand: Hand) {
        this._handRef = new WeakRef(new_hand);
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
}

//TODO : Move sound_name to AbstractBallEvent as we don't want hand to make sound.
export class AbstractHandEvent implements HandEventInterface {
    private _handRef: WeakRef<Hand>;
    time: number;
    unitTime: number;
    // private _cached_tree_iterator:

    constructor({ time, unitTime, hand }: { time: number; unitTime: number; hand: Hand }) {
        this.time = time;
        this._handRef = new WeakRef(hand);
        this.unitTime = unitTime;
    }

    get hand(): Hand {
        const obj = this._handRef.deref();
        if (obj === undefined) {
            throw new Error("hand is undefined");
        }
        return obj;
    }

    set hand(new_hand: Hand) {
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
}

export class AbstractTableEvent extends AbstractBallHandEvent {
    table: Table;

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
        ball: Ball;
        hand: Hand;
        table: Table;
        sound?: string | EventSound;
    }) {
        super({ time, unitTime, ball, hand, sound });
        this.table = table;
    }
}

export class ThrowEvent extends AbstractBallHandEvent {
    readonly errorBallStatus = "thrown";
}

export class CatchEvent extends AbstractBallHandEvent {
    readonly errorBallStatus = "caught";
}

export class TablePutEvent extends AbstractTableEvent {
    readonly errorBallStatus = "put on table";
}

export class TableTakeEvent extends AbstractTableEvent {
    readonly errorBallStatus = "taken from table";
}

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
        hand: Hand;
        events?: T[];
    }) {
        super({ time, unitTime, hand });
        this.events = events ?? [];
    }
}

//TODO : move ball error status to AbstractBallEvent only (not hand)
// export class HandMultiCatchThrowEvent extends HandMultiEvent<CatchEvent | ThrowEvent> {}
// export class HandMultiTablePutTakeEvent extends HandMultiEvent<TablePutEvent | TableTakeEvent> {}

// export type HandTimelineEvent = HandMultiCatchThrowEvent | HandMultiTablePutTakeEvent;
export type HandTimelineSingleEvent = CatchEvent | ThrowEvent | TableTakeEvent | TablePutEvent;
export type HandTimelineEvent = HandMultiEvent<HandTimelineSingleEvent>;
export type BallTimelineEvent = CatchEvent | ThrowEvent | TablePutEvent | TableTakeEvent;

//TODO : Make it so balls are unique in events field in HandMultiCatchThrow, and in HandMultiTakePut.

export class BallTimeline extends Timeline<number, BallTimelineEvent> {
    addEvent(ev: BallTimelineEvent) {
        this.setElement(ev.time, ev);
    }
}

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

    addEvent(ev: HandTimelineSingleEvent): void {
        const it = this.find(ev.time);
        // Case 1: The multi-event doesn't exist, or exists but is empty.
        if (!it.isAccessible() || it.pointer[1].events.length === 0) {
            this.setElement(
                ev.time,
                new HandMultiEvent({
                    time: ev.time,
                    unitTime: ev.unitTime,
                    hand: ev.hand,
                    events: [ev]
                })
            );
        }
    }
}

// type ValidHandEventPair = [null, null | ThrowEvent | TablePutEvent | TableTakeEvent] | [CatchEvent, null | ThrowEvent | TablePutEvent] | [ThrowEvent, CatchEvent | TablePutEvent] | [TablePutEvent, TableTakeEvent] | [TableTakeEvent, null | ThrowEvent | TablePutEvent];
// type ValidBallEventPair = [];

/*
if (prev_event === null) {
    if (next_event === null) {}
    if (next_event instanceof CatchEvent) {}
    if (next_event instanceof ThrowEvent) {}
    if (next_event instanceof TablePutEvent) {}
    if (next_event instanceof TableTakeEvent) {}
}
if (prev_event instanceof CatchEvent) {
    if (next_event === null) {}
    if (next_event instanceof CatchEvent) {}
    if (next_event instanceof ThrowEvent) {}
    if (next_event instanceof TablePutEvent) {}
    if (next_event instanceof TableTakeEvent) {}
}
if (prev_event instanceof ThrowEvent) {
    if (next_event === null) {}
    if (next_event instanceof CatchEvent) {}
    if (next_event instanceof ThrowEvent) {}
    if (next_event instanceof TablePutEvent) {}
    if (next_event instanceof TableTakeEvent) {}
}
if (prev_event instanceof TablePutEvent) {
    if (next_event === null) {}
    if (next_event instanceof CatchEvent) {}
    if (next_event instanceof ThrowEvent) {}
    if (next_event instanceof TablePutEvent) {}
    if (next_event instanceof TableTakeEvent) {}
}
if (prev_event instanceof TableTakeEvent) {
    if (next_event === null) {}
    if (next_event instanceof CatchEvent) {}
    if (next_event instanceof ThrowEvent) {}
    if (next_event instanceof TablePutEvent) {}
    if (next_event instanceof TableTakeEvent) {}
}
throw Error("Unimplemented behaviour");
*/

// class HandCustomMovementEvent {}
