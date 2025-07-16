import { Timeline } from "../utils/Timeline";
import Fraction from "fraction.js";
import { stringifyBall, stringifyHand } from "../utils/stringifyEvent";
import { FracTimedErrorLogger, Severity } from "../utils/TimedErrorLogger";
import { compareEvents } from "./ParserToScheduler";

/*
The time between two tosses / catches of the juggler is called its unit
siteswap time. The number of tosses / catches par a certain amount of time
is called a juggler's tempo, which is inversely proportional to its unit
time. This tempo may change over the course of a show.

Since we consider jugglers playing alongside a music, we don't directly
specify a juggler's tempo, but rather, based on the music sheet of a
performance, on how much time a unit time takes as beats (or note values).
We call this the unit value. For that, we use the same conventions as
music signature. For instance, a unit time of 3/8 implies that the unit
time takes 3 (the numerator) eighth notes (the denominator).

This means that at fixed unit time, if the tempo of the music changes,
the tempo of the juggler will also change. This makes sense as jugglers
will want to follow the music, and if it accelerates, they very well may
follow suit. If this is undesired, the unit value should be changed in
the juggling pattern's data.
*/

//TODO : Replace all [Fraction, event][] by this ?

export type FracSortedList<T> = [Fraction, T][];

//TODO : Rename or add namesapces.

export class FracTimeline<EventType> extends Timeline<Fraction, EventType> {
    static cmp = (x: Fraction, y: Fraction) => x.compare(y);
    constructor(container?: [Fraction, EventType][]) {
        super(container, FracTimeline.cmp);
    }
}

export interface Ball {
    name: string;
    id: string;
}

export interface PartialBall {
    name: string;
    id?: string;
}

export interface PartialToss {
    from: { juggler: string; hand?: "R" | "L"; beat: Fraction };
    to: {
        juggler: string;
        hand?: "R" | "L" | "x";
    };
    ball?: PartialBall;
    mode: PartialTossMode;
}

export type PartialTossMode = { type: "Beat"; beat: Fraction } | { type: "Height"; height: number };

export type Hands<ContentType> = [ContentType[], ContentType[]];
//TODO : Remove Balls and PartialBallsInHands and replace with Hands<...>.
export type BallsInHands = Hands<Ball>;
export type PartialBallsInHands = Hands<PartialBall>;

// TODO: Rename
export interface PartialToss2 {
    from: { juggler: string; rightHand: boolean; beat: Fraction };
    to: { juggler: string; hand?: "R" | "L" | "x"; beat: Fraction };
    ball: Ball;
    mode: PartialTossMode;
}

export interface SimulatorToss<BeatT> {
    from: { juggler: string; rightHand: boolean; beat: BeatT };
    to: { juggler: string; rightHand: boolean; beat: BeatT };
    ball: Ball;
    mode: PartialTossMode;
}

export type SchedulerHands = {
    /**
     * All balls that are specified as being put on a particular table spot.
     * It happens before taking new balls in hand, before making any toss.
     */
    putBall?: {
        /**
         * The name of the ball to put on the table.
         */
        name: string;
        /**
         * The spot to put the ball on. If undefined, the spot will be infered.
         */
        onSpot?: string;
        /**
         * If both hands have that ball, indicates which hand is concerned.
         */
        fromHand?: "left" | "right";
    }[];
    /**
     * The balls held in hands just after having (possibly) put balls on the table,
     * and just before tossing the balls.
     */
    newContents?: Hands<{
        /**
         * The held ball.
         */
        ball: string;
        /**
         * Whether the ball has been taken from a given spot on the table.
         */
        fromSpot?: string;
    }>;
};

export type SchedulerEvent = {
    tosses: PartialToss[];
    tempo: Fraction;
    handsSetup?: SchedulerHands;
    newDefaultHand: "L" | "R";
};

export type BallPut = {
    ball: Ball;
    to:
        | { type: "tableSpot"; spot?: string }
        | { type: "hand"; rightHand: boolean; position: number };
};

export type BallTake = {
    ball: Ball;
    from: { type: "tableSpot"; spot?: string } | { type: "hand" };
};

export type SimulatorHands = {
    old: Hands<BallPut>;
    new: Hands<BallTake>;
};

export type SimulatorEvent<BeatType> = {
    tosses: SimulatorToss<BeatType>[];
    tempo: Fraction;
    hands?: SimulatorHands;
};

//TODO : Create custom errors for Jugglers and scheduler.
export class SchedulerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SchedulerError";
    }
}

interface JugglerCache {
    state: JugglerState;
    nextEventIdx: number;
}

export interface SchedulerParams {
    /**
     * A map of all the jugglers.
     */
    jugglers: Map<
        string,
        {
            /**
             * All spots present on the table, and the name of the ball that it can contain.
             */
            tableSpots: Map<string, string>;
            /**
             * The set of all occupied spots on the table at the beginning of the
             * juggling performance.
             */
            occupiedSpotsAtStart: Set<string>;
            /**
             * A sorted list of all the juggling events.
             */
            events: FracSortedList<SchedulerEvent>;
        }
    >;
}

//TODO : exprugate "PartialBall".

export type SchedulerRes = Map<
    string,
    { events: FracSortedList<SimulatorEvent<Fraction>>; states: FracSortedList<JugglerState> }
>;
//TODO : Document that by default hands have LIFO structure.
//TODO : Make Generic version for the fun of it ?
//TODO : Rename partialEvents (clashes with JS events ?)
//TODO : Fail Gracefully
//TODO : Document that events param in constructor won't be copied and thus that it can be used to modify
// The search directly ? Or do proper method ?
//TODO : Fuse events before calling scheduler.
//TODO : Save Line / Col to pinpoint error ?
//TODO : Document what events must be (sorted, no duplicate, names ok, etc)
export class Scheduler {
    jugglers: Map<string, { manager: JugglerManager; cache: JugglerCache }>;

    constructor({ jugglers }: SchedulerParams) {
        this.jugglers = new Map();

        // Create an ID for each ball used in the performance,
        // and setup one JugglerManager per juggler.
        const ballsNb = new Map<string, number>();
        for (const [name, { occupiedSpotsAtStart, events, tableSpots }] of jugglers) {
            // Generate an ID per ball.
            const ballsOnTableAtStart = new Map<string, Ball | undefined>();
            for (const [spot, ballName] of tableSpots) {
                if (occupiedSpotsAtStart.has(spot)) {
                    if (!ballsNb.has(ballName)) {
                        ballsNb.set(ballName, 0);
                    }
                    const ballID = `${ballName}?${ballsNb.get(ballName)!}`;
                    ballsOnTableAtStart.set(spot, { name: ballName, id: ballID });
                } else {
                    ballsOnTableAtStart.set(spot, undefined);
                }
            }

            // Create a manager for each juggler.
            const manager = new JugglerManager(
                name,
                tableSpots,
                { namedSpot: ballsOnTableAtStart, unknown: new Set() },
                events
            );
            const cache = manager.generateInitialCache();
            this.jugglers.set(name, { manager: manager, cache: cache });
        }
    }

