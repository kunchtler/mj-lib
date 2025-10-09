import Fraction from "fraction.js";
import {
    indentString,
    stringifyBall,
    stringifyHand,
    stringifyTable
} from "../utils/stringifyEvent";
import { FracTimedErrorLogger, Severity, TimedErrorLogger } from "../utils/TimedErrorLogger";
import { HandsInstructions, TakeBall } from "./PerformanceDescription";

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

//TODO : add beat to the object rather than have a 2-array element.
//TODO : Report some type explanation from Scheduler2 to Scheduler3 / PatternDescription.
//TODO : Fuse redundant types with those from Pattern Description ?
//TODO : One day, change types [Fraction, x] to {...x, beat: Fraction}
//TODO : Another class that given a table and balls on that table has method to
// give all spots of one type, if they are occupied or not, etc...
//TODO : swap all interfaces for types in all files
//TODO : Rename some stuff
// Question : what may we want to manipulate or have acces to ?
// Answer 1 : The JSONScore
// Answer 1.5 : The score (not JSON)
// Answer 2 : the events post parser, but without completing tempo / default hand everywhere (indeed, changing one somewhere would change all that comes after). But completing so that no element is undefined is fine.
// So we should have a function that returns that. And this really is the result from parsing... the score !!
// Answer 3 : the events post scheduler (don't care necessarily about having access to the fully compleated one, but we could just in case have a function for taht.)
// TODO : add the unit time, and the sound to be played in that one. In the previous one too ?
// How are all of these called ?
// JSONJugglingScore, JugglingScore, JugglingScoreDecomposed (JugglingScore2), JugglingEvents (JugglingScore3)

///////////////////// Types for the Scheduler /////////////////////

/**
 * A sorted array-encoded timeline.
 */
export type SchedulerParams = {
    /**
     * A map that to each ballID give its corresponding kind.
     */
    ballIDMap: Map<string, string>;
    /**
     * A map of all the jugglers.
     */
    jugglers: Map<string, SchedulerJuggler>;
};

export type SchedulerJuggler = {
    // name: string;
    initialState: JugglerState;
    tableSpots?: Map<SpotName, BallTemplateName>;
    events: SchedulerEvent[];
};

export type BallID = string;
export type BallName = string;

export type SchedulerEvent = {
    beat: Fraction;
    tosses: PartialToss[];
    tempo: Fraction;
    defaultHand: "R" | "L";
    setupHands?: HandsInstructions;
};

export type PartialToss = {
    from: { hand: "R" | "L" };
    to: {
        juggler: string;
        hand?: "R" | "L" | "x";
    };
    ball?: { id: BallID } | { name: BallName };
    mode: TossMode;
};

/**
 * Siteswap height information about the toss if it exists, or the beat it should be caught at.
 */
export type TossMode = { type: "Beat"; beat: Fraction } | { type: "Height"; height: number };

/**
 * A 2-element array  [leftHand, rightHand].
 */
export type Hands<ContentType> = [ContentType[], ContentType[]];

export type SchedulerRes = Map<
    string,
    {
        events: SymbolicEvent<Fraction>[];
        states: (JugglerState & { beat: Fraction })[];
        errorLogger: FracTimedErrorLogger;
    }
>;

///////////////////// Scheduler internal types /////////////////////

/**
 * Partially completed information about a toss, halfway through the scheduler.
 * This type is used when jugglers have tossed their balls, but they haven't appeared yet
 * in the airborne state of the jugglers that will catch taht ball.
 */
type HalfCompletedToss = {
    from: { juggler: string; handIdx: number; ballIdx: number; beat: Fraction };
    to: { juggler: string; hand?: "R" | "L" | "x"; beat: Fraction };
    ballID: BallID;
    mode: TossMode;
};

type CompleteCatch = { ballID: string; handIdx: number; ballIdx: number };

type JugglerCache = {
    state: JugglerState;
    nextEventIdx: number;
};

///////////////////// Symbolic Events Layer types //////////////////////

export type SymbolicToss<BeatT> = {
    from: { juggler: string; handIdx: number; ballIdx: number; beat: BeatT };
    to: { juggler: string; handIdx: number; ballIdx: number; beat: BeatT };
    ballID: BallID;
    mode: TossMode;
};

export type SymbolicEvent<BeatType> = {
    beat: BeatType;
    tosses: SymbolicToss<BeatType>[];
    tempo: Fraction;
    setupHands?: MoveBall[];
};

export type MoveBall = { id: BallID; from: LocType; to: LocType };
export type LocType = HeldLoc | TableNamedSpotLoc | TableNamelessSpotLoc;

export type HeldLoc = { type: "held"; handIdx: number; ballIdx: number };
export type TableNamedSpotLoc = { type: "onTableSpot"; spotName: string };
export type TableNamelessSpotLoc = { type: "onTableUnknownSpot" };

//TODO : exprugate "PartialBall".
//TODO : Document that by default hands have LIFO structure.
//TODO : Make Generic version for the fun of it ?
//TODO : Rename partialEvents (clashes with JS events ?)
//TODO : Fail Gracefully
//TODO : Document that events param in constructor won't be copied and thus that it can be used to modify
// The search directly ? Or do proper method ?
//TODO : Fuse events before calling scheduler.
//TODO : Save Line / Col to pinpoint error ?
//TODO : Document what events must be (sorted, no duplicate, names ok, etc)
/**
 * A scheduler class, that compu
 * TODO : What this does, mention cache.
 */
export class Scheduler {
    jugglers: Map<
        string,
        {
            manager: JugglerManager;
            /**
             * A cache needed for successive iterations of a juggler's state computation.
             */
            cache: JugglerCache;
            /**
             * The initial state, used in case we want the states computation to start again.
             */
            initialState: JugglerState;
        }
    >;

    constructor({ jugglers, ballIDMap }: SchedulerParams) {
        this.jugglers = new Map();

        // Setup one JugglerManager per juggler.
        for (const [jugglerName, { events, initialState, tableSpots }] of jugglers) {
            // Create a manager for each juggler.
            const manager = new JugglerManager(
                jugglerName,
                events,
                ballIDMap,
                new FracTimedErrorLogger(),
                tableSpots
            );
            this.jugglers.set(jugglerName, {
                manager: manager,
                cache: { state: cloneState(initialState), nextEventIdx: 0 },
                initialState: initialState
            });
        }
    }