    //TODO : Handle errors.
    //TODO : Add arguments from / to ?
    //TODO : Add Return type.
    //TODO : State copy to not have problems ?
    // TODO : Change name.
    validatePattern(): SchedulerRes {
        // First reset the cache.
        for (const [, juggler] of this.jugglers) {
            juggler.cache = juggler.manager.generateInitialCache();
        }

        //TODO : Change name.
        const schedulerRes: SchedulerRes = new Map();
        for (const jugglerName of this.jugglers.keys()) {
            schedulerRes.set(jugglerName, { events: [], states: [] });
        }
        // Loop until we've seen all jugglers' events.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
            // Identify which jugglers have the closest next event.
            let closestNextEvent: Fraction | null = null;
            let nextEventJugglers: string[] = [];
            for (const [name, { manager, cache }] of this.jugglers) {
                if (!manager.hasReachedEnd(cache.nextEventIdx)) {
                    const beat = manager.getEventBeat(cache.nextEventIdx);
                    if (closestNextEvent === null || beat.lt(closestNextEvent)) {
                        closestNextEvent = beat;
                        nextEventJugglers = [name];
                    } else if (beat.equals(closestNextEvent)) {
                        nextEventJugglers.push(name);
                    }
                }
            }

            // Stop condition : all events have been seen.
            if (closestNextEvent === null) {
                break;
            }

            // For all jugglers having a close beat, gather the balls they toss.
            const tossedTo = new Map<string, PartialToss2[]>();
            for (const name of this.jugglers.keys()) {
                tossedTo.set(name, []);
            }
            for (const name of nextEventJugglers) {
                const { manager, cache } = this.jugglers.get(name)!;
                const res = manager.processEvent(cache.nextEventIdx, cache.state);
                cache.state = res.state;
                cache.nextEventIdx = res.nextEventIdx;
                for (const toss of res.tosses) {
                    tossedTo.get(name)!.push(toss);
                }
                schedulerRes
                    .get(name)!
                    .events.push([
                        closestNextEvent,
                        { tempo: res.tempo, tosses: [], hands: res.hands }
                    ]);
            }

            // Send the tossed ball to the corresponding jugglers.
            for (const [name, { manager, cache }] of this.jugglers) {
                const partialTosses = tossedTo.get(name)!;
                const res = manager.addTossesToState(partialTosses, cache.state);
                cache.state = res.state;
                // If the jugglers wee the ones tossing, add their state and info.
                if (nextEventJugglers.includes(name)) {
                    const simulatorEvents = schedulerRes.get(name)!.events;
                    simulatorEvents[simulatorEvents.length - 1][1].tosses = [...res.tosses];
                    schedulerRes.get(name)!.states.push([closestNextEvent, res.state]);
                }
            }
        }

        for (const { manager } of this.jugglers.values()) {
            manager.errorLogger.printErrorsInConsole();
        }
        return schedulerRes;
    }
}

/**
 * The state of a juggler at any given time.
 * TODO : include tempo ?
 */

export type JugglerStateAirborne = Map<
    string,
    {
        /**
         * Whether the ball will fall in the right or left hand.
         */
        toRightHand: boolean;
        /**
         * The ball that is to be caught.
         */
        ball: Ball;
        /**
         * The time when then ball will be caught.
         */
        catchBeat: Fraction;
        /**
         * The time the ball was thrown.
         */
        throwBeat: Fraction;
    }
>;

export type JugglerState = {
    /**
     * A map of all the balls in the air that are to be caught by this juggler. The keys are the balls IDs.
     */
    airborne: JugglerStateAirborne;
    /**
     * An array of two arrays, listing all balls in the left hand and all balls in the right hand.
     * For each of those arrays, the element in position 0 is the oldest ball and the element in the last position is the newest.
     */
    held: BallsInHands;
    /**
     * The table and the balls that are on it.
     */
    onTable: {
        /**
         * A map of all spots on the table, and whether they contain a ball or not.
         */
        namedSpot: Map<string, Ball | undefined>;
        /**
         * A set of all the balls that are not on a named spot.
         */
        unknown: Set<Ball>;
    };
};

/**
 * Clones the state by reusing as much memory as possible. For instance, balls aren't cloned, as they won't be changed, but maps are.
 * @param state the state to clone.
 * @returns the clone.
 */
function cloneState(state: JugglerState): JugglerState {
    return {
        airborne: new Map(state.airborne),
        held: [[...state.held[0]], [...state.held[1]]],
        onTable: {
            namedSpot: new Map(state.onTable.namedSpot),
            unknown: new Set(state.onTable.unknown)
        }
    };
}

export function isInRhythm(beat: Fraction, startBeat: Fraction, tempo: Fraction): boolean {
    return beat.sub(startBeat).divisible(tempo);
}

/**
 * Performs a XOR on two boolean values.
 * @param a a boolean.
 * @param b a boolean.
 * @returns a XOR b
 */
export function XOR(a: boolean, b: boolean): boolean {
    return a !== b;
}

/**
 * Pops a given index from the list.
 * @param list the list.
 * @param index the index to remove.
 * @returns the value of the returned element if the index was in the list's bounds, undefined otherwise.
 */
export function popOneIndexFromList<T>(list: T[], index: number): T | undefined {
    const spliced = list.splice(index, 1);
    return spliced.length === 0 ? undefined : spliced[0];
}

/**
 * Checks whether an array has only non-undefined elements, which typescript will know about.
 * @param array the array to check.
 * @returns whether the array has no undefined values or not.
 */
export function hasNoUndefined<T>(array: (T | undefined)[]): array is T[] {
    for (const elem of array) {
        if (elem === undefined) {
            return false;
        }
    }
    return true;
}

/**
 * Find the key that was inserted last in a map.
 * @param map the map in question.
 * @returns undefined if the map is empty, otherwise the lastly inserted element in the form [key, value].
 */
export function getLastInsertedInMap<KeyType, ValueType>(
    map: Map<KeyType, ValueType>
): [KeyType, ValueType] | undefined {
    // We use the fact that maps in JS preserve insertion order.
    let element: [KeyType, ValueType] | undefined = undefined;
    for (element of map);
    return element;
}

//TODO : Fuse "beat" with BeatInfo / State ? to avoid events[0][0/1] ? YES URGENT ?
//TODO : Comment properties use.
//TODO : Clean interfaces
//TODO : For juggling, names Signature / Tempo ?
//TODO : Check that works if events is empty.
//TODO : Rename "Events" => "Event" NO, CLASH WITH JS, BETTER NAME.
//TODO : Rename 'Tempo' => "unit value"
//TODO : Rename 'beats' => "states" ?
//TODO : Array instead of timeline at some points ?
//TODO : ErrorLogger !
//TODO : Instead of having error text clutter code and its comprehension, make special error classes that will format that given message.
/**
 *
 * In order to be a bit more efficient, most functions can be supplied with an event index. TODO : Explain better.
 *
 */
class JugglerManager {
    name: string;
    events: FracSortedList<SchedulerEvent>;
    errorLogger: FracTimedErrorLogger;
    tableSpots: Map<string, string>;
    ballsOnTableAtStart: { namedSpot: Map<string, Ball | undefined>; unknown: Set<Ball> };
    // catches: FracSortedList<SimulatorToss>;
    // beats: FracSortedList<JugglerState>;
    // private _currentTempo: Fraction;
    // private _currentBeatIdx: number;
    // private _currentBeat: Fraction;
    // private _nextEventIdx: number;
    // private _hasProcessedFirstBeat = false;

    //TODO : Document that currentbeat : state does not exist yet. But info on tempo and usehand might ! Misleading name ?
    //TODO : When only siteswap height 3 was given, should we deafult to:
    // - 3 beats (even if the tempo then gets shorter ?)
    // - 3 * current unit value (possibly falling outside of rhythm)
    // FIRST ANSWER, reason : to keep the symbolic of the height (hand changing etc)
    //+ Easier to understand in practice (number of actions done before catching it).
    //TODO: Reorder constructor code.
    constructor(
        name: string,
        tableSpots: Map<string, string>,
        ballsOnTableAtStart: { namedSpot: Map<string, Ball | undefined>; unknown: Set<Ball> },
        events: FracSortedList<SchedulerEvent>
    ) {
        this.name = name;
        this.events = events;
        this.errorLogger = new FracTimedErrorLogger();
        this.tableSpots = tableSpots;
        this.ballsOnTableAtStart = ballsOnTableAtStart;
    }

    generateIntialState(): JugglerState {
        return {
            airborne: new Map(),
            held: [[], []],
            onTable: this.ballsOnTableAtStart
        };
    }

    generateInitialCache(): JugglerCache {
        return { state: this.generateIntialState(), nextEventIdx: 0 };
    }

    //TODO : TempoChange Offset !!!
    // hasEventsLeftAfterBeat(beat: Fraction) {
    //     return beat.lt(this.events[this.events.length - 1][0]);
    // }

    //TODO : Opt by having the scheduler handle some of that ?
    getEventBeat(eventIdx: number): Fraction {
        return this.events[eventIdx][0];
    }

    /**
     *
     * @param eventIdx
     * @returns
     */
    hasReachedEnd(eventIdx: number): boolean {
        return eventIdx >= this.events.length;
    }

    // requiresProcessing(): boolean {
    //     // The end has been reached if we no longer have events to process, nor
    //     // do we have balls in the air that need falling.
    //     return this.nextBeatToProcess() !== null;
    // }

    logError(beat: Fraction, severity: Severity, message: string): void {
        this.errorLogger.logError({
            time: beat,
            severity: severity,
            message: `Juggler ${this.name}:\n\t${message}`
        });
    }

    //TODO : consistant evBeat / eventBeat ?
    //TODO : Document that works with prevEventIdx after targetBeat in special case ?
    //TODO : Possibly needs to recompute the prevEventIdx.
    //TODO : Really need to know about the next event ? Or just the previous rather ?
    //TODO : Remake functions to possibly take prevEventIdx argument.
    correctOffbeatBeat(
        targetBeat: Fraction,
        prevEventIdx: number
    ): { beat: Fraction; prevEventIdx: number } {
        const [eventBeat, { tempo }] = this.events[prevEventIdx];
        const nbSteps = targetBeat.sub(eventBeat).div(tempo).ceil();
        const newBeat = eventBeat.add(tempo.mul(nbSteps));
        let newPrevEventIdx = prevEventIdx;
        if (
            prevEventIdx + 1 < this.events.length &&
            this.events[prevEventIdx + 1][0].lte(newBeat)
        ) {
            newPrevEventIdx++;
        }
        return { beat: newBeat, prevEventIdx: newPrevEventIdx };
    }

    getPreviousEventIdx(beat: Fraction): number {
        if (beat.lte(this.events[0][0])) {
            return 0;
        } else if (beat.gte(this.events[this.events.length - 1][0])) {
            return this.events.length - 1;
        }
        // Thanks to previous checks, the findIndex method won't return -1.
        // TODO : Faster bin search version ?
        return this.events.findIndex(([evBeat]) => evBeat.gt(beat)) - 1;
    }

    //TODO : Check beat is on rhythm ? When should that be done ?
    //TODO : Check all functions when beat received before first event. Here, this function is called when tossing ball, so No Problemo :D
    //TODO : MAKE SURE TEMPO CHANGES HAPPEN ON BEATS ?! WITH OFFSET ? HOW TO HANDLE ?
    //TODO : Document functions with prevEvent, startBeat etc. Limit side effects. If side effects, document them.
    getCatchBeatFromHeight(height: number, startBeat: Fraction, prevEventIdx: number): Fraction {
        let beat = startBeat;
        let eventIdx = prevEventIdx;
        for (let i = 0; i < height; i++) {
            if (eventIdx + 1 < this.events.length) {
                if (beat.equals(this.events[eventIdx + 1][0])) {
                    eventIdx++;
                } else if (beat.gt(this.events[eventIdx + 1][0])) {
                    // This happens when events are not on rhythm.
                    beat = this.events[eventIdx + 1][0];
                    eventIdx++;
                    // throw new Error("Shouldn't happen (sanity check).");
                }
            }
            const tempo = this.events[eventIdx][1].tempo;
            beat = beat.add(tempo);
        }
        return beat;
    }

    //TODO2
    //TODO : This method and above, check for sanity that we look into future.
    //TODO Factorize loop's content which are the same in both cases ?
    //Would allow for error handling when somehting is wrong ?
    //TODO : When to check if beats on rhythm ?
    //TODO : Remove the fact that prevEventIdx is optional ?
    // getHeightFromBeats(startBeat: Fraction, endBeat: Fraction, prevEventIdx?: number): number {
    //     if (prevEventIdx === undefined) {
    //         prevEventIdx = this.getPreviousEventIdx(startBeat);
    //     }
    //     let nbSteps = 0;
    //     const itEvents = this._itEvents.copy();
    //     let currentTempo = this._currentTempo.clone();
    //     let currentBeat = this._currentBeat.clone();
    //     while (currentBeat.lt(beat)) {
    //         if (itEvents.isAccessible() && itEvents.pointer[0] === currentBeat) {
    //             if (itEvents.pointer[1].tempoChange !== undefined) {
    //                 currentTempo = itEvents.pointer[1].tempoChange;
    //             }
    //             itEvents.next();
    //         }
    //         currentBeat = currentBeat.add(currentTempo);
    //         nbSteps++;
    //     }
    //     // We need to check if the ball will fall on a beat.
    //     return {
    //         failed: !currentBeat.equals(beat),
    //         nbSteps: nbSteps,
    //         endBeat: currentBeat
    //     };
    // }

    //TODO : Make all this failing functions return failure in Object instead of raw ?
    // Assumption : we only use this function from the overall state manager
    // that will handle in-between juggler throws. Thus we can advance in beats
    // and the only balls we will receive will be at the latest beat which
    // happens to be currentState.

    //TODO : In all methods, make sure we know that EVENTS OCCUR ON TEMPO !!!
    //TODO : We don't really descend the balls but we check if they are caught.
    //TODO : Instead of modifying current state... why not return a new one ?
    //TODO : Warn of multiple balls falling at the same time when they are relaunched only.
    //since that is when there is an ambiguity on which one to throw first.
    //If ball was specified, fail gracefully ?
    //TODO : Should the currentBeat have been updated yet or not (currently it is).
    //TODO : Balls not ending on beat have been handled already before adding them to airborne.
    //TODO : Handle event change.
    //TODO : Change param name ?
    //TODO : private or protected functions with side effects that are order dependent.
    //TODO : pass jugglerstate as argument to avoid side effect / dependency on private fields. (have more information to deduce prevEventIdx ?).
    //TODO : Before calling, compute right prevEventIdx
    //TODO : Be carfeul : Catch hand is determined at throw time if thrown to self only ?
    //TODO : Handle hand target that is x !!!
    descendAirborneBalls(toBeat: Fraction, state: JugglerState): JugglerState {
        // Identify caught balls by hand and by catch time.
        state = cloneState(state);
        const handCatches: [
            [Fraction, { ball: Ball; catchBeat: Fraction; throwBeat: Fraction }[]][],
            [Fraction, { ball: Ball; catchBeat: Fraction; throwBeat: Fraction }[]][]
        ] = [[], []];
        for (const { catchBeat, throwBeat, toRightHand, ball } of state.airborne.values()) {
            if (catchBeat.lte(toBeat)) {
                const catches = handCatches[toRightHand ? 1 : 0];
                const foundIdx = catches.findIndex((value) => value[0].equals(catchBeat));
                if (foundIdx === -1) {
                    const caught: [
                        Fraction,
                        { ball: Ball; catchBeat: Fraction; throwBeat: Fraction }[]
                    ] = [catchBeat, [{ ball: ball, catchBeat: catchBeat, throwBeat: throwBeat }]];
                    catches.push(caught);
                } else {
                    catches[foundIdx][1].push({
                        ball: ball,
                        catchBeat: catchBeat,
                        throwBeat: throwBeat
                    });
                }
            }
        }

        // Add the balls in the order they've fallen.
        for (let i = 0; i < 2; i++) {
            handCatches[i].sort(compareEvents);
            for (const [catchBeat, balls] of handCatches[i]) {
                // If two balls are caught at the same time in the same hand,
                // we can't know how to arrange them in the hand.
                if (balls.length > 1) {
                    let ballsText = "";
                    for (const { ball, throwBeat } of balls) {
                        ballsText += `${stringifyBall(ball)} (throw at beat ${throwBeat.toString()}), `;
                    }
                    this.logError(
                        catchBeat,
                        "Warn",
                        `${balls.length} balls were caught at the same time in the ${i === 0 ? "left" : "right"} hand: ${ballsText}.\nProceeding, but there may be an ambiguity and randomness on future throws.`
                    );
                }
                for (const { ball } of balls) {
                    state.airborne.delete(ball.id);
                    state.held[i].push(ball);
                }
            }
        }
        return state;
    }