    validatePattern(): SchedulerRes {
        // First reset the cache.
        for (const [, juggler] of this.jugglers) {
            juggler.cache = {
                state: cloneState(juggler.initialState),
                nextEventIdx: 0
            };
        }

        // Setup the returned value.
        const schedulerResults: SchedulerRes = new Map();
        for (const [jugglerName, { manager }] of this.jugglers) {
            schedulerResults.set(jugglerName, {
                events: [],
                states: [],
                errorLogger: manager.errorLogger
            });
        }

        // Add to the returned value the initial state before any toss or other event is made.
        // Compute the beat of the first ever event.
        let firstGlobalBeat: Fraction | null = null;
        for (const [, { cache, manager }] of this.jugglers) {
            const firstJugglerBeat = manager.nextBeatOfInterest(0, cache.state);
            if (
                firstJugglerBeat !== null &&
                (firstGlobalBeat === null || firstJugglerBeat.beat.lt(firstGlobalBeat))
            ) {
                firstGlobalBeat = firstJugglerBeat.beat;
            }
        }
        if (firstGlobalBeat === null) {
            // If there is no first event at all, have 0 as first beat.
            for (const [jugglerName, { cache }] of this.jugglers) {
                schedulerResults
                    .get(jugglerName)
                    ?.states.push({ ...cache.state, beat: new Fraction(0) });
            }
        } else {
            // Have as first juggler state beat one in tempo, which is <= the first global beat.
            // (We need to be before the global state as a jugler may receive a ball before
            // their first event is processed).
            for (const [jugglerName, { manager, cache }] of this.jugglers) {
                let firstJugglerBeat: Fraction;
                if (manager.events.length === 0) {
                    firstJugglerBeat = firstGlobalBeat;
                } else {
                    const tempo = manager.events[0].tempo;
                    const firstEventBeat = manager.events[0].beat;
                    const nbSteps = firstEventBeat.sub(firstGlobalBeat).div(tempo).floor().add(1);
                    firstJugglerBeat = firstEventBeat.sub(tempo.mul(nbSteps));
                }
                schedulerResults
                    .get(jugglerName)
                    ?.states.push({ ...cache.state, beat: firstJugglerBeat });
            }
        }

        // Create a map of balls that have been tossed but not caught.
        // Once caught (notably, once catch information have been computed),
        // this map provides insights on where to add toss info.
        const airborneBalls = new Map<string, { toss: HalfCompletedToss; resultsIdx: number }>();

        // Loop until we've seen all jugglers' events and no balls are airborne.
        while (true) {
            // First, identify what is the following beat of interest, which is either :
            // - an event beat (with tosses, are ball change in hands).
            // - a catch beat.
            // (note : in case they are catches and events for a same juggler, event takes
            // precedence)
            // Also identify which jugglers are concerned.
            let nextBeatOfInterest: Fraction | null = null;
            let nextBeatJugglers: { name: string; isEvent: boolean }[] = [];
            for (const [jugglerName, { manager, cache }] of this.jugglers) {
                const nextInterest = manager.nextBeatOfInterest(cache.nextEventIdx, cache.state);
                if (nextInterest !== null) {
                    if (nextBeatOfInterest === null || nextInterest.beat.lt(nextBeatOfInterest)) {
                        nextBeatOfInterest = nextInterest.beat;
                        nextBeatJugglers = [{ name: jugglerName, isEvent: nextInterest.isEvent }];
                    } else if (nextInterest.beat.equals(nextBeatOfInterest)) {
                        nextBeatJugglers.push({ name: jugglerName, isEvent: nextInterest.isEvent });
                    }
                }
            }

            // Stop condition : all events have been seen.
            if (nextBeatOfInterest === null) {
                break;
            }

            // We maintain a set of all juggler's name that either tossed or add
            // balls added to their airborne state, in order to record their new
            // state by the end.
            const jugglersWithNewState = new Set<string>();
            // We keep track of which balls are tossed to whom.
            const tossedTo = new Map<string, HalfCompletedToss[]>();
            for (const name of this.jugglers.keys()) {
                tossedTo.set(name, []);
            }

            // Record all catches that happened, then complete the info
            // of the toss they are paired with, then modify airborneBalls
            // with the new tosses.
            const catches: CompleteCatch[] = [];

            for (const { name: jugglerName, isEvent } of nextBeatJugglers) {
                const { manager, cache } = this.jugglers.get(jugglerName)!;
                if (!isEvent) {
                    // Update the cache.
                    // TODO : CHANGE THIS FUNCTION
                    const res = manager.descendAirborneBalls(nextBeatOfInterest, cache.state);
                    cache.state = res.state;
                    catches.push(...res.catches);
                    // Tag the juggler has having a new state.
                    jugglersWithNewState.add(jugglerName);
                } else {
                    const res = manager.processEvent(cache.nextEventIdx, cache.state);
                    catches.push(...res.catches);

                    // Update the cache.
                    cache.nextEventIdx++; // Bump the relevant event index.
                    cache.state = res.state; // Update the juggler's state.

                    // Add the partially completed event to the result.
                    schedulerResults.get(jugglerName)!.events.push({
                        beat: nextBeatOfInterest,
                        tempo: res.tempo,
                        // We leave the tosses empty for now, as they'll be filled in
                        // with additional info when caught by the receiving juggler.
                        tosses: [],
                        setupHands: res.handsInstructions
                    });

                    for (const toss of res.tosses) {
                        // Assign to the tossedTo map the tosses made to each juggler.
                        tossedTo.get(jugglerName)?.push(toss);
                    }

                    // Tag the juggler as having a new state.
                    if (
                        res.tosses.length !== 0 ||
                        (res.handsInstructions !== undefined && res.handsInstructions.length !== 0)
                    ) {
                        jugglersWithNewState.add(jugglerName);
                    }
                }
            }

            // Use the catches to complete previous toss information.
            for (const { ballID, ballIdx, handIdx } of catches) {
                const { toss, resultsIdx } = airborneBalls.get(ballID)!;
                airborneBalls.delete(ballID);
                const ev = schedulerResults.get(toss.from.juggler)!.events[resultsIdx];
                ev.tosses.push({
                    ballID: ballID,
                    from: toss.from,
                    to: {
                        juggler: toss.to.juggler,
                        handIdx: handIdx,
                        ballIdx: ballIdx,
                        beat: toss.to.beat
                    },
                    mode: toss.mode
                });
            }

            // Send the tossed ball to the corresponding jugglers.
            // We send them all at once.
            for (const [jugglerName, tosses] of tossedTo) {
                const { manager, cache } = this.jugglers.get(jugglerName)!;
                // Update the cache's state. No need to bump the event idx.
                cache.state = manager.addTossesToState(tosses, cache.state);
                // Tag the juggler has having a new state.
                if (tosses.length !== 0) {
                    jugglersWithNewState.add(jugglerName);
                }

                // Remember the ball's info to complete them later.
                const resultsIdx = schedulerResults.get(jugglerName)!.events.length - 1;
                for (const toss of tosses) {
                    // We do this here since "catches are made before tosses".
                    airborneBalls.set(toss.ballID, { toss, resultsIdx });
                }
            }

            // For any juggler that tossed or received balls, record their state.
            for (const jugglerName of jugglersWithNewState) {
                const state = this.jugglers.get(jugglerName)!.cache.state;
                schedulerResults
                    .get(jugglerName)
                    ?.states.push({ ...state, beat: nextBeatOfInterest });
            }
        }

        // Print in the console any error that has been encountered.
        // TODO : Remove / Combine all error loggers in one ?
        // for (const { manager } of this.jugglers.values()) {
        //     manager.errorLogger.printErrorsInConsole();
        // }

        return schedulerResults;
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
        // ballID: BallID;
        /**
         * The time when then ball will be caught.
         */
        catchBeat: Fraction;
        /**
         * The time the ball was thrown.
         */
        tossBeat: Fraction;
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
    held: [BallID[], BallID[]];
    /**
     * The table and the balls that are on it.
     */
    table?: TableState;
};

type TableState = {
    /**
     * A map of all spots on the table, and whether they contain a ball or not.
     */
    namedSpot: Map<string, BallID>;
    /**
     * A set of all the balls that are not on a named spot.
     */
    unknown: Set<BallID>;
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
        table:
            state.table === undefined
                ? undefined
                : {
                      namedSpot: new Map(state.table.namedSpot),
                      unknown: new Set(state.table.unknown)
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
 * @param arr the list.
 * @param index the index to remove.
 * @returns the value of the returned element if the index was in the list's bounds, undefined otherwise.
 */
export function popOneIndexFromArray<T>(arr: T[], index: number): T | undefined {
    const spliced = arr.splice(index, 1);
    return spliced.length === 0 ? undefined : spliced[0];
}

export function addAtIndexInArray<T>(arr: T[], index: number, elem: T): void {
    arr.splice(index, 0, elem);
}
//TODO : Check that works if events is empty.
//TODO : Rename "Events" => "Event" NO, CLASH WITH JS, BETTER NAME.
//TODO : Rename 'Tempo' => "unit value"
//TODO : Rename 'beats' => "states" ?

export function getFirstInsertedKey<T>(it: Set<T> | Map<T, unknown>): T | undefined {
    return it.keys().next().value;
}

export function getLastInsertedKey<T>(it: Set<T> | Map<T, unknown>): T | undefined {
    return it.size === 0 ? undefined : [...it.keys()][it.size - 1];
}

class JugglerManager {
    jugglerName: string;
    events: SchedulerEvent[];
    errorLogger: TimedErrorLogger<Fraction>;
    ballIDMap: Map<BallID, BallTemplateName>;
    tableSpots: Map<SpotName, BallID>;

    //TODO : Document that currentbeat : state does not exist yet. But info on tempo and usehand might ! Misleading name ?
    //TODO : When only siteswap height 3 was given, should we deafult to:
    // - 3 beats (even if the tempo then gets shorter ?)
    // - 3 * current unit value (possibly falling outside of rhythm)
    // FIRST ANSWER, reason : to keep the symbolic of the height (hand changing etc)
    //+ Easier to understand in practice (number of actions done before catching it).
    //TODO: Reorder constructor code.
    constructor(
        name: string,
        events: SchedulerEvent[],
        ballIDMap: Map<string, string>,
        errorLogger: TimedErrorLogger<Fraction>,
        tableSpots?: Map<SpotName, BallID>
    ) {
        this.jugglerName = name;
        this.events = events;
        this.ballIDMap = ballIDMap;
        this.errorLogger = errorLogger;
        this.tableSpots = tableSpots ?? new Map<string, string>();
    }

    // static generateIntialState(heldBalls: [BallID[], BallID[]], ballsOnTable?: {namedSpots: Map<string, string>, unknown?: Set<string>}): JugglerState {
    //     return {
    //         airborne: new Map(),
    //         held: heldBalls,
    //         table: ballsOnTable === undefined ? undefined : ballsOnTable
    //     };
    // }

    // static generateInitialCache(): JugglerCache {
    //     return { state: this.generateIntialState(), nextEventIdx: 0 };
    // }

    hasReachedEnd(eventIdx: number, state: JugglerState): boolean {
        return eventIdx >= this.events.length && state.airborne.size === 0;
    }

    nextBeatOfInterest(
        nextEventIdx: number,
        state: JugglerState
    ): { beat: Fraction; isEvent: boolean } | null {
        const nextEventBeat = this.nextEventBeat(nextEventIdx);
        const nextCatchBeat = this.nextCatchBeat(state);
        if (nextEventBeat === null && nextCatchBeat === null) {
            return null;
        }
        const isEvent =
            nextEventBeat !== null && (nextCatchBeat === null || nextEventBeat.lte(nextCatchBeat));
        return { beat: isEvent ? nextEventBeat! : nextCatchBeat!, isEvent };
    }

    private nextEventBeat(eventIdx: number): Fraction | null {
        return eventIdx < this.events.length ? this.events[eventIdx].beat : null;
    }

    private nextCatchBeat(state: JugglerState): Fraction | null {
        let minBeat: Fraction | null = null;
        for (const [, { catchBeat }] of state.airborne) {
            if (minBeat === null) {
                minBeat = catchBeat;
            } else if (catchBeat.lt(minBeat)) {
                minBeat = catchBeat;
            }
        }
        return minBeat;
    }

    private logError(beat: Fraction, severity: Severity, message: string): void {
        this.errorLogger.logError({
            time: beat,
            severity: severity,
            message: `Juggler ${this.jugglerName}:\n${indentString(message, 2, true)}`
        });
    }

    // correctOffbeatBeat(
    //     targetBeat: Fraction,
    //     prevEventIdx: number
    // ): { beat: Fraction; prevEventIdx: number } {
    //     const [eventBeat, { tempo }] = this.events[prevEventIdx];
    //     const nbSteps = targetBeat.sub(eventBeat).div(tempo).ceil();
    //     const newBeat = eventBeat.add(tempo.mul(nbSteps));
    //     let newPrevEventIdx = prevEventIdx;
    //     if (
    //         prevEventIdx + 1 < this.events.length &&
    //         this.events[prevEventIdx + 1][0].lte(newBeat)
    //     ) {
    //         newPrevEventIdx++;
    //     }
    //     return { beat: newBeat, prevEventIdx: newPrevEventIdx };
    // }

    // getPreviousEventIdx(beat: Fraction): number {
    //     if (beat.lte(this.events[0].beat)) {
    //         // If the beat is before any event, we return the first one.
    //         return 0;
    //     } else if (beat.gte(this.events[this.events.length - 1].beat)) {
    //         return this.events.length - 1;
    //     }
    //     // Thanks to previous checks, the findIndex method won't return -1.
    //     // TODO : Faster bin search version ?
    //     return this.events.findIndex(([evBeat]) => evBeat.gt(beat)) - 1;
    // }

    //TODO : Check beat is on rhythm ? When should that be done ?
    //TODO : Check all functions when beat received before first event. Here, this function is called when tossing ball, so No Problemo :D
    //TODO : MAKE SURE TEMPO CHANGES HAPPEN ON BEATS ?! WITH OFFSET ? HOW TO HANDLE ?
    //TODO : Document functions with prevEvent, startBeat etc. Limit side effects. If side effects, document them.
    /**
     * Compute the catch beat of a toss based on its siteswap height. Takes into account the fact that the tempo may change.
     * @param height the siteswap height of the toss.
     * @param tossEventIdx the index of the toss event.
     * @returns The catch time of the toss.
     */
    getCatchBeatFromSiteswapHeight(height: number, tossEventIdx: number): Fraction {
        let catchBeat = this.events[tossEventIdx].beat;
        let eventIdx = tossEventIdx;
        for (let i = 0; i < height; i++) {
            // First, figure out if we encounter a new event (for which there may be a new tempo).
            if (eventIdx + 1 < this.events.length) {
                const nextEvBeat = this.events[eventIdx + 1].beat;
                if (catchBeat.gte(nextEvBeat)) {
                    // Note : catchBeat is strictly greater than nextEvBeat when
                    // events do not follow each other nicely in rhythm.
                    eventIdx++;
                }
            }
            // Then considering the right tempo, increase the catch time.
            const tempo = this.events[eventIdx].tempo;
            catchBeat = catchBeat.add(tempo);
        }
        return catchBeat;
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

    //TODO : In all methods, make sure we know that EVENTS OCCUR ON TEMPO !!!
    //TODO : We don't really descend the balls but we check if they are caught.
    //TODO : Instead of modifying current state... why not return a new one ?
    //TODO : Warn of multiple balls falling at the same time when they are relaunched only.
    //since that is when there is an ambiguity on which one to throw first.
    //If ball was specified, fail gracefully ?
    //TODO : Should the currentBeat have been updated yet or not (currently it is).
    //TODO : Balls not ending on beat have been handled already before adding them to airborne.
    //TODO : Change param name ?
    //TODO : private or protected functions with side effects that are order dependent.
    //TODO : pass jugglerstate as argument to avoid side effect / dependency on private fields. (have more information to deduce prevEventIdx ?).
    descendAirborneBalls(
        toBeat: Fraction,
        state: JugglerState
    ): {
        state: JugglerState;
        catches: CompleteCatch[];
    } {
        state = cloneState(state);
        // Identify each ball that has been caught by their destination hand.
        const caughtBallsByHand: [BallID[], BallID[]] = [[], []];
        const caughtBallsInfo: CompleteCatch[] = [];

        for (const [ballID, { catchBeat, toRightHand }] of state.airborne) {
            if (catchBeat.lte(toBeat)) {
                caughtBallsByHand[toRightHand ? 1 : 0].push(ballID);
            }
        }

        for (let handIdx = 0; handIdx < 2; handIdx++) {
            // In each hand, sort the balls by their catch time.
            const ballsCaughtByTime: { beat: Fraction; balls: BallID[] }[] = [];
            for (const ballID of caughtBallsByHand[handIdx]) {
                const catchBeat = state.airborne.get(ballID)!.catchBeat;
                const catchBeatIdx = ballsCaughtByTime.findIndex(({ beat }) =>
                    beat.equals(catchBeat)
                );
                if (catchBeatIdx === -1) {
                    ballsCaughtByTime.push({ beat: catchBeat, balls: [ballID] });
                } else {
                    ballsCaughtByTime[catchBeatIdx].balls.push(ballID);
                }
            }

            // Sort the caught balls by time.
            ballsCaughtByTime.sort((a, b) => a.beat.compare(b.beat));

            if (ballsCaughtByTime.length > 1) {
                this.logError(toBeat, "Error", "This shouldn't happen");
            }

            for (const { beat, balls } of ballsCaughtByTime) {
                // If two balls are caught on the same beat, we issue a warning,
                // not knowing exactly how to arrange them in hand.
                if (balls.length > 1) {
                    let ballsText = "";
                    for (const ballID of balls) {
                        ballsText += `${stringifyBall(ballID)} (tossed at beat ${state.airborne.get(ballID)!.tossBeat}), `;
                    }
                    this.logError(
                        beat,
                        "Warn",
                        `${balls.length} balls were caught at the same time in the ${handIdx === 0 ? "left" : "right"} hand: ${ballsText}.\nProceeding, but there may be an ambiguity and randomness on future throws.`
                    );
                }
                // Add the balls to the hand.
                for (const ballID of balls) {
                    state.airborne.delete(ballID);
                    state.held[handIdx].push(ballID);
                    caughtBallsInfo.push({
                        ballID: ballID,
                        handIdx: handIdx,
                        ballIdx: state.held[handIdx].length - 1
                    });
                }
            }
        }
        return { state, catches: caughtBallsInfo };
    }

    // descendAirborneBalls(
    //     toBeat: Fraction,
    //     state: JugglerState
    // ): { intermediateStates: [Fraction, JugglerState][]; lastState: JugglerState } {
    //     const intermediateStates: [Fraction, JugglerState][] = [];
    //     // Identify each ball that has been caught by their destination hand.
    //     const ballsCaught: [BallID[], BallID[]] = [[], []];
    //     for (const [ballID, { catchBeat, toRightHand }] of state.airborne) {
    //         if (catchBeat.lte(toBeat)) {
    //             ballsCaught[toRightHand ? 1 : 0].push(ballID);
    //         }
    //     }

    //     for (let handIdx = 0; handIdx < 2; handIdx++) {
    //         // In each hand, sort the balls by their catch time.
    //         const ballsCaughtByTime: { beat: Fraction; balls: BallID[] }[] = [];
    //         for (const ballID of ballsCaught[handIdx]) {
    //             const catchBeat = state.airborne.get(ballID)!.catchBeat;
    //             const catchBeatIdx = ballsCaughtByTime.findIndex(({ beat }) =>
    //                 beat.equals(catchBeat)
    //             );
    //             if (catchBeatIdx === -1) {
    //                 ballsCaughtByTime.push({ beat: catchBeat, balls: [ballID] });
    //             } else {
    //                 ballsCaughtByTime[catchBeatIdx].balls.push(ballID);
    //             }
    //         }

    //         // Sort the caught balls by time.
    //         ballsCaughtByTime.sort((a, b) => a.beat.compare(b.beat));

    //         for (const { beat, balls } of ballsCaughtByTime) {
    //             // If two balls are caught on the same beat, we issue a warning,
    //             // not knowing exactly how to arrange them in hand.
    //             if (balls.length > 1) {
    //                 let ballsText = "";
    //                 for (const ballID of balls) {
    //                     ballsText += `${stringifyBall(ballID)} (tossed at beat ${state.airborne.get(ballID)!.tossBeat}), `;
    //                 }
    //                 this.logError(
    //                     beat,
    //                     "Warn",
    //                     `${balls.length} balls were caught at the same time in the ${handIdx === 0 ? "left" : "right"} hand: ${ballsText}.\nProceeding, but there may be an ambiguity and randomness on future throws.`
    //                 );
    //             }
    //             // Add the balls to the hand.
    //             state = cloneState(state);
    //             for (const ballID of balls) {
    //                 state.airborne.delete(ballID);
    //                 state.held[handIdx].push(ballID);
    //             }
    //             intermediateStates.push([beat, state]);
    //         }
    //     }

    //     const lastState = cloneState(state);
    //     // The returned intermediateStates has only states with beat < toBeat.
    //     // The returned lastState is the state at beat toBeat.
    //     // Check this is the case.
    //     if (
    //         intermediateStates.length !== 0 &&
    //         intermediateStates[intermediateStates.length - 1][0].equals(toBeat)
    //     ) {
    //         intermediateStates.pop();
    //     }
    //     return { intermediateStates, lastState };
    // }

    /**
     * Tosses all balls that must be tossed.
     * @param state the juggler's state before the toss.
     * @param eventIdx the event specifying all balls to be tossed.
     * @returns the tosses with additional information about them, and the state after the balls have been tossed (but the tossed balls are not yet airborne. The sceduler will handle that later.)
     */
    tossBalls(
        state: JugglerState,
        eventIdx: number
    ): { tosses: HalfCompletedToss[]; state: JugglerState } {
        const { beat, tosses } = this.events[eventIdx];

        // We remove the tossed balls from state.held as they are treated.
        state = cloneState(state);

        const halfCompletedTosses: HalfCompletedToss[] = [];

        const handleBall = (
            ballID: string,
            ballIdx: number,
            toss: PartialToss,
            state: JugglerState
        ): { state: JugglerState; halfCompletedToss: HalfCompletedToss } => {
            state = cloneState(state);
            const fromRightHand = toss.from.hand === "R";
            const tossHand = state.held[fromRightHand ? 1 : 0];
            // Determine the catching beat and (maybe) the catching hand.
            let toBeat: Fraction;
            let toHand: "L" | "R" | "x" | undefined;

            if (toss.mode.type === "Height") {
                // In case the toss is defined via siteswap (and not via catching beat time), we need to compute :
                // - the exact catching beat.
                // - the exact catching hand IF the ball is tossed to self (as it is determined in that case at toss rather than at catch time)
                toBeat = this.getCatchBeatFromSiteswapHeight(toss.mode.height, eventIdx);
                if (toss.to.juggler === this.jugglerName) {
                    if (toss.to.hand === undefined) {
                        toHand = !XOR(toss.mode.height % 2 === 0, fromRightHand) ? "R" : "L";
                    } else if (toss.to.hand === "x") {
                        toHand = XOR(toss.mode.height % 2 === 0, fromRightHand) ? "R" : "L";
                    } else {
                        // toss.to.hand is already right or left.
                        toHand = toss.to.hand;
                    }
                }
            } else {
                // The toss has been defined by its relative or absolute catch time.
                // The catch time has already been computed, and we'll be able to determine the catching hand only at catch time.
                toBeat = toss.mode.beat;
                toHand = toss.to.hand;
            }

            // Remove the ball from the state so as to not toss it again
            // when considering the next tosses in this for loop.
            tossHand.splice(ballIdx, 1);

            // Return the toss information to the outputed array.
            const halfCompletedToss: HalfCompletedToss = {
                from: {
                    beat: beat,
                    juggler: this.jugglerName,
                    handIdx: fromRightHand ? 1 : 0,
                    ballIdx: ballIdx
                },
                to: { beat: toBeat, juggler: toss.to.juggler, hand: toHand },
                ballID: ballID,
                mode: toss.mode
            };
            return { state, halfCompletedToss };
        };

        // First, we handle each tossed ball that has a designated ID.
        // (we wouldn't want to toss it by mistake when considering a previous ball)
        for (const toss of tosses) {
            if (toss.ball !== undefined && "id" in toss.ball) {
                // Figure out which ball is tossed.
                // The ID of the tossed ball has been specified.
                // We need to check it is indeed present in hand.
                const tossedBallID = toss.ball.id;
                const fromRightHand = toss.from.hand === "R";
                const tossedBallIdx = state.held[fromRightHand ? 1 : 0].findIndex(
                    (ballID) => ballID === tossedBallID
                );
                if (tossedBallIdx === -1) {
                    this.logError(
                        beat,
                        "Error",
                        `Can't toss ball ${stringifyBall(toss.ball)} from the ${fromRightHand ? "right" : "left"} hand as it is not there.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinues by trying to toss it later.`
                    );
                    continue;
                }

                const res = handleBall(tossedBallID, tossedBallIdx, toss, state);
                state = res.state;
                // Add the toss information to the outputed array.
                halfCompletedTosses.push(res.halfCompletedToss);
            }
        }

        // Now we go for all balls in order.
        for (const toss of tosses) {
            const fromRightHand = toss.from.hand === "R";
            const tossHand = state.held[fromRightHand ? 1 : 0];

            let tossedBallIdx: number;
            if (toss.ball === undefined) {
                // If no tossed ball is specified, we need to find it.
                // By default, it is the last one in the hand list.
                if (tossHand.length === 0) {
                    this.logError(
                        beat,
                        "Error",
                        `Can't toss ball from the ${fromRightHand ? "right" : "left"} hand as there are no balls.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinues without tossing a ball.`
                    );
                    continue;
                }
                tossedBallIdx = tossHand.length - 1;
            } else {
                let ballName: string;
                if ("id" in toss.ball) {
                    // This happens if previously the ball couldn't be found.
                    // So now, we try to throw any ball that would match.
                    ballName = this.ballIDMap.get(toss.ball.id)!;
                } else {
                    // Only the template name of the ball has been provided.
                    ballName = toss.ball.name;
                }
                // We need to find a ball with the matching note in hand.
                const matchingBallsIdx: number[] = [];
                for (let ballIdx = 0; ballIdx < tossHand.length; ballIdx++) {
                    const ballID = tossHand[ballIdx];
                    if (this.ballIDMap.get(ballID) === ballName) {
                        matchingBallsIdx.push(ballIdx);
                    }
                }
                if (matchingBallsIdx.length === 0) {
                    // No ball in hand match the template.
                    this.logError(
                        beat,
                        "Error",
                        `Can't toss ball ${stringifyBall(toss.ball)} from the ${fromRightHand ? "right" : "left"} hand as it is not there.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinues without tossing a ball.`
                    );
                    continue;
                }

                tossedBallIdx = matchingBallsIdx[matchingBallsIdx.length - 1];

                if (matchingBallsIdx.length > 1) {
                    // Multiple balls in hand match the template.
                    this.logError(
                        beat,
                        "Warn",
                        `Multiple balls ${stringifyBall(toss.ball)} can be thrown from the ${fromRightHand ? "right" : "left"}. This ambiguity may have consequences later.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nProceeds by choosing ball ${stringifyBall(tossHand[tossedBallIdx])}.`
                    );
                }
            }

            const res = handleBall(tossHand[tossedBallIdx], tossedBallIdx, toss, state);
            state = res.state;
            // Add the toss information to the outputed array.
            halfCompletedTosses.push(res.halfCompletedToss);
        }
        return { tosses: halfCompletedTosses, state: state };
    }

    // TODO : document that state is not copied ?
    // TODO : Lefthand / Righthand : make Array. It is simpler to manipulate.
    // and document the convention that left cell = left, right cell = right.
    // TODO : Unify some of the behaviour here with tossBalls ?
    //TODO : CHECK WE HANDLE BALLS FROM END OF LIST TO START (same order as toss).
    swapBalls(
        beat: Fraction,
        state: JugglerState,
        handsSetup: HandsInstructions
    ): { state: JugglerState; handMoves: MoveBall[] } {
        // TODO : Better error messages. Indicate state ?
        // TODO : Take into consideration we may want to put multiple balls of the same name on different spots.
        // TODO : Have a spot for unknown balls common to the case where there is a table and there is not ?

        state = cloneState(state);

        // Flag to indicate if the user has a table or not.
        const tableAllowed = state.table !== undefined;

        // Keep track of all ball movements.
        // The "because" attribute indicates if the ball was moved because of
        // handsSetup.place or handsSetup.have. (useful to not move a ball twice).
        const movedBalls = new Map<
            string,
            { from: LocType; to: LocType; because: "place" | "have" }
        >();

        // Keep track and query where balls are by ID or template name.
        const ballsLocation = new BallsLocation(state, this.ballIDMap, this.tableSpots);

        // 1. Put all balls that have been specified to go on the table
        if (!tableAllowed && handsSetup.place !== undefined && handsSetup.place.length > 0) {
            this.logError(
                beat,
                "Error",
                `Can't put balls on a table as no table as been specified for this juggler. Continue without putting any ball.`
            );
        } else if (handsSetup.place !== undefined) {
            for (const putBall of handsSetup.place) {
                let handIdx: number;
                let ballID: string;
                let ballIdx: number;
                let ballName: string;
                let spotName: string | undefined;

                if ("id" in putBall) {
                    // An ID to find the ball has been specified.
                    // We need to search in which hand that ball is.
                    const ballLoc = ballsLocation.findBallIDLocation(putBall.id);
                    if (ballLoc?.type === "held") {
                        handIdx = ballLoc.handIdx;
                        ballIdx = ballLoc.ballIdx;
                        ballID = putBall.id;
                        ballName = this.ballIDMap.get(ballID)!;
                    } else {
                        // Ball is found is neither hands.
                        this.logError(
                            beat,
                            "Error",
                            `Can't find ball ${putBall.id} in hands to put on the table.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinue without putting that ball.`
                        );
                        continue;
                    }
                } else {
                    // The ball is defined by its template name.
                    const matchingBallsInHands = ballsLocation.findBallTemplateNameInHands(
                        putBall.name
                    );

                    // Choose which ball should be put on the table : First compute the hand
                    if (putBall.fromHand !== undefined) {
                        handIdx = putBall.fromHand === "left" ? 0 : 1;
                    } else if (
                        matchingBallsInHands[0].size === 0 &&
                        matchingBallsInHands[1].size === 0
                    ) {
                        // If no hand holds the requested ball, we error that situation.
                        this.logError(
                            beat,
                            "Warn",
                            `Can't put a ball ${putBall.name} onto the table ${putBall.toSpot === undefined ? "" : `on spot ${putBall.toSpot} `}as none is found in hands.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinue without putting that ball.`
                        );
                        continue;
                    } else if (
                        matchingBallsInHands[0].size > 0 &&
                        matchingBallsInHands[1].size > 0
                    ) {
                        // If the ball has been found in both hands, we arbitrarily take the left hand.
                        handIdx = 0;
                        this.logError(
                            beat,
                            "Warn",
                            `Ambiguity while putting ball ${putBall.name} onto the table ${putBall.toSpot === undefined ? "" : `on spot ${putBall.toSpot} `}as it is found in both hands.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinue by choosing the left hand.`
                        );
                    } else {
                        // The ball has only been found in one hand, so we pick it.
                        handIdx = matchingBallsInHands[0].size > 0 ? 0 : 1;
                    }

                    // Choose which ball should be put on the table : Now compute the ball.
                    if (matchingBallsInHands[handIdx].size === 0) {
                        // If the hand does not have the requested ball, issue warning and carry on.
                        this.logError(
                            beat,
                            "Warn",
                            `Can't put a ball ${putBall.name} onto the table ${putBall.toSpot === undefined ? "" : `on spot ${putBall.toSpot} `}${putBall.fromHand === undefined ? "" : `from the ${putBall.fromHand} hand `}as none is held.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinue without putting that ball.`
                        );
                        continue;
                    }

                    ballID = getLastInsertedKey(matchingBallsInHands[handIdx])!;
                    ballIdx = matchingBallsInHands[handIdx].get(ballID)!;
                    ballName = putBall.name;
                    if (matchingBallsInHands[handIdx].size > 1) {
                        // If the hand has multiple balls to choose from, arbitrarily take the most recent one and issue a warning.
                        this.logError(
                            beat,
                            "Warn",
                            `Ambiguity while putting ball ${putBall.name} onto the table ${putBall.toSpot === undefined ? "" : `on spot ${putBall.toSpot} `}${putBall.fromHand === undefined ? "" : `from the ${putBall.fromHand} hand `}as it is found multiple times.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinue by putting the most recently received ball, ie ${stringifyBall(ballID)}.`
                        );
                    }
                }

                // Determine the spot to put the ball on.
                // Find the free unoccupied requested ball spot on the table.

                const freeTableSpots = ballsLocation.findFreeTableSpotsByTemplateName(ballName);

                // Compute the spot on which to put the ball.
                if (freeTableSpots.size === 0) {
                    // If all spots the ball could be put on are occupied, put the ball in the unkown table spot.
                    spotName = undefined;
                    this.logError(
                        beat,
                        "Warn",
                        `All spots where ball ${stringifyBall(ballID)} could go are occupied. ${putBall.toSpot === undefined ? "" : `Can't put in on user-defined "${putBall.toSpot}" spot. `}\nContinue by putting ball anywhere on the table.`
                    );
                } else if (putBall.toSpot !== undefined) {
                    const ballOnSpot = ballsLocation.getBallInSpot(putBall.toSpot);
                    if (ballOnSpot !== undefined) {
                        // The spot has been specified by the user, but it is already occupied on the table.
                        // Take the first available spot instead.
                        spotName = getFirstInsertedKey(freeTableSpots)!;
                        this.logError(
                            beat,
                            "Error",
                            `Can't put ball ${stringifyBall(ballID)} on user-defined "${putBall.toSpot}" spot as it is already occupied by ball ${stringifyBall(ballOnSpot)}.\nContinue by putting it on spot "${spotName}".`
                        );
                    } else {
                        // The spot has been specified by the user, and it is available.
                        spotName = putBall.toSpot;
                    }
                } else {
                    // No spot has been specified by the user, so take the first free available spot.
                    spotName = getFirstInsertedKey(freeTableSpots)!;
                }

                // Put the ball on the table.
                const moveFromLoc: LocType = { type: "held", ballIdx: ballIdx, handIdx: handIdx };
                const moveToLoc: LocType =
                    spotName === undefined
                        ? { type: "onTableUnknownSpot" }
                        : { type: "onTableSpot", spotName: spotName };

                movedBalls.set(ballID, { from: moveFromLoc, to: moveToLoc, because: "place" });
                // Act the fact that the ball is on the table, but don't disturb the previous' state
                // indices.
                ballsLocation.putBallNoIdxChange(ballID, spotName);
            }
        }

        // 2. If no new hands are specified, we stop there. TODO
        if (handsSetup.have === undefined) {
            // Prepare the returned state.
            state = updateHeldOfState(state, movedBalls, handsSetup);
            state = updateTableOfState(state, movedBalls);
            const handMoves: MoveBall[] = [];
            for (const [ballID, move] of movedBalls) {
                handMoves.push({ id: ballID, from: move.from, to: move.to });
            }
            return {
                state: state,
                handMoves: handMoves
            };
        }

        // 3. New hand contents has been specified. (by the ball template name or ball ID)
        // We need to compute the IDs of all those balls.
        // We do that by trying to minimize the "number of balls that have to move" to satisfy this new hand.
        // More precisely, we want in order in priority to move balls :
        // - from the table if they have a user defined "take from" spot.
        // - don't move it if it remains in the same hand, in the same position.
        // - from the same hand if there was one ball there already.
        // - from the other hand if there was one ball there already.
        // - from the table, in an existing spot if possible, else from unnamed spots.

        // We also need, for all balls in old hands that do not find themselves in the new hands,
        // to put them on the table.

        // Create variables to keep track of which balls have been handled and which
        // have not yet. "undefined" means the exact ball hasn't been computed.

        //TODO : Cleanup unused variables
        //TODO : Checks for if ball has been moved already ? / How to handle a ball that's already been moved.

        // const oldHandsContents = [
        //     Array<SimulatorTakeBall | undefined>(state.held[0].length).fill(undefined),
        //     Array<SimulatorTakeBall | undefined>(state.held[1].length).fill(undefined)
        // ];

        // Keep track of which ball in the new hands have found their true ID ball already.
        const unhandledBallsInNewHands = new Set<{
            info: TakeBall;
            handIdx: number;
            ballIdx: number;
        }>();

        for (let handIdx = 0; handIdx < 2; handIdx++) {
            for (let ballIdx = 0; ballIdx < handsSetup.have[handIdx].length; ballIdx++) {
                unhandledBallsInNewHands.add({
                    info: handsSetup.have[handIdx][ballIdx],
                    handIdx,
                    ballIdx
                });
            }
        }

        // From now on, we won't move the balls in ballsLocation until we've computed where every ball comes from.

        const addBallToMoves = (
            ballID: string,
            toLoc: LocType,
            movedBalls: Map<
                string,
                {
                    from: LocType;
                    to: LocType;
                    because: "place" | "have";
                }
            >
        ): void => {
            let moveFrom: LocType;
            if (movedBalls.has(ballID)) {
                const move = movedBalls.get(ballID)!;
                moveFrom = move.from;
                if (move.because === "place") {
                    //TODO : Handle in earlier place phase duplicate ID.
                    this.logError(
                        beat,
                        "Warn",
                        `Ball ${ballID} was deliberately placed on the table, but is required elsewhere, so it will directly go there.`
                    );
                } else {
                    this.logError(
                        beat,
                        "Error",
                        `Ball ${ballID} is required in two different places.`
                    );
                }
            } else {
                moveFrom = ballsLocation.findBallIDLocation(ballID)!;
            }

            movedBalls.set(ballID, {
                from: moveFrom,
                to: toLoc,
                because: "have"
            });
        };

        function updateTableOfState(
            state: JugglerState,
            movedBalls: Map<
                string,
                {
                    from: LocType;
                    to: LocType;
                    because: "place" | "have";
                }
            >
        ): JugglerState {
            state = cloneState(state);
            if (state.table !== undefined) {
                for (const [ballID, move] of movedBalls) {
                    if (move.from.type === "onTableSpot") {
                        state.table.namedSpot.delete(move.from.spotName);
                    } else if (move.from.type === "onTableUnknownSpot") {
                        state.table.unknown.delete(ballID);
                    }
                    if (move.to.type === "onTableSpot") {
                        state.table.namedSpot.set(move.to.spotName, ballID);
                    } else if (move.to.type === "onTableUnknownSpot") {
                        state.table.unknown.add(ballID);
                    }
                }
            }
            return state;
        }

        // TODO : Rework the "id" in ball As it is error-prone if ball.id === undefined from an earlier wrong copy :X
        function updateHeldOfState(
            state: JugglerState,
            movedBalls: Map<
                string,
                {
                    from: LocType;
                    to: LocType;
                    because: "place" | "have";
                }
            >,
            handsSetup: HandsInstructions
        ): JugglerState {
            state = cloneState(state);
            if (handsSetup.have === undefined) {
                // We've only placed balls on the table.
                state.held = ballsLocation.reconstructHeldState();
                return state;
            }
            // Construct the new hands with ball IDs, to contruct the whole new state.
            // We will add one by one the ball IDs in their respective spot.
            const newHeldState: [(string | undefined)[], (string | undefined)[]] = [
                Array<string | undefined>(handsSetup.have[0].length).fill(undefined),
                Array<string | undefined>(handsSetup.have[0].length).fill(undefined)
            ];
            for (const [ballID, move] of movedBalls) {
                if (move.to.type === "held") {
                    newHeldState[move.to.handIdx][move.to.ballIdx] = ballID;
                }
            }
            // If some spot is still left undefined, it means we haven't provided it with a ballID.
            // so we need to filter it out and adjust subsequent ball indices.
            state.held = [[], []];
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                let ballIdx = 0;
                for (const ballID of newHeldState[handIdx]) {
                    if (ballID !== undefined) {
                        state.held[handIdx].push(ballID);
                        const move = movedBalls.get(ballID)!; // All balls in newhands have moved.
                        if (move.to.type === "held") {
                            move.to.ballIdx = ballIdx;
                        }
                        ballIdx++;
                    }
                }
            }
            return state;
        }

        // 3.1 Handle all balls specified by their ID.
        for (const have of unhandledBallsInNewHands) {
            if ("id" in have.info) {
                addBallToMoves(
                    have.info.id,
                    { type: "held", ballIdx: have.ballIdx, handIdx: have.handIdx },
                    movedBalls
                );
                unhandledBallsInNewHands.delete(have);
            }
        }

        // 3.2 Handle all balls specified by name with a dedicated take from spot.
        for (const have of unhandledBallsInNewHands) {
            if ("fromSpot" in have.info && have.info.fromSpot !== undefined) {
                if (!tableAllowed) {
                    this.logError(
                        beat,
                        "Error",
                        "TODO. No table has been specified for juggler to take the ball from. Continue without taking the ball from that spot."
                    );
                    continue;
                }
                const ballOnSpot = ballsLocation.getBallInSpot(have.info.fromSpot);
                if (ballOnSpot === undefined) {
                    this.logError(beat, "Error", "TODO. Can't take ball from designated spot.");
                    continue;
                }
                addBallToMoves(
                    ballOnSpot,
                    { type: "held", ballIdx: have.ballIdx, handIdx: have.handIdx },
                    movedBalls
                );
                unhandledBallsInNewHands.delete(have);
            }
        }

        // 3.3 Handle all balls that have a matching ball name in the same hand.
        for (const have of unhandledBallsInNewHands) {
            // We voluntarily lose the "id" information as it couldn't be handled earlier.
            const ballName = "id" in have.info ? this.ballIDMap.get(have.info.id)! : have.info.name;
            for (const [heldBallID] of ballsLocation.findBallTemplateNameInHand(
                ballName,
                have.handIdx
            )) {
                if (!movedBalls.has(heldBallID)) {
                    // We have found an available ball in hand that hasn't been processed yet.
                    addBallToMoves(
                        heldBallID,
                        { type: "held", ballIdx: have.ballIdx, handIdx: have.handIdx },
                        movedBalls
                    );
                    unhandledBallsInNewHands.delete(have);
                    break;
                }
            }
        }

        // 3.4 Handle all balls that have a matching ball name in the other hand.
        for (const have of unhandledBallsInNewHands) {
            const ballName = "id" in have.info ? this.ballIDMap.get(have.info.id)! : have.info.name;
            for (const [heldBallID] of ballsLocation.findBallTemplateNameInHand(
                ballName,
                (have.handIdx + 1) % 2
            )) {
                if (!movedBalls.has(heldBallID)) {
                    // We have found an available ball in hand that hasn't been processed yet.
                    addBallToMoves(
                        heldBallID,
                        { type: "held", ballIdx: have.ballIdx, handIdx: have.handIdx },
                        movedBalls
                    );
                    unhandledBallsInNewHands.delete(have);
                    break;
                }
            }
        }

        // 3.5 Handle the rest of the balls to be taken from the table.
        if (tableAllowed) {
            for (const have of unhandledBallsInNewHands) {
                const ballName =
                    "id" in have.info ? this.ballIDMap.get(have.info.id)! : have.info.name;
                const tableSpots = ballsLocation.findOccupiedTableSpotsByTemplateName(ballName);
                // First look for the balls in named spots, then for balls in unnamed spots.
                for (const ballID of [...tableSpots.named.values(), ...tableSpots.unnamed.keys()]) {
                    if (!movedBalls.has(ballID)) {
                        // We have found an available ball on the table that hasn't been processed yet.
                        addBallToMoves(
                            ballID,
                            { type: "held", ballIdx: have.ballIdx, handIdx: have.handIdx },
                            movedBalls
                        );
                        unhandledBallsInNewHands.delete(have);
                        break;
                    }
                    // If not found, we'll error out later.
                }
            }
        }

        // 3.6 Error out if any balls are left unhandled.
        for (const have of unhandledBallsInNewHands) {
            const ballName = "id" in have.info ? this.ballIDMap.get(have.info.id)! : have.info.name;
            this.logError(
                beat,
                "Error",
                `Too few balls "${ballName}" are available in hands${tableAllowed ? " and on table" : ""}, so can't have one in the ${have.handIdx === 0 ? "left" : "right"}, position ${have.ballIdx}.\nRight hand contained : [${stringifyHand(state.held[0])}].\nLeft hand contained : [${stringifyHand(state.held[1])}].${!tableAllowed ? "" : "\nTable contained: " + stringifyTable(state.table!) + "."}\nTODO : new hand ? Continue withtout taking that ball.`
            );
        }

        // 3.7 If any balls in the old hands are unprocessed, put them on the table.
        const heldBalls = ballsLocation.reconstructHeldState();
        for (let handIdx = 0; handIdx < 2; handIdx++) {
            for (const ballID of heldBalls[handIdx]) {
                if (!movedBalls.has(ballID)) {
                    if (!tableAllowed) {
                        this.logError(
                            beat,
                            "Error",
                            `TODO. Ball left in hands is unhandled. Skips moving it.`
                        );
                        continue;
                    }
                    // Find a free spot.
                    const spotName = getFirstInsertedKey(
                        ballsLocation.findFreeTableSpotsByTemplateName(this.ballIDMap.get(ballID)!)
                    );
                    let moveTo: LocType;
                    if (spotName !== undefined) {
                        moveTo = { type: "onTableSpot", spotName: spotName };
                    } else {
                        this.logError(
                            beat,
                            "Warn",
                            `Can't put ball ${stringifyBall(ballID)} in a named table spot as all spots are already occupied.\nContinue by putting it at a default position on the table.`
                        );
                        moveTo = { type: "onTableUnknownSpot" };
                    }
                    addBallToMoves(ballID, moveTo, movedBalls);
                    ballsLocation.putBallNoIdxChange(ballID, spotName);
                }
            }
        }

        // Construct the table state.
        state = updateHeldOfState(state, movedBalls, handsSetup);
        state = updateTableOfState(state, movedBalls);
        const handMoves: MoveBall[] = [];
        for (const [ballID, move] of movedBalls) {
            handMoves.push({ id: ballID, from: move.from, to: move.to });
        }
        return {
            state: state,
            handMoves: handMoves
        };
    }

    processEvent(
        eventIdx: number,
        state: JugglerState
    ): {
        tosses: HalfCompletedToss[];
        catches: CompleteCatch[];
        state: JugglerState;
        handsInstructions?: MoveBall[];
        tempo: Fraction;
    } {
        const { setupHands, tempo, beat } = this.events[eventIdx];

        // 1. Catch all balls that are to be caught.
        const res1 = this.descendAirborneBalls(beat, state);
        state = res1.state;

        // 2. prepare the hands by placing the necessary balls on the table, and
        // setting up the hands with the contents they must have.
        let handsInstructions: MoveBall[] | undefined = undefined;
        if (setupHands !== undefined) {
            const res2 = this.swapBalls(beat, state, setupHands);
            state = res2.state;
            handsInstructions = res2.handMoves;
        }

        // 3. Toss the balls that need to be tossed.
        const res3 = this.tossBalls(state, eventIdx);

        // Return relevant information.
        return {
            tosses: res3.tosses,
            catches: res1.catches,
            state: res3.state,
            handsInstructions,
            tempo
        };
    }

    //TODO : this.events CANT BE EMPTY.

    /**
     * Add to the state the tosses this or other jugglers made.
     *
     * **Note :** This does not mean catching the balls, but adding them to the airborne balls.
     * @param tosses a liste of tosses to add.
     * @param state the state before adding the tosses.
     * @returns the state with the tosses added to airborne balls, and the completed toss information.
     */
    addTossesToState(tosses: HalfCompletedToss[], state: JugglerState): JugglerState {
        // Clone the state first.
        state = cloneState(state);

        const completedTosses: SymbolicToss<Fraction>[] = [];
        for (const toss of tosses) {
            // The only unknown left on the tosses is possibly the hand in which they are caught.
            let toRightHand: boolean;
            if (toss.to.hand === "L") {
                toRightHand = false;
            } else if (toss.to.hand === "R") {
                toRightHand = true;
            } else {
                // We need to determine the catching hand if it is "x" or undefined.
                // To do so, we need the information of the event just before the catch happens.
                let prevEventIdx: number;
                if (toss.to.beat.lte(this.events[0].beat)) {
                    // The toss if caught before the first event.
                    // Use the first event information about tempo / defautHand.
                    prevEventIdx = 0;
                } else if (toss.to.beat.gte(this.events[this.events.length - 1].beat)) {
                    // The toss is caught after the last event.
                    prevEventIdx = this.events.length - 1;
                } else {
                    // Thanks to previous checks, findIndex won't return -1.
                    prevEventIdx = this.events.findIndex(({ beat }) => beat.gt(toss.to.beat)) - 1;
                }

                const { beat: evBeat, tempo, defaultHand } = this.events[prevEventIdx];
                const nbSteps = evBeat.sub(toss.to.beat).div(tempo);

                // Compute catching hand.
                if (toss.to.hand === undefined) {
                    toRightHand = !XOR(nbSteps.floor().divisible(2), defaultHand === "R");
                } else {
                    // The catching hand is "x".
                    toRightHand = XOR(nbSteps.floor().divisible(2), defaultHand === "R");
                }

                // Check if the ball is caught in rhythm or not.
                if (!nbSteps.divisible(1)) {
                    // The catch does not happen on a regular siteswap rhythm.
                    // We consider the catching hand is the one from the previous valid beat.
                    const prevBeat = evBeat.add(tempo).mul(nbSteps.floor());
                    this.logError(
                        toss.to.beat,
                        "Error",
                        `Ball ${stringifyBall(toss.ballID)} is caught off-beat.\n${this.jugglerName}'s previous beat: ${prevBeat.toString()}.\nBall caught beat: ${toss.to.beat.toString()}.\nNext beat: ${toss.to.beat}.\nContinue by catching the ball in the ${toRightHand ? "right" : "left"} hand which is the default one from the previous beat.`
                    );
                }
            }

            // Add the ball to the airborne state.
            state.airborne.set(toss.ballID, {
                catchBeat: toss.to.beat,
                tossBeat: toss.from.beat,
                toRightHand: toRightHand
            });
        }
        return state;
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

export type SpotName = string;
export type BallTemplateName = string;

type TmpBallLoc = {
    tableSpots: {
        occupied: {
            named: Map<SpotName, BallID>;
            unnamed: Set<BallID>;
        };
        unoccupied: Set<SpotName>;
    };
    oldHands: [Map<BallID, number>, Map<BallID, number>];
    // airborne: Map<
    //     string,
    //     {
    //         toRightHand: boolean;
    //         catchBeat: Fraction;
    //         tossBeat: Fraction;
    //     }
    // >;
};

class BallsLocation {
    /**
     * A map where keys are accepted ball templates and values are made of
     * - tableSpots.named : a map of all spots existing on the table and whether they contain a ball or not.
     * - tableSpots.unnamed: a list of all balls that are not on a spot.
     * - oldHands: a list
     */
    private ballLocationBySound = new Map<BallTemplateName, TmpBallLoc>();
    private handsState: [(string | undefined)[], (string | undefined)[]];
    private ballIDMap: Map<BallID, BallTemplateName>;
    private tableSpots: Map<SpotName, BallTemplateName>;

    constructor(
        state: JugglerState,
        ballIDMap: Map<string, string>,
        tableSpots: Map<string, string>
    ) {
        this.ballIDMap = ballIDMap;
        this.tableSpots = tableSpots;
        this.handsState = [[...state.held[0]], [...state.held[1]]];

        // Fill in hands map.
        for (let handIdx = 0; handIdx < 2; handIdx++) {
            for (let ballIdx = 0; ballIdx < state.held[handIdx].length; ballIdx++) {
                const ballID = state.held[handIdx][ballIdx];
                const ballTemplateName = ballIDMap.get(ballID)!;
                if (!this.ballLocationBySound.has(ballTemplateName)) {
                    this.ballLocationBySound.set(ballTemplateName, this.createEmptyEntry());
                }
                this.ballLocationBySound
                    .get(ballTemplateName)!
                    .oldHands[handIdx].set(ballID, ballIdx);
            }
        }

        // Fill in airborne map.
        // for (const [ballID, airborneInfo] of state.airborne) {
        //     const ballTemplateName = ballIDMap.get(ballID)!;
        //     if (!this.ballLocationBySound.has(ballTemplateName)) {
        //         this.ballLocationBySound.set(ballTemplateName, this.createEmptyEntry());
        //     }
        //     this.ballLocationBySound.get(ballTemplateName)!.airborne.set(ballID, airborneInfo);
        // }

        // Fill in table map with named spots.
        if (state.table === undefined) {
            return;
        }
        for (const [spotName, acceptedBallTemplate] of tableSpots) {
            const ballOnSpot = state.table.namedSpot.get(spotName);
            if (!this.ballLocationBySound.has(acceptedBallTemplate)) {
                this.ballLocationBySound.set(acceptedBallTemplate, this.createEmptyEntry());
            }
            if (ballOnSpot === undefined) {
                this.ballLocationBySound
                    .get(acceptedBallTemplate)!
                    .tableSpots.unoccupied.add(spotName);
            } else {
                this.ballLocationBySound
                    .get(acceptedBallTemplate)!
                    .tableSpots.occupied.named.set(spotName, ballOnSpot);
            }
        }
        // Fill in table map with unnamed spots.
        for (const ballID of state.table.unknown) {
            const ballTemplateName = ballIDMap.get(ballID)!;
            if (!this.ballLocationBySound.has(ballTemplateName)) {
                this.ballLocationBySound.set(ballTemplateName, this.createEmptyEntry());
            }
            this.ballLocationBySound.get(ballTemplateName)!.tableSpots.occupied.unnamed.add(ballID);
        }
    }

    private createEmptyEntry(): TmpBallLoc {
        return {
            tableSpots: {
                occupied: { named: new Map<string, string>(), unnamed: new Set<string>() },
                unoccupied: new Set<string>()
            },
            oldHands: [new Map<string, number>(), new Map<string, number>()]
            // airborne: new Map<
            //     string,
            //     {
            //         toRightHand: boolean;
            //         catchBeat: Fraction;
            //         tossBeat: Fraction;
            //     }
            // >()
            // newHands: [[], []]
        };
    }

    findBallIDLocation(ballID: string): LocType | null {
        const ballTemplateName = this.ballIDMap.get(ballID);
        if (ballTemplateName === undefined) {
            return null;
        }
        const places = this.ballLocationBySound.get(ballTemplateName);
        if (places === undefined) {
            return null;
        }
        const leftMatch = places.oldHands[0].get(ballID);
        if (leftMatch !== undefined) {
            return { type: "held", handIdx: 0, ballIdx: leftMatch };
        }
        const rightMatch = places.oldHands[1].get(ballID);
        if (rightMatch !== undefined) {
            return { type: "held", handIdx: 1, ballIdx: rightMatch };
        }
        if (places.tableSpots.occupied.unnamed.has(ballID)) {
            return { type: "onTableUnknownSpot" };
        }
        for (const [spotName, ballOnSpot] of places.tableSpots.occupied.named) {
            if (ballOnSpot === ballID) {
                return { type: "onTableSpot", spotName: spotName };
            }
        }
        return null;
    }

    findBallTemplateNameInHands(
        ballTemplateName: string
    ): [Map<string, number>, Map<string, number>] {
        return (
            this.ballLocationBySound.get(ballTemplateName)?.oldHands ?? [
                new Map<string, number>(),
                new Map<string, number>()
            ]
        );
    }

    findBallTemplateNameInHand(ballTemplateName: string, handIdx: number): Map<string, number> {
        return (
            this.ballLocationBySound.get(ballTemplateName)?.oldHands[handIdx] ??
            new Map<string, number>()
        );
    }

    findOccupiedTableSpotsByTemplateName(ballTemplateName: string): {
        named: Map<string, BallID>;
        unnamed: Set<BallID>;
    } {
        return (
            this.ballLocationBySound.get(ballTemplateName)?.tableSpots.occupied ?? {
                named: new Map(),
                unnamed: new Set()
            }
        );
    }

    /**
     * Find all unoccupied spots on the table.
     * @param ballTemplateName the name of the ball template.
     * @returns an array of all spot names that have no ball, in the order they were defined in.
     */
    findFreeTableSpotsByTemplateName(ballTemplateName: string): Set<string> {
        return this.ballLocationBySound.get(ballTemplateName)?.tableSpots.unoccupied ?? new Set();
    }

    getBallInSpot(spotName: string): string | undefined {
        const ballName = this.tableSpots.get(spotName);
        if (ballName === undefined) {
            return undefined;
        }
        return this.ballLocationBySound.get(ballName)?.tableSpots.occupied.named.get(spotName);
    }

    // getBallInHands(handIdx: number, ballIdx: number): string | undefined {
    //     if (ballIdx >= this.handsState[handIdx].length) {
    //         return undefined;
    //     }
    //     return this.handsState[handIdx][ballIdx];
    // }

    //Document that this is to put balls on table without changing handIdx.
    putBallNoIdxChange(ballID: string, spotName?: string): void {
        // Handle the ballLocationBySound AND the state (they need to be kept in sync).

        const moveFrom = this.findBallIDLocation(ballID);
        if (moveFrom === null || moveFrom.type !== "held") {
            throw Error("Ball must be held to be put on table.");
        }

        // Put the ball in its new location.
        const ballName = this.ballIDMap.get(ballID)!;
        const templateLoc = this.ballLocationBySound.get(ballName)!;

        // Remove the ball from its previous location.
        templateLoc.oldHands[moveFrom.handIdx].delete(ballID);
        this.handsState[moveFrom.handIdx][moveFrom.ballIdx] = undefined;
        if (spotName !== undefined) {
            // Move the ball to a named spot, but check it accepts the correct type of balls.
            if (ballName !== this.tableSpots.get(spotName)) {
                throw Error("Can't put ball in a spot that doesn't accept balls of that kind.");
            }
            templateLoc.tableSpots.unoccupied.delete(spotName);
            templateLoc.tableSpots.occupied.named.set(spotName, ballID);
        } else {
            templateLoc.tableSpots.occupied.unnamed.add(ballID);
        }
    }

    getBallNames(): MapIterator<string> {
        return this.ballLocationBySound.keys();
    }

    reconstructTableState(): JugglerState["table"] {
        const tableState = {
            namedSpot: new Map<string, BallID>(),
            unknown: new Set<BallID>()
        };

        for (const { tableSpots } of this.ballLocationBySound.values()) {
            for (const [spotName, ballID] of tableSpots.occupied.named) {
                tableState.namedSpot.set(spotName, ballID);
            }
            for (const ballID of tableSpots.occupied.unnamed) {
                tableState.unknown.add(ballID);
            }
        }
        return tableState;
    }

    reconstructHeldState(): JugglerState["held"] {
        // Since some positions may have a ball undefined (see putBallNoIdxChange method for why),
        // we need to filter them out.
        const heldState: [string[], string[]] = [[], []];

        for (let handIdx = 0; handIdx < 2; handIdx++) {
            for (const ballID of this.handsState[handIdx]) {
                if (ballID !== undefined) {
                    heldState[handIdx].push(ballID);
                }
            }
        }
        return heldState;
    }
}

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

// /**
//  * Checks whether an array has only non-undefined elements, which typescript will know about.
//  * @param array the array to check.
//  * @returns whether the array has no undefined values or not.
//  */
// export function hasNoUndefined<T>(array: (T | undefined)[]): array is T[] {
//     for (const elem of array) {
//         if (elem === undefined) {
//             return false;
//         }
//     }
//     return true;
// }

// /**
//  * Find the key that was inserted last in a map.
//  * @param map the map in question.
//  * @returns undefined if the map is empty, otherwise the lastly inserted element in the form [key, value].
//  */
// export function getLastInsertedInMap<KeyType, ValueType>(
//     map: Map<KeyType, ValueType>
// ): [KeyType, ValueType] | undefined {
//     // We use the fact that maps in JS preserve insertion order.
//     let element: [KeyType, ValueType] | undefined = undefined;
//     for (element of map);
//     return element;
// }