    defaultCatchWithRightHand(beat: Fraction, eventIdx: number): boolean {
        const [eventBeat, { tempo, newDefaultHand }] = this.events[eventIdx];
        const nbSteps = beat.sub(eventBeat).div(tempo);
        if (!nbSteps.divisible(1)) {
            throw Error("Souldn't happen (sanity check).");
        }
        return !XOR(nbSteps.divisible(2), newDefaultHand === "R");
    }

    // TODO : When to copy states ? In loop yes, except the last one, which is before the
    // next time the loop is executed.
    // TODO : Error messages formatted with measures ?
    // TODO : Tosses instead of throws in entire codebase.
    // TODO : Unify this toss format (to / from) with earlier ones to reuse printing function.
    // TODO: No Ball removal in this function...
    tossBalls(
        tosses: PartialToss[],
        state: JugglerState,
        beat: Fraction,
        eventIdx: number
    ): { tosses: PartialToss2[]; state: JugglerState } {
        state = cloneState(state);
        const defaultCatchWithRightHand = this.defaultCatchWithRightHand(beat, eventIdx);
        const newTosses: PartialToss2[] = [];
        for (const toss of tosses) {
            // Compute the throwing hand.
            let fromRightHand: boolean;
            if (toss.from.hand !== undefined) {
                fromRightHand = toss.from.hand === "R";
            } else {
                fromRightHand = defaultCatchWithRightHand;
            }
            const tossHand = state.held[fromRightHand ? 1 : 0];

            // Compute the ball thrown.
            let ball: Ball;
            if (toss.ball === undefined) {
                if (tossHand.length === 0) {
                    this.logError(
                        beat,
                        "Error",
                        `Can't toss ball from the ${fromRightHand ? "right" : "left"} hand as there are no balls.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinues without tossing a ball.`
                    );
                    continue;
                }
                ball = tossHand.pop()!;
            } else if (toss.ball.id !== undefined) {
                const ballIdx = tossHand.findIndex((ball) => ball.id === toss.ball!.id);
                if (ballIdx === -1) {
                    this.logError(
                        beat,
                        "Error",
                        `Can't toss ball ${stringifyBall(toss.ball)} from the ${fromRightHand ? "right" : "left"} hand as it is not there.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinues without tossing a ball.`
                    );
                    continue;
                }
                // Remove the ball from tossHand and store it.
                ball = tossHand.splice(ballIdx, 1)[0];
            } else {
                // We look for the ball with the right name
                const matches: Ball[] = [];
                for (const ball of tossHand) {
                    if (ball.name === toss.ball.name) {
                        matches.push(ball);
                    }
                }
                if (matches.length === 0) {
                    this.logError(
                        beat,
                        "Error",
                        `Can't toss ball ${stringifyBall(toss.ball)} from the ${fromRightHand ? "right" : "left"} hand as it is not there.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinues without tossing a ball.`
                    );
                    continue;
                } else if (matches.length > 1) {
                    this.logError(
                        beat,
                        "Warn",
                        `Multiple balls ${stringifyBall(toss.ball)} can be thrown from the ${fromRightHand ? "right" : "left"}. This ambiguity may have consequences later.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nProceeds by choosing ball ${stringifyBall(matches[matches.length - 1])}.`
                    );
                }
                ball = matches[matches.length - 1];
            }

            // Compute the catching beat
            let toBeat: Fraction;
            //TODO : THINK ABOUT THIS !!! Makes sense for beat ??? TODO LATER Nicolas ?
            let toHand: "L" | "R" | "x" | undefined = toss.to.hand;
            if (toss.mode.type === "Height") {
                toBeat = this.getCatchBeatFromHeight(toss.mode.height, beat, eventIdx);
                if (
                    (toHand === undefined || toHand === "x") &&
                    toss.to.juggler === toss.from.juggler
                ) {
                    let toRightHand = !XOR(toss.mode.height % 2 === 0, fromRightHand);
                    toRightHand = XOR(toRightHand, toHand === "x");
                    toHand = toRightHand ? "R" : "L";
                }
            } else {
                toBeat = toss.mode.beat;
            }

            // Complete the toss info.
            newTosses.push({
                from: {
                    beat: toss.from.beat,
                    juggler: toss.from.juggler,
                    rightHand: fromRightHand
                },
                to: { beat: toBeat, juggler: toss.to.juggler, hand: toHand },
                ball: ball,
                mode: toss.mode
            });
        }
        return { tosses: newTosses, state: state };
    }

    // TODO : document that state is not copied ?
    // TODO : Lefthand / Righthand : make Array. It is simpler to manipulate.
    // and document the convention that left cell = left, right cell = right.
    // TODO : Unify some of the behaviour here with tossBalls ?

    swapBalls(
        beat: Fraction,
        state: JugglerState,
        handsSetup: SchedulerHands
    ): { state: JugglerState; handsSimulatorInfo: SimulatorHands } {
        /**
         * Find all unoccupied spots on the table.
         * @param spots a map of spots, where :
         * - the key is the spot's name.
         * - the value is either :
         *     - a ball if there is a ball in that spot.
         *     - undefined if there is nothing in that spot.
         * @returns an array of all spot names that have no ball, in the order they were defined in.
         */
        function findFreeTableSpots(spots: Map<string, Ball | undefined>): string[] {
            // We use the fact that maps and sets iterate over their elements
            // in the order they were added.
            const freeTableSpots: string[] = [];
            for (const [spot, ball] of spots) {
                if (ball === undefined) {
                    freeTableSpots.push(spot);
                }
            }
            return freeTableSpots;
        }
        //TODO : uniformize names.
        function reconstructState(
            spotsBySound: Map<
                string,
                { tableSpots: { named: Map<string, Ball | undefined>; unnamed: Ball[] } }
            >,
            tableSpots: Map<string, string>,
            handsSetupNew: Hands<BallTake>,
            state: JugglerState
        ): JugglerState {
            state = cloneState(state);

            // 1. Reconstruct the table.
            const table = {
                namedSpot: new Map<string, Ball | undefined>(),
                unknown: new Set<Ball>()
            };
            // Add balls from named spots.
            // We iterate through tableSpots to reclaim the disposition order from the table.
            for (const [spot, ballName] of tableSpots) {
                const ball = spotsBySound.get(ballName)?.tableSpots.named.get(spot);
                table.namedSpot.set(spot, ball);
            }
            // Add balls from unnamed spots.
            for (const { tableSpots: spotsBallType } of spotsBySound.values()) {
                for (const ball of spotsBallType.unnamed) {
                    table.unknown.add(ball);
                }
            }

            // 2. Reconstruct the hands.
            const hands: Hands<Ball> = [[], []];
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                for (const { ball } of handsSetupNew[handIdx]) {
                    hands[handIdx].push(ball);
                }
            }

            state.onTable = table;
            state.held = hands;

            return state;
        }

        // TODO : Better error messages. Indicate state ?
        // TODO : Isn't the position field reversed ?
        // TODO : Take into consideration we may want to put multiple balls of the same name on different spots.

        // Create the variables used in the returned value.
        // "undefined" means the ball's information has yet to be computed.
        // Oh, so this is why you should use null. a.pop() will return undefined either if a was empty, or if a had "undefined" as its last element.
        const handsSetupOld: Hands<BallPut | undefined> = [
            Array<BallPut | undefined>(state.held[0].length),
            Array<BallPut | undefined>(state.held[1].length)
        ];

        const ballsLocationBySound = new Map<
            string,
            {
                tableSpots: { named: Map<string, Ball | undefined>; unnamed: Ball[] };
                oldHands: Hands<{ ballIdx: number; ball: Ball }>;
                newHands: Hands<number>;
            }
        >();

        // Fill in hands map.
        for (let handIdx = 0; handIdx < 2; handIdx++) {
            for (let ballIdx = 0; ballIdx < state.held[handIdx].length; ballIdx++) {
                const ball = state.held[handIdx][ballIdx];
                if (!ballsLocationBySound.has(ball.name)) {
                    ballsLocationBySound.set(ball.name, {
                        tableSpots: { named: new Map(), unnamed: [] },
                        oldHands: [[], []],
                        newHands: [[], []]
                    });
                }
                ballsLocationBySound.get(ball.name)!.oldHands[handIdx].push({ ballIdx, ball });
            }
        }
        // Fill in table map with named spots.
        for (const [spotName, ball] of state.onTable.namedSpot) {
            const spotSound = this.tableSpots.get(spotName)!;
            if (!ballsLocationBySound.has(spotSound)) {
                ballsLocationBySound.set(spotSound, {
                    tableSpots: { named: new Map(), unnamed: [] },
                    oldHands: [[], []],
                    newHands: [[], []]
                });
            }
            const namedSpots = ballsLocationBySound.get(spotSound)!.tableSpots.named;
            namedSpots.set(spotName, ball);
        }
        // Fill in table map with unnamed spots.
        for (const ball of state.onTable.unknown) {
            if (!ballsLocationBySound.has(ball.name)) {
                ballsLocationBySound.set(ball.name, {
                    tableSpots: { named: new Map(), unnamed: [] },
                    oldHands: [[], []],
                    newHands: [[], []]
                });
            }
            const unnamedSpots = ballsLocationBySound.get(ball.name)!.tableSpots.unnamed;
            unnamedSpots.push(ball);
        }
        // Add possible missing keys with ball sounds from handsSetup.
        if (handsSetup.putBall !== undefined) {
            for (const putBall of handsSetup.putBall) {
                if (!ballsLocationBySound.has(putBall.name)) {
                    ballsLocationBySound.set(putBall.name, {
                        tableSpots: { named: new Map(), unnamed: [] },
                        oldHands: [[], []],
                        newHands: [[], []]
                    });
                }
            }
        }
        if (handsSetup.newContents !== undefined) {
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                for (const { ball: ballName } of handsSetup.newContents[handIdx]) {
                    if (!ballsLocationBySound.has(ballName)) {
                        ballsLocationBySound.set(ballName, {
                            tableSpots: { named: new Map(), unnamed: [] },
                            oldHands: [[], []],
                            newHands: [[], []]
                        });
                    }
                }
            }
        }

        // 1. Put all balls on the table that have a user defined location.
        if (handsSetup.putBall !== undefined) {
            for (const putBall of handsSetup.putBall) {
                const { oldHands: matchingBallsInHands, tableSpots: matchingBallsInSpots } =
                    ballsLocationBySound.get(putBall.name)!;

                // Choose which ball should be put on the table : First compute the hand
                let chosenHandIdx: number;
                if (putBall.fromHand !== undefined) {
                    chosenHandIdx = putBall.fromHand === "left" ? 0 : 1;
                } else if (
                    matchingBallsInHands[0].length === 0 &&
                    matchingBallsInHands[1].length === 0
                ) {
                    // If no hand holds the requested ball, we error that situation.
                    this.logError(
                        beat,
                        "Warn",
                        `Can't put a ball ${putBall.name} onto the table ${putBall.onSpot === undefined ? "" : `on spot ${putBall.onSpot} `}as none is found in hands.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinue without putting that ball.`
                    );
                    continue;
                } else if (
                    matchingBallsInHands[0].length > 0 &&
                    matchingBallsInHands[1].length > 0
                ) {
                    // If the ball has been found in both hands, we arbitrarily take the left hand.
                    chosenHandIdx = 0;
                    this.logError(
                        beat,
                        "Warn",
                        `Ambiguity while putting ball ${putBall.name} onto the table ${putBall.onSpot === undefined ? "" : `on spot ${putBall.onSpot} `}as it is found in both hands.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinue by choosing the left hand.`
                    );
                } else {
                    // The ball has only been found in one hand, so we pick it.
                    chosenHandIdx = matchingBallsInHands[0].length > 0 ? 0 : 1;
                }

                // Choose which ball should be put on the table : Now compute the ball.
                if (matchingBallsInHands[chosenHandIdx].length === 0) {
                    // If the hand does not have the requested ball, issue warning and carry on.
                    this.logError(
                        beat,
                        "Warn",
                        `Can't put a ball ${putBall.name} onto the table ${putBall.onSpot === undefined ? "" : `on spot ${putBall.onSpot} `}${putBall.fromHand === undefined ? "" : `from the ${putBall.fromHand} hand `}as none is held.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinue without putting that ball.`
                    );
                    continue;
                }

                const { ball: chosenBall, ballIdx: chosenBallIdx } =
                    matchingBallsInHands[chosenHandIdx][matchingBallsInHands.length - 1];
                if (matchingBallsInHands[chosenHandIdx].length > 1) {
                    // If the hand has multiple balls to choose from, arbitrarily take the most recent one and issue a warning.
                    this.logError(
                        beat,
                        "Warn",
                        `Ambiguity while putting ball ${putBall.name} onto the table ${putBall.onSpot === undefined ? "" : `on spot ${putBall.onSpot} `}${putBall.fromHand === undefined ? "" : `from the ${putBall.fromHand} hand `}as it is found multiple times.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinue by putting the most recently received ball, ie ${stringifyBall(chosenBall)}.`
                    );
                }

                // Find the free unoccupied requested ball spot on the table.
                const freeTableSpots = findFreeTableSpots(matchingBallsInSpots.named);

                // Compute the spot on which to put the ball.
                let spotName: string | undefined;

                if (freeTableSpots.length === 0) {
                    // If all spots the ball could be put on are occupied, put the ball in the unkown table spot.
                    spotName = undefined;
                    this.logError(
                        beat,
                        "Error",
                        `All spots where ball ${stringifyBall(chosenBall)} could go are occupied. ${putBall.onSpot === undefined ? "" : `Can't put in on user-defined "${putBall.onSpot}" spot. `}\nContinue by putting ball anywhere on the table.`
                    );
                } else if (putBall.onSpot !== undefined) {
                    // TODO : make it null rather to clearly separate : It will be found as the spot names should already have been verified.
                    const ballOnSpot = matchingBallsInSpots.named.get(putBall.onSpot);
                    if (ballOnSpot !== undefined) {
                        // The spot has been specified by the user, but it is already occupied on the table.
                        // Take the first available spot instead.
                        spotName = freeTableSpots[0];
                        this.logError(
                            beat,
                            "Error",
                            `Can't put ball ${stringifyBall(chosenBall)} on user-defined "${putBall.onSpot}" spot as it is already occupied by ball ${stringifyBall(ballOnSpot)}.\nContinue by putting it on spot "${spotName}".`
                        );
                    } else {
                        // The spot has been specified by the user, and it is available.
                        spotName = putBall.onSpot;
                    }
                } else {
                    // No spot has been specified by the user, so take the first free available spot.
                    spotName = freeTableSpots[0];
                }

                // Put the ball on the table : Remove it from the hands.
                popOneIndexFromList(matchingBallsInHands[chosenHandIdx], chosenBallIdx);
                // Put the ball on the table : Add it to the table.
                if (spotName === undefined) {
                    matchingBallsInSpots.unnamed.push(chosenBall);
                } else {
                    matchingBallsInSpots.named.set(spotName, chosenBall);
                }

                // Modify the returned value to indicate this choice (and that this ball has been
                // already handled.
                handsSetupOld[chosenHandIdx][chosenBallIdx] = {
                    ball: chosenBall,
                    to: { type: "tableSpot", spot: spotName }
                };
            }
        }

        // 2. If no new hands are specified, we stop there.
        if (handsSetup.newContents === undefined) {
            // Prepare the return values.
            const handsSetupOld2: Hands<BallPut> = [[], []];
            const handsSetupNew2: Hands<BallTake> = [[], []];
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                for (let ballIdx = 0; ballIdx < handsSetupOld[handIdx].length; ballIdx++) {
                    const info = handsSetupOld[handIdx][ballIdx];
                    if (info === undefined) {
                        // The ball hasn't bee handled yet, so it should remain in hand
                        const ball = state.held[handIdx][ballIdx];
                        handsSetupNew2[handIdx].push({ ball, from: { type: "hand" } });
                        handsSetupOld2[handIdx].push({
                            ball,
                            to: {
                                type: "hand",
                                rightHand: handIdx === 1,
                                position: handsSetupNew2.length - 1
                            }
                        });
                    } else {
                        handsSetupOld2[handIdx].push(info);
                    }
                }
            }
            state = reconstructState(ballsLocationBySound, this.tableSpots, handsSetupNew2, state);
            return { state: state, handsSimulatorInfo: { old: handsSetupOld2, new: handsSetupNew2 } };
        }

        // 3. For all balls in the new hands, identify where they come from
        // ie in order of priority :
        // - from the table if they have a user defined "take from" spot.
        // - from the same hand if there was one.
        // - from the other hand if there was one.
        // - from the table.

        // Create new hands variable to help build the return value.
        // "undefined" means the exact ball hasn't been computed.
        const handsSetupNew: Hands<BallTake | undefined> = [
            Array<BallTake | undefined>(state.held[0].length).fill(undefined),
            Array<BallTake | undefined>(state.held[1].length).fill(undefined)
        ];

        for (const [
            ballName,
            { oldHands: ballsInOldHands, newHands: ballsInNewHands, tableSpots: ballsOnTableSpots }
        ] of ballsLocationBySound) {
            // 4. For each hand, simulate the number of balls that will remain there, that will swap hands,
            // and that will be put on the table in user-sepcific spots or not.
            // We stop that simulation when we managed to maximize the number of user-specific take from balls in that
            // configuration.
            // We don't check yet that there are enough balls overall for us to take them all.
            const freeTableSpotsBefore = findFreeTableSpots(ballsOnTableSpots.named);

            // This variables indicates what ball can successfully take from a user-defined.
            let ballsWithTakeFrom: [Map<number, string>, Map<number, string>] = [
                new Map(),
                new Map()
            ];
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                for (
                    let ballIdx = handsSetup.newContents[handIdx].length;
                    ballIdx >= 0;
                    ballIdx--
                ) {
                    const spot = handsSetup.newContents[handIdx][ballIdx].fromSpot;
                    if (spot !== undefined) {
                        ballsWithTakeFrom[handIdx].set(ballIdx, spot);
                    }
                }
            }

            let nbBallsFromSameHand: [number, number];
            let nbBallsFromOtherHand: [number, number];
            while (true) {
                // A.  Compute the number of balls that remain in hand, change hand, be on the table
                // (on a user specific spot and not).

                //  A.I Compute the number of balls that will remain in the same hand.
                // The number of balls that still need attribution in each hand.
                let nbBallsNeeded: [number, number] = [
                    ballsInNewHands[0].length - ballsWithTakeFrom[0].size,
                    ballsInNewHands[1].length - ballsWithTakeFrom[1].size
                ];
                // The number of balls that each old hand have that haven't been attributed.
                let nbBallsAvailable: [number, number] = [
                    ballsInOldHands[0].length,
                    ballsInOldHands[1].length
                ];

                nbBallsFromSameHand = [
                    Math.min(nbBallsNeeded[0], nbBallsAvailable[0]),
                    Math.min(nbBallsNeeded[1], nbBallsAvailable[1])
                ];

                //  A.II Compute the number of balls that will switch hands.
                nbBallsNeeded = [
                    nbBallsNeeded[0] - nbBallsFromSameHand[0],
                    nbBallsNeeded[1] - nbBallsFromSameHand[1]
                ];
                nbBallsAvailable = [
                    nbBallsAvailable[0] - nbBallsFromSameHand[0],
                    nbBallsAvailable[1] - nbBallsFromSameHand[1]
                ];

                nbBallsFromOtherHand = [
                    Math.min(nbBallsNeeded[0], nbBallsAvailable[1]),
                    Math.min(nbBallsNeeded[1], nbBallsAvailable[0])
                ];

                //  A.III Compute the number of balls that will be taken from the table.
                nbBallsNeeded = [
                    nbBallsNeeded[0] - nbBallsFromOtherHand[0],
                    nbBallsNeeded[1] - nbBallsFromOtherHand[1]
                ];
                nbBallsAvailable = [
                    nbBallsAvailable[0] - nbBallsFromOtherHand[1],
                    nbBallsAvailable[1] - nbBallsFromOtherHand[0]
                ];

                // nbBallsFromTableWithoutTakeFrom = [nbBallsNeeded[0], nbBallsNeeded[1]];
                // const nbBallsFromTableWithTakeFrom = [ballsWithTakeFrom[0].length, ballsWithTakeFrom[1].length]
                // const nbBallsFromTable = [nbBallsFromTableWithTakeFrom[0] + nbBallsFromTableWithoutTakeFrom[0], nbBallsFromTableWithTakeFrom[1] + nbBallsFromTableWithoutTakeFrom[1]]

                // B. In the old hand, each ball that isn't kept or goes to the other hand goes on tha table.
                // Simulate how the tables spots fill.
                const nbBallsPutOnTable = nbBallsAvailable;
                const freeTableSpotsAfter = new Set(
                    freeTableSpotsBefore.slice(0, nbBallsPutOnTable[0] + nbBallsPutOnTable[1])
                );

                // C. In the new hand, for each ball that must be taken from a specific spot,
                // check whether that spot is available or not.
                const takeFromSpotsWithNoBall: { handIdx: number; ballIdx: number }[] = [];

                for (let handIdx = 0; handIdx < 2; handIdx++) {
                    for (const [ballIdx, spot] of ballsWithTakeFrom[handIdx]) {
                        if (freeTableSpotsAfter.has(spot)) {
                            // The spot has no ball on it, and we know that it never will in the next while iterations.
                            // We remove the spot from the ones we'll put in their user-specific spot, and error out.
                            // (the while loop has a variant : the number of balls put on user-defined spots decreases strictly.
                            // Thus, the number of balls put on the table also decreases (non striclty).
                            // Thus, a spot that has no ball on it can't have a ball on it in later iterations).
                            takeFromSpotsWithNoBall.push({ handIdx, ballIdx });
                            this.logError(
                                beat,
                                "Warn",
                                `Can't take ball ${ballName} from spot "${spot}" into hand ${handIdx} in position ${ballIdx} as it has no ball.`
                            );
                        } else {
                            // We add this spot to the free spots in case two balls take from the *same* spot.
                            freeTableSpotsAfter.add(spot);
                        }
                    }
                }

                // If all balls with user-defined spots can be taken from the table, we can leave the loop.
                if (takeFromSpotsWithNoBall.length === 0) {
                    break;
                }

                // Else we remove them, and loop once more.
                for (const { handIdx, ballIdx } of takeFromSpotsWithNoBall) {
                    ballsWithTakeFrom[handIdx].delete(ballIdx);
                }
            }

            // 4. Use the computed number of attributions to complete the old and new hands.

            // 4.1 Attribute what balls goes and comes from where.
            // The element in position 0 in each hand is the most recent ball.
            const oldIdxToSameHand: Hands<number> = [[], []];
            const oldIdxToOtherHand: Hands<number> = [[], []];
            const oldIdxToTable: Hands<number> = [[], []];
            const newIdxFromSameHand: Hands<number> = [[], []];
            const newIdxFromOtherHand: Hands<number> = [[], []];
            const newIdxFromTableWithTakeFrom: Hands<number> = [[], []];
            const newIdxFromTableNoTakeFrom: Hands<number> = [[], []];

            for (let handIdx = 0; handIdx < 2; handIdx++) {
                const otherHandIdx = (handIdx + 1) % 2;
                for (
                    let arrayIdx = ballsInOldHands[handIdx].length - 1;
                    arrayIdx >= 0;
                    arrayIdx--
                ) {
                    const { ballIdx } = ballsInOldHands[handIdx][arrayIdx];
                    const count = ballsInOldHands[handIdx].length - 1 - arrayIdx;
                    if (count < nbBallsFromSameHand[handIdx]) {
                        oldIdxToSameHand[handIdx].push(ballIdx);
                    } else if (
                        count <
                        nbBallsFromSameHand[handIdx] + nbBallsFromOtherHand[otherHandIdx]
                    ) {
                        oldIdxToOtherHand[handIdx].push(ballIdx);
                    } else {
                        oldIdxToTable[handIdx].push(ballIdx);
                    }
                }
                let count = 0;
                for (
                    let arrayIdx = ballsInNewHands[handIdx].length - 1;
                    arrayIdx >= 0;
                    arrayIdx--
                ) {
                    const ballIdx = ballsInNewHands[handIdx][arrayIdx];
                    const userDefinedSpot = ballsWithTakeFrom[handIdx].get(ballIdx);
                    if (userDefinedSpot !== undefined) {
                        newIdxFromTableWithTakeFrom[handIdx].push(ballIdx);
                    } else if (count < nbBallsFromSameHand[handIdx]) {
                        newIdxFromSameHand[handIdx].push(ballIdx);
                        count++;
                    } else if (
                        count <
                        nbBallsFromSameHand[handIdx] + nbBallsFromOtherHand[handIdx]
                    ) {
                        newIdxFromOtherHand[handIdx].push(ballIdx);
                    } else {
                        newIdxFromTableNoTakeFrom[handIdx].push(ballIdx);
                    }
                }
            }

            //Sanity check
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                const otherHandIdx = (handIdx + 1) % 2;
                if (
                    oldIdxToSameHand[handIdx] !== newIdxFromSameHand[handIdx] ||
                    oldIdxToOtherHand[handIdx] !== newIdxFromOtherHand[otherHandIdx]
                ) {
                    console.error("Something went wrong. Assertion failed.");
                }
            }

            // 4.2 Handle all balls that remain in hand.
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                for (let arrayIdx = 0; arrayIdx < oldIdxToSameHand[handIdx].length; arrayIdx++) {
                    const oldBallIdx = oldIdxToSameHand[handIdx][arrayIdx];
                    const newBallIdx = newIdxFromSameHand[handIdx][arrayIdx];
                    const ball = state.held[handIdx][oldBallIdx];
                    handsSetupOld[handIdx][oldBallIdx] = {
                        ball,
                        to: { type: "hand", rightHand: handIdx === 1, position: newBallIdx }
                    };
                    handsSetupNew[handIdx][newBallIdx] = { ball, from: { type: "hand" } };
                }
            }

            //4.3 Handle balls that change hands.
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                const otherHandIdx = (handIdx + 1) % 2;
                for (let arrayIdx = 0; arrayIdx < oldIdxToOtherHand[handIdx].length; arrayIdx++) {
                    const oldBallIdx = oldIdxToOtherHand[handIdx][arrayIdx];
                    const newBallIdx = newIdxFromOtherHand[otherHandIdx][arrayIdx];
                    const ball = state.held[handIdx][oldBallIdx];
                    handsSetupOld[handIdx][oldBallIdx] = {
                        ball,
                        to: { type: "hand", rightHand: otherHandIdx === 1, position: newBallIdx }
                    };
                    handsSetupNew[otherHandIdx][newBallIdx] = { ball, from: { type: "hand" } };
                }
            }

            // 4.4 Put old balls on the table.
            const freeTableSpots = findFreeTableSpots(ballsOnTableSpots.named);
            let spotIdx = 0;
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                for (const oldBallIdx of oldIdxToTable[handIdx]) {
                    const ball = state.held[handIdx][oldBallIdx];
                    let spot: undefined | string;
                    if (spotIdx >= freeTableSpots.length) {
                        // There is no more room on the table.
                        ballsOnTableSpots.unnamed.push(ball);
                        spot = undefined;
                        this.logError(
                            beat,
                            "Warn",
                            `Can't put ball ${stringifyBall(ball)} on table as all spots are already occupied.\n Continue by putting it somewhere on the table.`
                        );
                    } else {
                        // There is room on the table.
                        spot = freeTableSpots[spotIdx];
                        ballsOnTableSpots.named.set(spot, ball);
                        spotIdx++;
                    }
                    // Indicate the ball has been handled.
                    handsSetupOld[handIdx][oldBallIdx] = { ball, to: { type: "tableSpot", spot } };
                }
            }

            // 4.5 Take the new balls with user-defined spots from the table.
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                for (const newBallIdx of newIdxFromTableWithTakeFrom[handIdx]) {
                    const spot = handsSetup.newContents[handIdx][newBallIdx].fromSpot!;
                    const ball = ballsOnTableSpots.named.get(spot)!;
                    ballsOnTableSpots.named.set(spot, undefined);
                    handsSetupNew[handIdx][newBallIdx] = {
                        ball,
                        from: { type: "tableSpot", spot }
                    };
                }
            }

            // 4.6 Take the rest of the new balls from the table.
            // Create list of all available spots (named and unnamed).
            const occupiedSpots: { where: string | number; ball: Ball }[] = [];
            for (const [spot, ball] of ballsOnTableSpots.named) {
                if (ball !== undefined) {
                    occupiedSpots.push({ where: spot, ball });
                }
            }
            for (let ballIdx = ballsOnTableSpots.unnamed.length; ballIdx >= 0; ballIdx = 0) {
                const ball = ballsOnTableSpots.unnamed[ballIdx];
                const spot = ballIdx;
                occupiedSpots.push({ where: spot, ball });
            }
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                for (
                    let arrayIdx = 0;
                    arrayIdx < newIdxFromTableNoTakeFrom[handIdx].length;
                    arrayIdx++
                ) {
                    const newBallIdx = newIdxFromTableNoTakeFrom[handIdx][arrayIdx];
                    if (arrayIdx === occupiedSpots.length) {
                        // There are no more balls fetchable from the table. Error out.
                        this.logError(
                            beat,
                            "Error",
                            `Too few balls "${ballName}" are available both in hands and on table to form the specified new hand. Right hand contained : [${stringifyHand(state.held[0])}].\nLeft hand contained : [${stringifyHand(state.held[1])}].\nTable contained: ${stringifyTable(state.onTable)}.\nTODO : new hand ? Continue withtout taking that ball.`
                        );
                    } else if (arrayIdx < occupiedSpots.length) {
                        const { where, ball } = occupiedSpots[arrayIdx];
                        let spot: string | undefined;
                        if (typeof where === "number") {
                            popOneIndexFromList(ballsOnTableSpots.unnamed, where);
                            spot = undefined;
                        } else {
                            ballsOnTableSpots.named.set(where, undefined);
                            spot = where;
                        }
                        handsSetupNew[handIdx][newBallIdx] = {
                            ball,
                            from: { type: "tableSpot", spot }
                        };
                    }
                }
            }
        }

        // Sanity check : we have no undefined if handsSetupOld and handsSetupNew.
        const handsSetupOld2: Hands<BallPut> = [[], []];
        const handsSetupNew2: Hands<BallTake> = [[], []];
        for (let handIdx = 0; handIdx < 2; handIdx++) {
            for (const info of handsSetupOld[handIdx]) {
                if (info === undefined) {
                    console.error("Assumption is false. Something has gone very wrong.");
                } else {
                    handsSetupOld2[handIdx].push(info);
                }
            }
            for (const info of handsSetupNew[handIdx]) {
                if (info === undefined) {
                    console.error("Assumption is false. Something has gone very wrong.");
                } else {
                    handsSetupNew2[handIdx].push(info);
                }
            }
        }
        state = reconstructState(ballsLocationBySound, this.tableSpots, handsSetupNew2, state);
        return { state: state, handsSimulatorInfo: { old: handsSetupOld2, new: handsSetupNew2 } };
    }

    //TODO : Rename method.
    //TODO : Make it so it is the scheduler that stores the last state and event idx ?
    //TODO : Change this.events type to only hold nexecaary things.
    //TODO : In all methods, check if what is needed is prevEventIdx or the currentEventIdx we're handling ?
    //TODO : If needs be, also return the event idx to save a bit of calculation time.
    //TODO : What cloneState can be removed ?
    processEvent(
        nextEventIdx: number,
        state: JugglerState
    ): {
        tosses: PartialToss2[];
        state: JugglerState;
        nextEventIdx: number;
        hands?: SimulatorHands;
        tempo: Fraction;
    } {
        // Manage state.
        const eventBeat = this.events[nextEventIdx][0];
        const { handsSetup, tosses, tempo } = this.events[nextEventIdx][1];
        let handsInfo: SimulatorHands | undefined = undefined;
        state = this.descendAirborneBalls(eventBeat, state);
        if (handsSetup !== undefined) {
            const res = this.swapBalls(eventBeat, state, handsSetup);
            state = res.state;
            handsInfo = res.handsSimulatorInfo
        }
        const res = this.tossBalls(tosses, state, eventBeat, nextEventIdx);
        return {
            tosses: res.tosses,
            state: res.state,
            nextEventIdx: nextEventIdx + 1,
            hands: handsInfo,
            tempo: tempo
        };
    }

    addTossesToState(
        tosses: PartialToss2[],
        state: JugglerState
    ): { tosses: SimulatorToss<Fraction>[]; state: JugglerState } {
        state = cloneState(state);
        const completedTosses: SimulatorToss<Fraction>[] = [];
        for (const toss of tosses) {
            // Check if the ball would be received off-beat.
            let prevEventIdx = this.getPreviousEventIdx(toss.to.beat);
            const [eventBeat, { tempo }] = this.events[prevEventIdx];
            let toBeat = toss.to.beat;
            if (!isInRhythm(toBeat, eventBeat, tempo)) {
                const correction = this.correctOffbeatBeat(toBeat, prevEventIdx);
                toBeat = correction.beat;
                prevEventIdx = correction.prevEventIdx;
                const nbSteps = eventBeat.sub(toss.to.beat).div(tempo).floor();
                const prevBeat = eventBeat.add(tempo).mul(nbSteps);
                this.logError(
                    toss.to.beat,
                    "Error",
                    `Ball ${stringifyBall(toss.ball)} is caught off-beat.\n${this.name}'s previous beat: ${prevBeat.toString()}.\nBall caught beat: ${toss.to.beat.toString()}.\nNext beat: ${toBeat}.`
                );
            }
            // Compute catching hand.
            let toRightHand: boolean;
            if (toss.to.hand === undefined) {
                toRightHand = this.defaultCatchWithRightHand(toBeat, prevEventIdx);
            } else if (toss.to.hand === "x") {
                toRightHand = !this.defaultCatchWithRightHand(toBeat, prevEventIdx);
            } else {
                toRightHand = toss.to.hand === "R";
            }
            state.airborne.set(toss.ball.id, {
                ball: toss.ball,
                catchBeat: toBeat,
                throwBeat: toss.from.beat,
                toRightHand: toRightHand
            });
            completedTosses.push({
                from: toss.from,
                to: { beat: toBeat, juggler: toss.to.juggler, rightHand: toRightHand },
                ball: toss.ball,
                mode: toss.mode
            });
        }
        return { tosses: completedTosses, state: state };
    }

    //TODO : Debug function with passing ?

    //TODO2
    // getStates(): FracSortedList<JugglerState> {
    //     const it = this.beats.begin();
    //     const knownStates = new FracTimeline<JugglerState>();
    //     while (it.isAccessible() && it.pointer[1].state !== undefined) {
    //         knownStates.setElement(it.pointer[0], it.pointer[1].state);
    //         it.next();
    //     }
    //     return knownStates;
    // }

    // //TODO.
    // resetFrom(beat: Fraction): void {}
}

//TODO : Messages d'erreurs avec position.

/** @constant
The epsilon value to use for comparisons ont the timeline.
Two events apart by less than 0.0001 s are considered to be the same.
*/
// const EPSILON = 1e-5;

// //TODO : Precise in seconds or in milliseconds ?
// function is_equal(t1: number, t2: number): boolean {
//     return Math.abs(t1 - t2) < EPSILON;
// }

// type MusicTime = [number, Fraction];

// class MusicTimeline<EventType> extends Timeline<MusicTime, EventType> {
//     static cmp = (x: MusicTime, y: MusicTime) => {
//         if (x[0] === y[0]) {
//             return x[1].compare(y[1]);
//         }
//         return x[0] - y[0];
//     };
//     constructor(container?: [MusicTime, EventType][]) {
//         super(container, MusicTimeline.cmp);
//     }
// }
// interface Measure {
//     tempoUnit: Fraction;
//     signature: Fraction;
//     startingBeat: Fraction;
// }

// //Fuse measure and beat to be MusicTime ?
// interface Notes {
//     pitches: string[];
//     measure: number;
//     beat: Fraction;
//     // real_time: number;
// }

//TODO rename throw to toss everywhere
// function getMusic(
//     pattern: FracTimeline<SimulatorToss[]>,
//     measures: Measure[]
// ): MusicTimeline<Note[]> {
//     const music = new MusicTimeline<Notes[]>();
//     for (const [, tosses] of pattern) {
//         for (const toss of tosses) {
//             const measure = measures[toss.to.measure];
//             // const time = toss.to.beat.mul(measure.signature.d).add(measure.startingBeat);
//             const time: [number, Fraction] = [toss.to.measure, toss.to.beat];
//             let notes: Note[] | undefined = music.getElementByKey(time);
//             if (notes === undefined) {
//                 notes = [];
//                 music.setElement(time, notes);
//             }
//             notes.push({
//                 pitch: toss.ball.sound,
//                 // measure: toss.to.measure,
//                 beat: toss.to.beat
//                 // real_time: toss.to.real_time
//             });
//         }
//     }
//     return music;
// }

function stringifyTable(table: {
    namedSpot: Map<string, Ball | undefined>;
    unknown: Set<Ball>;
}): string {
    let text = "";
    for (const [spot, ball] of table.namedSpot) {
        if (ball !== undefined) {
            text += `Spot ${spot} : ${stringifyBall(ball)}\n`;
        }
    }
    text = text.slice(0, -2);
    if (table.unknown.size !== 0) {
        text += "\nUnnamed spot : ";
        for (const ball of table.unknown) {
            text += `${stringifyBall(ball)}, `;
        }
        text = text.slice(0, -2);
        text += ".";
    }
    return text;
}
