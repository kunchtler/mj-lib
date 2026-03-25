import Fraction from "fraction.js";
import {
    indentString,
    stringifyBall,
    stringifyHand,
    stringifyTable
} from "../utils/stringifyEvent";
import { FracTimedErrorLogger, Severity, TimedErrorLogger } from "../utils/TimedErrorLogger";
import { HandsInstructions, SetupBall } from "./PerformanceDescription";
import { getLastInsertedKey, getFirstInsertedKey } from "../utils/Operations";
import { LocalBeatConverter } from "./LocalBeatConverter";
import { DeepRequired, setDifference } from "../utils";
import { computeMunkres } from "../utils/hungarianAlgorithm";

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
// Answer 2 : the events post parser, but without completing tempo / default hand everywhere
// (indeed,changing one somewhere would change all that comes after). But completing so that
// no element is undefined is fine.
// So we should have a function that returns that. And this really is the result from parsing... the score !!
// Answer 3 : the events post scheduler (don't care necessarily about having access to the fully
// compleated one, but we could just in case have a function for taht.)
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
    errorLogger: FracTimedErrorLogger;
    events: SchedulerEvent[];
    localBeatConverter: LocalBeatConverter;
};

export type SchedulerEvent = {
    globalBeat: Fraction;
    tosses: SchedulerToss[];
    setupHands?: HandsInstructions;
};

export type SchedulerToss = {
    from: { handIdx: number };
    to: {
        juggler: string;
        handIdx: number;
        globalBeat: Fraction;
    };
    ball?: { id: BallID } | { name: BallName };
    mode: TossMode;
};

export type BallID = string;
export type BallName = string;

/**
 * Siteswap height information about the toss if it exists, or the beat it should be caught at.
 */
export type TossMode =
    | {
          type: "Beat";
          beat: Fraction; // This is ABSOLUTE GLOBAL BEAT
      }
    | {
          type: "Height";
          height: number; // This it RELATIVE LOCAL BEAT (with added bonus of hand alternation on toss).
      };

/**
 * A 2-element array  [leftHand, rightHand].
 */
export type Hands<ContentType> = [ContentType[], ContentType[]];

export type SchedulerRes = Map<
    string,
    {
        initialState: JugglerState;
        events: SymbolicEvent<Fraction>[];
        errorLogger: FracTimedErrorLogger;
    }
>;

///////////////////// Scheduler internal types /////////////////////

/**
 * Partially completed information about a toss, halfway through the scheduler.
 * This type is used when jugglers have tossed their balls, but they haven't appeared yet
 * in the airborne state of the jugglers that will catch taht ball.
 */
type HalfCompletedTossInfo = {
    from: SymbolicToss<Fraction>["from"];
    to: Omit<SymbolicToss<Fraction>["to"], "spotIdx">;
    ballID: SymbolicToss<Fraction>["ballID"];
    mode: SymbolicToss<Fraction>["mode"];
};

type HalfCompletedTosses = {
    preHandState: PartialHeldState;
    info: HalfCompletedTossInfo[];
    postHandState: PartialHeldState;
};

type CompleteCatchInfo = { ballID: string; handIdx: number; spotIdx: number };

type CompleteCatches = {
    preHandState: PartialHeldState;
    info: CompleteCatchInfo[];
    postHandState: PartialHeldState;
};

type JugglerCache = {
    state: JugglerState;
    nextEventIdx: number;
};

///////////////////// Symbolic Events Layer types //////////////////////

//TODO : Uniformiser avec LocType ?
//TODO : Make it so what the scheduler takes in and spits out is the same object but fully completed ??
export type SymbolicToss<BeatT> = {
    from: { juggler: string; handIdx: number; spotIdx: number; beat: BeatT };
    to: { juggler: string; handIdx: number; spotIdx: number; beat: BeatT };
    ballID: BallID;
    mode: TossMode;
};

export type PartialHeldState = [(string | undefined)[], (string | undefined)[]];

export type SymbolicEvent<BeatType> = {
    globalBeat: BeatType;
    state: JugglerState;
    setupHands?: {
        preHandState: PartialHeldState;
        moves: MoveBall[];
        postHandState: PartialHeldState;
    };
    catches?: {
        preHandState: PartialHeldState;
        info: SymbolicToss<BeatType>[];
        postHandState: PartialHeldState;
    };
    tosses?: {
        preHandState: PartialHeldState;
        info: SymbolicToss<BeatType>[];
        postHandState: PartialHeldState;
    };
};

export type MoveBall = { id: BallID; from: LocType; to: LocType };
export type LocType = HeldLoc | TableNamedSpotLoc | TableNamelessSpotLoc;

export type HeldLoc = { type: "held"; handIdx: number; spotIdx: number };
export type TableNamedSpotLoc = { type: "onTableSpot"; spotName: string };
export type TableNamelessSpotLoc = { type: "onTableUnknownSpot" };

//TODO : Document that by default hands have LIFO structure.
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
// TODO : This is simple enough it could be a function, not a class !!!
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
            localBeatConverter: LocalBeatConverter;
        }
    >;

    constructor({ jugglers, ballIDMap }: SchedulerParams) {
        this.jugglers = new Map();

        // Setup one JugglerManager per juggler.
        for (const [
            jugglerName,
            { events, initialState, tableSpots, errorLogger, localBeatConverter }
        ] of jugglers) {
            // Create a manager for each juggler.
            const manager = new JugglerManager(
                jugglerName,
                events,
                ballIDMap,
                errorLogger,
                tableSpots
            );
            this.jugglers.set(jugglerName, {
                manager: manager,
                cache: { state: cloneState(initialState), nextEventIdx: 0 },
                initialState: initialState,
                localBeatConverter
            });
        }
    }

    // TODO : Handle empty juggler event when juggler has to catch with no default hand ???
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
        for (const [jugglerName, { manager, initialState }] of this.jugglers) {
            schedulerResults.set(jugglerName, {
                events: [],
                initialState,
                errorLogger: manager.errorLogger
            });
        }

        // Return early as there is nothing to do.
        if (this.jugglers.size === 0) {
            return schedulerResults;
        }

        // // Add to the returned value the initial state before any toss or other event is made.
        // // Compute the beat of the first ever event.
        // let startingGlobalBeat: Fraction | null = null;
        // for (const [, { cache, manager }] of this.jugglers) {
        //     const firstJugglerBeat = manager.nextBeatOfInterest(0, cache.state);
        //     if (
        //         firstJugglerBeat !== null &&
        //         (startingGlobalBeat === null || firstJugglerBeat.beat.lt(startingGlobalBeat))
        //     ) {
        //         startingGlobalBeat = firstJugglerBeat.beat;
        //     }
        // }
        // if (startingGlobalBeat === null) {
        //     // Should only happen when there is no jugglers, in which case we've returned early.
        //     throw Error("Sanity check, Shouldn't happen.");
        //     // // If there is no first event at all, have 0 as first beat.
        //     // for (const [jugglerName, { cache }] of this.jugglers) {
        //     //     schedulerResults.get(jugglerName)?.timeline.push({
        //     //         beat: new Fraction(0),
        //     //         state: cache.state,
        //     //         unitTime: new Fraction(1)
        //     //     });
        //     // }
        // }
        // // Have as first juggler state beat one in tempo, which is <= the first global beat.
        // // (We need to be before the global state as a jugler may receive a ball before
        // // their first event is processed).
        // for (const [jugglerName, { manager, cache, localBeatConverter }] of this.jugglers) {
        //     if (manager.events.length === 0) {
        //         throw Error("Shouldn't happen");
        //     }
        //     const jugglerStartingLocalBeat = localBeatConverter
        //         .convertGlobalBeatToLocalBeat(manager.events[0].globalBeat)
        //         .sub(1)
        //         .floor();
        //     const jugglerStartingGlobalBeat =
        //         localBeatConverter.convertLocalBeatToGlobalBeat(jugglerStartingLocalBeat);
        //     schedulerResults.get(jugglerName)?.events.push({
        //         globalBeat: jugglerStartingGlobalBeat,
        //         state: cache.state
        //     });
        // }

        // Create a map of balls that have been tossed but not caught.
        // Once caught (notably, once catch information have been computed),
        // this map provides insights on where to add toss info.
        const airborneBalls = new Map<
            string,
            { toss: HalfCompletedTossInfo; resultsIdx: number }
        >();

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

            // For each juggler that may catch a ball (ie, the ones of nextBeatJugglers),
            // gather the balls they catch and complete their respective toss information.
            for (const { name: jugglerName, isEvent } of nextBeatJugglers) {
                const { manager, cache } = this.jugglers.get(jugglerName)!;

                // Descend airborne balls.
                const res = manager.descendAirborneBalls(nextBeatOfInterest, cache.state);

                // Update the cache
                cache.state = res.state;

                if (res.catches !== undefined) {
                    // Complete the information from res.catches with the one recorded in airborneBalls.
                    // (to put together information about tosses and catches).
                    const catches: SymbolicToss<Fraction>[] = [];
                    for (const { ballID, spotIdx, handIdx } of res.catches.info) {
                        const { toss, resultsIdx } = airborneBalls.get(ballID)!;
                        airborneBalls.delete(ballID);

                        // Create the toss.
                        const tossInfo: SymbolicToss<Fraction> = {
                            ballID: ballID,
                            from: toss.from,
                            to: {
                                juggler: toss.to.juggler,
                                handIdx: handIdx,
                                spotIdx: spotIdx,
                                beat: toss.to.beat
                            },
                            mode: toss.mode
                        };

                        // To the juggler that tossed it in the past, complete the toss information.
                        const tossingJugglerEvent = schedulerResults.get(toss.from.juggler)!.events[
                            resultsIdx
                        ];
                        if (tossingJugglerEvent.tosses === undefined) {
                            throw Error("Shouldn't happen.");
                        }
                        tossingJugglerEvent.tosses.info.push(tossInfo);

                        // Record the catch.
                        catches.push(tossInfo);
                    }

                    // Add to the juggler timeline that he caught balls on that beat.
                    // Note how his hands were before and after the catch, as well as the
                    // information about each ball caught (namely, in what hand subspot).
                    addInfoToJugglerTimeline(jugglerName, nextBeatOfInterest, res.state, {
                        catches: {
                            preHandState: res.catches.preHandState,
                            postHandState: res.catches.postHandState,
                            info: catches
                        }
                    });
                }

                // Balls have been caught for this beat, so we can handle all juggler events
                // (ball changes, tosses, ...)
                if (isEvent) {
                    const res = manager.processEvent(cache.nextEventIdx, cache.state);

                    // Update the cache.
                    cache.nextEventIdx++; // Bump the relevant event index.
                    cache.state = res.state; // Update the juggler's state.

                    // If the juggler changed the balls they hold, record the change in their timeline.
                    if (res.setupHands !== undefined) {
                        addInfoToJugglerTimeline(jugglerName, nextBeatOfInterest, res.state, {
                            setupHands: res.setupHands
                        });
                    }
                    // If the juggler tossed balls, record that in their timeline.
                    // But there is on issue : we want to provide complete information about the toss.
                    // (including when and where it would fall), which we can only gather later.
                    if (res.tosses !== undefined) {
                        addInfoToJugglerTimeline(jugglerName, nextBeatOfInterest, res.state, {
                            tosses: {
                                preHandState: res.tosses.preHandState,
                                postHandState: res.tosses.postHandState,
                                info: [] //We'll complete it when the ball is caught.
                            }
                        });

                        // We now reditribute each tossed ball to their destined jugglers.
                        for (const toss of res.tosses.info) {
                            // Add the tossed balls to the catching juggler's airborne state.
                            const { manager: tossManager, cache: tossCache } = this.jugglers.get(
                                toss.to.juggler
                            )!;
                            const res = tossManager.addTossToState(toss, tossCache.state);
                            // Update the cache's state.
                            tossCache.state = res.state;
                            // Update the scheduler's output with the new state.
                            addInfoToJugglerTimeline(
                                toss.to.juggler,
                                nextBeatOfInterest,
                                res.state
                            );

                            // Remember the ball's info to complete it when it will be caught.
                            airborneBalls.set(toss.ballID, {
                                toss,
                                resultsIdx:
                                    schedulerResults.get(toss.from.juggler)!.events.length - 1
                            });
                        }
                    }
                }
            }
        }

        // Print in the console any error that has been encountered.
        // TODO : Remove / Combine all error loggers in one ?
        // for (const { manager } of this.jugglers.values()) {
        //     manager.errorLogger.printErrorsInConsole();
        // }
        return schedulerResults;

        function addInfoToJugglerTimeline(
            jugglerName: string,
            beat: Fraction,
            state: JugglerState,
            info?: Partial<Omit<SymbolicEvent<Fraction>, "state" | "beat" | "unitTime">>
        ) {
            const jugglerTimeline = schedulerResults.get(jugglerName)!.events;
            if (
                jugglerTimeline.length === 0 ||
                jugglerTimeline[jugglerTimeline.length - 1].globalBeat !== beat
            ) {
                // Create the event as it doesn't exist.
                jugglerTimeline.push({
                    globalBeat: beat,
                    state: state
                });
            }
            // Update the event with the provided info.
            jugglerTimeline[jugglerTimeline.length - 1] = {
                ...jugglerTimeline[jugglerTimeline.length - 1],
                state,
                ...info
            };
        }
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
function cloneState<T extends JugglerState | PartialJugglerState>(state: T): T {
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
    } as T;
}

type FromTmp =
    | {
          type: "table";
          spot?: { type: "named"; name?: string } | { type: "unknown" };
      }
    | {
          type: "juggler";
          handIdx?: number;
          spotIdx?: number;
      };

class JugglerManager {
    jugglerName: string;
    events: SchedulerEvent[];
    errorLogger: TimedErrorLogger<Fraction>;
    ballIDMap: Map<BallID, BallTemplateName>;
    tableSpots: Map<SpotName, BallTemplateName>;

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
        tableSpots?: Map<SpotName, BallTemplateName>
    ) {
        this.errorLogger = errorLogger;
        this.jugglerName = name;
        if (events.length === 0) {
            errorLogger.logError({
                severity: "Warn",
                message: `Empty event list for juggler ${this.jugglerName}. Creates a default one.`
            });
            this.events = [
                {
                    globalBeat: new Fraction(0),
                    tosses: []
                }
            ];
        } else {
            this.events = events;
        }
        this.ballIDMap = ballIDMap;
        this.tableSpots = tableSpots ?? new Map<string, string>();
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
        return eventIdx < this.events.length ? this.events[eventIdx].globalBeat : null;
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

    //TODO : Document functions with prevEvent, startBeat etc. Limit side effects. If side effects, document them.

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

    descendAirborneBalls(
        toBeat: Fraction,
        state: JugglerState
    ): {
        state: JugglerState;
        catches?: CompleteCatches;
    } {
        state = cloneState(state);

        // Identify each ball that has been caught by their destination hand.
        const caughtBallsByHand: [BallID[], BallID[]] = [[], []];
        const caughtBallsInfo: CompleteCatchInfo[] = [];

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
                        spotIdx: state.held[handIdx].length - 1
                    });
                }
            }
        }

        if (caughtBallsInfo.length === 0) {
            return { state };
        }

        const preHandState: PartialHeldState = [[...state.held[0]], [...state.held[1]]];
        const postHandState: PartialHeldState = [[...state.held[0]], [...state.held[1]]];
        for (const { handIdx, spotIdx: ballIdx } of caughtBallsInfo) {
            preHandState[handIdx][ballIdx] = undefined;
        }

        return { state, catches: { preHandState, info: caughtBallsInfo, postHandState } };
    }

    /**
     * Tosses all balls that must be tossed.
     * @param state the juggler's state before the toss.
     * @param eventIdx the event specifying all balls to be tossed.
     * @returns the tosses with additional information about them, and the state after the balls have been tossed (but the tossed balls are not yet airborne. The sceduler will handle that later.)
     */
    tossBalls(
        state: JugglerState,
        eventIdx: number
    ): { state: JugglerState; tosses?: HalfCompletedTosses } {
        const { globalBeat, tosses } = this.events[eventIdx];

        state = cloneState(state);

        const halfCompletedTossesInfo: HalfCompletedTossInfo[] = [];
        const unhandledTosses = new Set<SchedulerToss>(tosses);
        // As balls are tossed, we don't remove them from state as it would alter any subsequent toss.
        // Instead, we keep an ordered set of all balls that can still be tossed.
        // We use the fact that sets iterate over their insertion order to make sure we
        // iterate from the newest to the oldest ball.
        const ballsStillInHandIdx = [new Set<number>(), new Set<number>()];
        for (let handIdx = 0; handIdx < state.held.length; handIdx++) {
            for (let spotIdx = state.held[handIdx].length - 1; spotIdx >= 0; spotIdx--) {
                ballsStillInHandIdx[handIdx].add(spotIdx);
            }
        }

        // First, we handle each tossed ball that has a designated ID.
        // (we wouldn't want to toss it by mistake when considering a previous ball)
        for (const toss of unhandledTosses) {
            if (toss.ball !== undefined && "id" in toss.ball) {
                // Figure out which ball is tossed.
                // The ID of the tossed ball has been specified.
                // We need to check it is indeed present in hand.
                const targetBallID = toss.ball.id;
                const ballIdx = state.held[toss.from.handIdx].findIndex(
                    (ballID) => ballID === targetBallID
                );
                if (ballIdx === -1) {
                    this.logError(
                        globalBeat,
                        "Error",
                        `Can't toss ball ${stringifyBall(toss.ball)} from the ${toss.from.handIdx === 1 ? "right" : "left"} hand as it is not there.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinues by trying to toss it later.`
                    );
                    continue;
                }
                if (!ballsStillInHandIdx[toss.from.handIdx].has(ballIdx)) {
                    this.logError(
                        globalBeat,
                        "Error",
                        `Can't toss ball ${stringifyBall(toss.ball)} from the ${toss.from.handIdx === 1 ? "right" : "left"} hand as it has been tossed already.\nContinue by trying to toss it later.`
                    );
                    continue;
                }

                // Mark the ball as tossed.
                ballsStillInHandIdx[toss.from.handIdx].delete(ballIdx);
                unhandledTosses.delete(toss);
                // Add the toss information to the outputed array.
                halfCompletedTossesInfo.push({
                    from: {
                        beat: globalBeat,
                        juggler: this.jugglerName,
                        handIdx: toss.from.handIdx,
                        spotIdx: ballIdx
                    },
                    to: {
                        juggler: toss.to.juggler,
                        handIdx: toss.to.handIdx,
                        beat: toss.to.globalBeat
                    },
                    ballID: toss.ball.id,
                    mode: toss.mode
                });
            }
        }

        // Now we go for all balls in order.
        for (const toss of unhandledTosses) {
            let tossedBallIdx: number | undefined = undefined;
            if (toss.ball === undefined) {
                // If no tossed ball is specified, we need to find it.
                // By default, it is the last one in the hand list.
                tossedBallIdx = getFirstInsertedKey(ballsStillInHandIdx[toss.from.handIdx]);
                if (tossedBallIdx === undefined) {
                    this.logError(
                        globalBeat,
                        "Error",
                        `Can't toss ball from the ${toss.from.handIdx === 1 ? "right" : "left"} hand as there are no balls.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinues without tossing a ball.`
                    );
                    continue;
                }
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
                // We look for them in the order of newest to oldets in hand.
                const matchingBallIdx: number[] = [];
                for (const ballIdx of ballsStillInHandIdx[toss.from.handIdx]) {
                    if (this.ballIDMap.get(state.held[toss.from.handIdx][ballIdx]) === ballName) {
                        matchingBallIdx.push(ballIdx);
                    }
                }
                if (matchingBallIdx.length === 0) {
                    // No ball in hand match the template.
                    this.logError(
                        globalBeat,
                        "Error",
                        `Can't toss ball ${stringifyBall(toss.ball)} from the ${toss.from.handIdx === 1 ? "right" : "left"} hand as it is not there.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nContinues without tossing a ball.`
                    );
                    continue;
                }

                tossedBallIdx = matchingBallIdx[0];

                if (matchingBallIdx.length > 1) {
                    // Multiple balls in hand match the template.
                    this.logError(
                        globalBeat,
                        "Warn",
                        `Multiple balls ${stringifyBall(toss.ball)} can be thrown from the ${toss.from.handIdx === 1 ? "right" : "left"}. This ambiguity may have consequences later.\nRight hand contains : [${stringifyHand(state.held[0])}].\nLeft hand contains : [${stringifyHand(state.held[1])}].\nProceeds by choosing ball ${state.held[toss.from.handIdx][tossedBallIdx]}.`
                    );
                }
            }

            // Mark the ball as tossed.
            ballsStillInHandIdx[toss.from.handIdx].delete(tossedBallIdx);
            unhandledTosses.delete(toss);
            // Add the toss information to the outputed array.
            halfCompletedTossesInfo.push({
                from: {
                    beat: globalBeat,
                    juggler: this.jugglerName,
                    handIdx: toss.from.handIdx,
                    spotIdx: tossedBallIdx
                },
                to: {
                    juggler: toss.to.juggler,
                    handIdx: toss.to.handIdx,
                    beat: toss.to.globalBeat
                },
                ballID: state.held[toss.from.handIdx][tossedBallIdx],
                mode: toss.mode
            });
        }

        if (halfCompletedTossesInfo.length === 0) {
            return { state };
        }

        const preHandState: PartialHeldState = [[...state.held[0]], [...state.held[1]]];
        const postHandState: PartialHeldState = [[...state.held[0]], [...state.held[1]]];
        // Create the post-toss state by making all tossed ball undefined.
        for (const toss of halfCompletedTossesInfo) {
            postHandState[toss.from.handIdx][toss.from.spotIdx] = undefined;
        }

        // Remove all tossed balls from hand to create the state.
        for (let handIdx = 0; handIdx < 2; handIdx++) {
            state.held[handIdx] = state.held[handIdx].filter((value, index) =>
                ballsStillInHandIdx[handIdx].has(index)
            );
        }

        return {
            state: state,
            tosses: { preHandState, info: halfCompletedTossesInfo, postHandState }
        };
    }

    swapBalls(
        beat: Fraction,
        state: JugglerState,
        handsSetup: HandsInstructions
    ): { preState: JugglerState; postState: JugglerState; handMoves: MoveBall[] } {
        // TODO : Better error messages. Indicate state ?
        // TODO : Have a spot for unknown balls common to the case where there is a table and there is not ?

        // TODO : Check balls are first taken from spots that were first defined on the table ?

        // preState is generated to be returned at this function's end.
        const preState = cloneState(state);

        // We build a bipartite graph, where the nodes of the first part are balls, and the second are spots.
        // The edges between balls and spots indicate how much a spot wants to have that ball.
        // Note : in the way we generate the graph, it is the spot that tell which ball they'd
        // like to have, even if in the end, we see it more as : where should each ball go ?
        // We look for the max-weight matching using the hungarian (or khun-munkres) algorithm.
        // This matching may not be complete, but it will be of maximal weight.
        // The weights can be seen as a priority, and computed such that the maximal matching
        // would satisfy as many priority 0 as possible, then priority 1 as possible, ...
        // All unmatched balls will go on the undefined table spot if there is one, or ???

        // The graph maps balls, to spots, to priority.
        // Priority 0 is the highest, then 1, then 2, ...
        const graph: Map<string, Map<string, number>> = new Map();

        // First, create an entry for each ball.
        // We only use balls that appear in the juggler's state.
        for (let handIdx = 0; handIdx < 2; handIdx++) {
            for (const ballID of state.held[handIdx]) {
                graph.set(ballID, new Map());
            }
        }
        for (const [, ballID] of state.table?.namedSpot ?? []) {
            graph.set(ballID, new Map());
        }
        for (const ballID of state.table?.unknown ?? []) {
            graph.set(ballID, new Map());
        }

        // Iterate through all spots, see what kind of ball they'd like, and
        // create edges in the graph.

        // A higher priority means the ball should more likely go to that spot.
        // Note : since we define in the graph spots as string, we can use the getSpotName and getSpotFromName to
        // get that unique string.
        // TODO : Better document the use of this function, and differentiate "spot" from "spot name" (quite confusing).

        const PRIORITY = {
            // For whenever a single ball at most can be targetted (ex : specific location, or ball by ID).
            FIRST_CHOICE_ONEOF: 20,

            // Whenever the location is ambiguous, we may have, although valid, preferences as to where to look for a ball.
            // Note that this takes precedence over simply asking for a ball template.
            AMBIGUOUS_LOCATION_TEMPLATE_1ST_CHOICE: 19,
            AMBIGUOUS_LOCATION_TEMPLATE_2ND_CHOICE: 18,
            AMBIGUOUS_LOCATION_TEMPLATE_3RD_CHOICE: 17,
            SAME_HELD_SPOT_TEMPLATE: 16,
            SAME_HAND_TEMPLATE: 15,
            OTHER_HAND_TEMPLATE: 14,
            TABLE_NAMED_SPOT_TEMPLATE: 13,
            TABLE_UNKNOWN_SPOT_TEMPLATE: 12,

            AMBIGUOUS_LOCATION_1ST_CHOICE: 9,
            AMBIGUOUS_LOCATION_2ND_CHOICE: 8,
            AMBIGUOUS_LOCATION_3RD_CHOICE: 7,
            SAME_HELD_SPOT: 6,
            SAME_HAND: 5,
            OTHER_HAND: 4,
            TABLE_NAMED_SPOT: 3,
            TABLE_UNKNOWN_SPOT: 2,

            TABLE_SPOT_KEEP_BALL: -9, //TODO : We need to have spots for "unknown".
            TABLE_SPOT_ANY_BALL_NOT_UNKNOWN: -10
        };

        const categoriesBySpot = new Map<
            string,
            {
                priority: number;
                balls: (FromTmp & { template: string | undefined }) | string[];
            }[]
        >();

        // 1. Create the location priority. Only use from. ball may be used in case from is undefined
        // To know if all places are equal in priority or not (same spot, same hand, other hand, named spot table, unknown spot table.)
        // 2. Filter it depending on ball.id or template (for the first, add ballID on top.)
        // For both, filter by the template (infered by the ID in the ID case).
        // 3. There may be duplicate balls in duplicate categories : only use the greatest priority.
        // 4. The priorities were integers. look at their range, and compute the true weight.
        if (handsSetup.hands !== undefined) {
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                for (let spotIdx = 0; spotIdx < handsSetup.hands[handIdx].length; spotIdx++) {
                    const spotName = getSpotName({ type: "juggler", handIdx, spotIdx });
                    categoriesBySpot.set(spotName, []);
                    const categories = categoriesBySpot.get(spotName)!;
                    const have = handsSetup.hands[handIdx][spotIdx];
                    let template: string | undefined;

                    // First, if the ball has an ID
                    if (have.ball === undefined) {
                        template = undefined;
                    } else if (have.ball.type === "template") {
                        template = have.ball.template;
                    } else {
                        template = have.ball.id;
                        // We also assign a top priority getting the ball ID.
                        categories.push({
                            priority: PRIORITY.FIRST_CHOICE_ONEOF,
                            balls: [have.ball.id]
                        });
                    }

                    if (have.from === undefined) {
                        // We look for the correct template in order of proximity to the spot.
                        categories.push(
                            {
                                priority:
                                    template === undefined
                                        ? PRIORITY.SAME_HELD_SPOT
                                        : PRIORITY.SAME_HELD_SPOT_TEMPLATE,
                                balls: { type: "juggler", handIdx, spotIdx, template }
                            },
                            {
                                priority:
                                    template === undefined
                                        ? PRIORITY.SAME_HAND
                                        : PRIORITY.SAME_HAND_TEMPLATE,
                                balls: { type: "juggler", handIdx, template }
                            },
                            {
                                priority:
                                    template === undefined
                                        ? PRIORITY.OTHER_HAND
                                        : PRIORITY.OTHER_HAND_TEMPLATE,
                                balls: { type: "juggler", handIdx: (handIdx + 1) % 2, template }
                            },
                            {
                                priority:
                                    template === undefined
                                        ? PRIORITY.TABLE_NAMED_SPOT
                                        : PRIORITY.TABLE_NAMED_SPOT_TEMPLATE,
                                balls: { type: "table", spot: { type: "named" }, template }
                            },
                            {
                                priority:
                                    template === undefined
                                        ? PRIORITY.TABLE_UNKNOWN_SPOT
                                        : PRIORITY.TABLE_UNKNOWN_SPOT_TEMPLATE,
                                balls: { type: "table", spot: { type: "unknown" }, template }
                            }
                        );
                    } else if (have.from.type === "juggler") {
                        // Compute the hand we'll look into first.
                        let firstHandIdx: number;
                        if (have.from.hand === undefined) {
                            // By default, we search in the current hand.
                            // Note : if spotIdx is specified but not handIdx, that is also the case.
                            firstHandIdx = handIdx;
                        } else if (have.from.hand === "same") {
                            firstHandIdx = handIdx;
                        } else if (have.from.hand === "other") {
                            firstHandIdx = (handIdx + 1) % 2;
                        } else if (have.from.hand === "left") {
                            firstHandIdx = 0;
                        } else {
                            firstHandIdx = 1;
                        }

                        // Have a special case when the spotIDx is defined.
                        if (have.from.spotIdx !== undefined) {
                            categories.push({
                                priority: PRIORITY.FIRST_CHOICE_ONEOF,
                                balls: {
                                    type: "juggler",
                                    handIdx: firstHandIdx,
                                    spotIdx: have.from.spotIdx,
                                    template
                                }
                            });
                        }

                        // General case : go from closest to furthest from current spot.
                        categories.push(
                            {
                                priority:
                                    template === undefined
                                        ? PRIORITY.AMBIGUOUS_LOCATION_1ST_CHOICE
                                        : PRIORITY.AMBIGUOUS_LOCATION_TEMPLATE_1ST_CHOICE,
                                balls: {
                                    type: "juggler",
                                    handIdx: firstHandIdx,
                                    spotIdx: spotIdx,
                                    template
                                }
                            },
                            {
                                priority:
                                    template === undefined
                                        ? PRIORITY.AMBIGUOUS_LOCATION_2ND_CHOICE
                                        : PRIORITY.AMBIGUOUS_LOCATION_TEMPLATE_2ND_CHOICE,
                                balls: { type: "juggler", handIdx: firstHandIdx, template }
                            },
                            {
                                priority:
                                    template === undefined
                                        ? PRIORITY.AMBIGUOUS_LOCATION_3RD_CHOICE
                                        : PRIORITY.AMBIGUOUS_LOCATION_TEMPLATE_3RD_CHOICE,
                                balls: {
                                    type: "juggler",
                                    handIdx: firstHandIdx + (1 % 2),
                                    template
                                }
                            },
                            {
                                priority:
                                    template === undefined
                                        ? PRIORITY.TABLE_NAMED_SPOT
                                        : PRIORITY.TABLE_NAMED_SPOT_TEMPLATE,
                                balls: { type: "table", spot: { type: "named" }, template }
                            },
                            {
                                priority:
                                    template === undefined
                                        ? PRIORITY.TABLE_UNKNOWN_SPOT
                                        : PRIORITY.TABLE_UNKNOWN_SPOT_TEMPLATE,
                                balls: { type: "table", spot: { type: "unknown" }, template }
                            }
                        );
                    } else {
                        // have.from.type === "table"

                        // First, some one-offs. Look into the specific spot if it was specified.
                        if (have.from.spot === null) {
                            // Sure, there can be multiple balls in the unknown spot, but it was still specified.
                            categories.push({
                                priority: PRIORITY.FIRST_CHOICE_ONEOF,
                                balls: { type: "table", spot: { type: "unknown" }, template }
                            });
                        } else if (typeof have.from.spot === "string") {
                            categories.push({
                                priority: PRIORITY.FIRST_CHOICE_ONEOF,
                                balls: {
                                    type: "table",
                                    spot: { type: "named", name: have.from.spot },
                                    template
                                }
                            });
                        }

                        // Note : have.from.spot === undefined doesn't mean "no ball" but "choose any ball on the table".
                        // General priority.
                        categories.push(
                            {
                                priority:
                                    template === undefined
                                        ? PRIORITY.AMBIGUOUS_LOCATION_1ST_CHOICE
                                        : PRIORITY.AMBIGUOUS_LOCATION_TEMPLATE_1ST_CHOICE,
                                balls: { type: "table", spot: { type: "named" }, template }
                            },
                            {
                                // Note : if the ball should be taken from unknown spot,
                                // the previous if statement has higher priority.
                                priority:
                                    template === undefined
                                        ? PRIORITY.AMBIGUOUS_LOCATION_2ND_CHOICE
                                        : PRIORITY.AMBIGUOUS_LOCATION_TEMPLATE_2ND_CHOICE,
                                balls: { type: "table", spot: { type: "unknown" }, template }
                            },
                            {
                                priority:
                                    // TODO : Are we sure about that priority ?
                                    template === undefined
                                        ? PRIORITY.TABLE_NAMED_SPOT
                                        : PRIORITY.TABLE_NAMED_SPOT_TEMPLATE,
                                balls: { type: "juggler", template }
                            }
                        );
                    }
                }
            }
        } else {
            // We don't have a specific handsSetup.have.
            // But we still may place balls, so balls held may dissapear.
            // Priority to ball in same spot, same spot +1, same spot + 2...
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                for (let spotIdx = 0; spotIdx < state.held[handIdx].length; spotIdx++) {
                    const spotName = getSpotName({ type: "juggler", handIdx, spotIdx });
                    categoriesBySpot.set(spotName, []);
                    const categories = categoriesBySpot.get(spotName)!;
                    for (
                        let otherIdx = spotIdx;
                        otherIdx < state.held[handIdx].length;
                        otherIdx++
                    ) {
                        // TODO : Slightly decreasing priority each time.
                        categories.push({
                            priority:
                                PRIORITY.FIRST_CHOICE_ONEOF -
                                (otherIdx - spotIdx) / (state.held[handIdx].length - spotIdx),
                            balls: [state.held[handIdx][otherIdx]]
                        });
                    }
                }
            }
            // And if not that, UNDEFINED, END.
        }

        // Handle all the spots on the table and their needs.
        // Note : there is no need here to have an else clause, as wehandle all spots a bit later.
        if (handsSetup.tableSpots !== undefined) {
            for (const { spot, place: have } of handsSetup.tableSpots) {
                const spotName = getSpotName({
                    type: "table",
                    spot: { type: "named", name: spot }
                });
                categoriesBySpot.set(spotName, []);
                const categories = categoriesBySpot.get(spotName)!;
                let template: string;

                // First, if the ball has an ID
                if (have.ball === undefined) {
                    template = this.tableSpots.get(spot)!;
                } else if (have.ball.type === "template") {
                    template = have.ball.template;
                } else {
                    template = have.ball.id;
                    // We also assign a top priority getting the ball ID.
                    categories.push({
                        priority: PRIORITY.FIRST_CHOICE_ONEOF,
                        balls: [have.ball.id]
                    });
                }

                // Issue warning if the template is not the one accepted by the spot.
                const acceptedTemplate = this.tableSpots.get(spot);
                if (acceptedTemplate === template) {
                    this.logError(
                        beat,
                        "Log",
                        `Trying to put ball with template ${template} into spot ${spot} that only accepts balls of template ${acceptedTemplate}.`
                    );
                }

                if (have.from === undefined) {
                    // We look for the correct template in order of proximity to the spot.

                    //TODO : Do we really want to enforce the fact that we place a ball here ?
                    categories.push(
                        {
                            priority: PRIORITY.SAME_HELD_SPOT_TEMPLATE,
                            balls: { type: "table", spot: { type: "named", name: spot }, template }
                        },
                        {
                            priority: PRIORITY.SAME_HELD_SPOT_TEMPLATE,
                            balls: { type: "table", spot: { type: "named" }, template }
                        },
                        {
                            priority: PRIORITY.OTHER_HAND_TEMPLATE,
                            balls: { type: "table", spot: { type: "unknown" }, template }
                        },
                        {
                            priority: PRIORITY.TABLE_NAMED_SPOT_TEMPLATE,
                            balls: { type: "juggler", template }
                        }
                    );
                } else if (have.from.type === "juggler") {
                    // Compute the hand we'll look into first.
                    let handIdx: number | undefined;
                    if (have.from.hand === undefined) {
                        // Note : If spotIdx is not undefined here, we look into both hands spotIdx.
                        // Makes little sense, but allows graceful handling.
                        if (have.from.spotIdx !== undefined) {
                            this.logError(
                                beat,
                                "Log",
                                `Spot ${spot} asks for held spot ${have.from.spotIdx} without specifying hand.`
                            );
                        }
                        handIdx = undefined;
                    } else if (have.from.hand === "left") {
                        handIdx = 0;
                    } else {
                        handIdx = 1;
                    }

                    // Have a special case when the spotIdx is defined.
                    if (have.from.spotIdx !== undefined) {
                        categories.push({
                            priority: PRIORITY.FIRST_CHOICE_ONEOF,
                            balls: {
                                type: "juggler",
                                handIdx: handIdx,
                                spotIdx: have.from.spotIdx,
                                template
                            }
                        });
                    }

                    // Then just ask for the ball that would already be on the spot.
                    categories.push({
                        priority: PRIORITY.AMBIGUOUS_LOCATION_1ST_CHOICE,
                        balls: { type: "table", spot: { type: "named", name: spot }, template }
                    });

                    // Go from closest to furthest from current spot.
                    if (handIdx === undefined) {
                        categories.push({
                            priority: PRIORITY.AMBIGUOUS_LOCATION_TEMPLATE_2ND_CHOICE,
                            balls: {
                                type: "juggler",
                                template
                            }
                        });
                    } else {
                        categories.push(
                            {
                                priority: PRIORITY.AMBIGUOUS_LOCATION_TEMPLATE_2ND_CHOICE,
                                balls: {
                                    type: "juggler",
                                    handIdx: handIdx,
                                    template
                                }
                            },
                            {
                                priority: PRIORITY.AMBIGUOUS_LOCATION_TEMPLATE_3RD_CHOICE,
                                balls: {
                                    type: "juggler",
                                    handIdx: (handIdx + 1) % 2,
                                    template
                                }
                            }
                        );
                    }

                    // Finally, look into the table's balls.
                    categories.push(
                        {
                            priority: PRIORITY.TABLE_NAMED_SPOT_TEMPLATE,
                            balls: { type: "table", spot: { type: "named" }, template }
                        },
                        {
                            priority: PRIORITY.TABLE_UNKNOWN_SPOT_TEMPLATE,
                            balls: { type: "table", spot: { type: "unknown" }, template }
                        }
                    );
                } else {
                    // have.from.type === "table"

                    // Look into the specific spot if it was specified.
                    if (have.from.spot === null) {
                        // Sure, there can be multiple balls in the unknown spot, but it was still specified.
                        categories.push({
                            priority: PRIORITY.FIRST_CHOICE_ONEOF,
                            balls: { type: "table", spot: { type: "unknown" }, template }
                        });
                    } else if (typeof have.from.spot === "string") {
                        categories.push({
                            priority: PRIORITY.FIRST_CHOICE_ONEOF,
                            balls: {
                                type: "table",
                                spot: { type: "named", name: have.from.spot },
                                template
                            }
                        });
                    }

                    // Default to own spot and then table, and then juggler.
                    categories.push(
                        {
                            priority: PRIORITY.AMBIGUOUS_LOCATION_TEMPLATE_1ST_CHOICE,
                            balls: { type: "table", spot: { type: "named", name: spot }, template }
                        },
                        {
                            priority: PRIORITY.AMBIGUOUS_LOCATION_TEMPLATE_2ND_CHOICE,
                            balls: { type: "table", spot: { type: "named" }, template }
                        },
                        {
                            priority: PRIORITY.AMBIGUOUS_LOCATION_3RD_CHOICE,
                            balls: { type: "table", spot: { type: "unknown" }, template }
                        },
                        {
                            priority: PRIORITY.TABLE_NAMED_SPOT_TEMPLATE,
                            balls: { type: "juggler", template }
                        }
                    );
                }
            }
        }

        // handsSetup.tableSpots only gives an idea of the spots that change.
        // we still need to consider all the remaining spots on the table.
        // If they have a ball, they'd like to keep it. But otherwise they accept any ball.
        for (const [spot, template] of this.tableSpots) {
            const spotName = getSpotName({ type: "table", spot: { type: "named", name: spot } });
            if (!categoriesBySpot.has(spotName)) {
                categoriesBySpot.set(spotName, []);
                const categories = categoriesBySpot.get(spotName)!;
                const oldBallID = state.table!.namedSpot.get(spot);
                if (oldBallID !== undefined) {
                    categories.push({
                        priority: PRIORITY.TABLE_SPOT_KEEP_BALL,
                        balls: [oldBallID]
                    });
                }
                categories.push({
                    priority: PRIORITY.TABLE_SPOT_ANY_BALL_NOT_UNKNOWN,
                    balls: { type: "juggler", template }
                });
                categories.push({
                    priority: PRIORITY.TABLE_SPOT_ANY_BALL_NOT_UNKNOWN,
                    balls: { type: "table", template }
                });
            }
        }

        // Set the edges in the graph.
        for (const [spotName, categories] of categoriesBySpot) {
            for (const { priority, balls } of categories) {
                const computedBalls = Array.isArray(balls)
                    ? balls
                    : getBallIDsFrom(balls, state, this.ballIDMap);
                for (const ballID of computedBalls) {
                    const weight = graph.get(ballID)!.get(spotName);
                    if (weight === undefined || weight < priority) {
                        graph.get(ballID)!.set(spotName, priority);
                    }
                }
            }
        }

        // Adjust the weights so that it is better to take on edge of priority P than all edges of priority P-1, for all P.
        // For each priority level, count how many balls have at least one edge with that priority.
        const weightsCount = new Map<number, number>();
        for (const [, edges] of graph) {
            const ballWeights = new Set(edges.values());
            for (const weight of ballWeights) {
                if (!weightsCount.has(weight)) {
                    weightsCount.set(weight, 1);
                } else {
                    weightsCount.set(weight, weightsCount.get(weight)! + 1);
                }
            }
        }
        // Then we can compute the new weights...
        const weightsMap = new Map<number, number>();
        const sortedWeightsCount = [...weightsCount].sort(
            ([weight1], [weight2]) => weight1 - weight2
        );
        let newWeight = 0;
        for (const [weight, count] of sortedWeightsCount) {
            weightsMap.set(weight, newWeight);
            newWeight += newWeight * count + 1;
        }
        // ...and apply them to the graph.
        for (const [, edges] of graph) {
            for (const [spotName, weight] of edges) {
                edges.set(spotName, weightsMap.get(weight)!);
            }
        }

        // Compute the optimal bipartite graph
        const pairs = computeMunkres(graph, true);

        // From there, build the new state.
        // Construct the new hands with ball IDs, to contruct the whole new state.
        // We will add one by one the ball IDs in their respective spot.
        const newState: PartialJugglerState = {
            airborne: new Map(state.airborne),
            held: [[], []],
            table:
                state.table === undefined ? undefined : { namedSpot: new Map(), unknown: new Set() }
        };
        for (const [ballID, spotName] of pairs) {
            const loc = getSpotFromName(spotName);
            if (loc.type === "juggler") {
                const hand = newState.held[loc.handIdx];
                // If needed, increase the size of the held state with undefined to record the new ball.
                for (let i = hand.length; i < loc.spotIdx + 1; i++) {
                    hand.push(undefined);
                }
                hand[loc.spotIdx] = ballID;
            } else if (loc.spot.type === "named") {
                newState.table!.namedSpot.set(loc.spot.name, ballID);
            } else {
                newState.table!.unknown.add(ballID);
            }
        }

        // Handle all balls that weren't given a valid pair.
        const matchedBalls = new Set<string>();
        for (const [ballID] of pairs) {
            matchedBalls.add(ballID);
        }
        const unmatchedBalls = setDifference(new Set(graph.keys()), matchedBalls);
        if (unmatchedBalls.size !== 0) {
            if (newState.table === undefined) {
                this.logError(beat, "Error", `Can't determine where some balls should be held.`);
            } else {
                this.logError(
                    beat,
                    "Warn",
                    `Can't determine where some balls should be (held or on table) as all spots are occupied. Continue by putting them on a default table spot.`
                );
                // Add all balls to the unknown spot on table if there is one.
                for (const ballID of unmatchedBalls) {
                    newState.table!.unknown.add(ballID);
                }
            }
        }

        // Now is a good time to error out if needed, by checking if each ball indeed meets
        // all the search criteria.
        // TODO : Custom check when handsSetup.hands is undefined that all undefined are at the end of the state.held, in a chain (else something wrong happened).
        for (let handIdx = 0; handIdx < 2; handIdx++) {
            for (let spotIdx = 0; spotIdx < newState.held[handIdx].length; spotIdx++) {
                const ballID = newState.held[handIdx][spotIdx];
                if (ballID === undefined) {
                    // No ball was paired in that spot.
                    if (handsSetup.hands === undefined) {
                        // This is not normal, the matching should return a ball everywhere.
                        continue;
                    }
                    const have = handsSetup.hands[handIdx][spotIdx];
                    this.logError(
                        beat,
                        "Warn",
                        `Couldn't find a ball to put in ${handIdx === 0 ? "left" : "right"} hand that met all required conditions : ${JSON.stringify(have)}\n`
                    );
                } else {
                    if (handsSetup.hands === undefined) {
                        continue;
                    }
                    const oldLoc = findBallIDLocation(state, ballID);
                    if (oldLoc === undefined) {
                        throw Error("Sanity Check, shouldn't happen.");
                    }
                    const have = handsSetup.hands[handIdx][spotIdx];

                    // Compute the exact hand "have" was concerned by.
                    let haveHandIdx: number | undefined;
                    if (have.from === undefined || have.from.type === "table") {
                        haveHandIdx = undefined;
                    } else if (have.from.hand === undefined) {
                        haveHandIdx = handIdx;
                    } else if (have.from.hand === "same") {
                        haveHandIdx = handIdx;
                    } else if (have.from.hand === "other") {
                        haveHandIdx = (handIdx + 1) % 2;
                    } else if (have.from.hand === "left") {
                        haveHandIdx = 0;
                    } else {
                        haveHandIdx = 1;
                    }

                    // Check for error.
                    if (
                        (have.ball === undefined ||
                            (have.ball.type === "ID" && have.ball.id === ballID) ||
                            (have.ball.type === "template" &&
                                have.ball.template === this.ballIDMap.get(ballID))) &&
                        (have.from === undefined ||
                            (have.from.type === "juggler" &&
                                oldLoc.type === "juggler" &&
                                (have.from.hand === undefined || haveHandIdx === oldLoc.handIdx) &&
                                (have.from.spotIdx === undefined ||
                                    have.from.spotIdx === oldLoc.handIdx)) ||
                            (have.from.type === "table" &&
                                oldLoc.type === "table" &&
                                (have.from.spot === undefined ||
                                    (have.from.spot === null && oldLoc.spot.type === "unknown") ||
                                    (typeof have.from.spot === "string" &&
                                        oldLoc.spot.type === "named" &&
                                        have.from.spot === oldLoc.spot.name))))
                    ) {
                        this.logError(
                            beat,
                            "Warn",
                            `Couldn't put a ball in ${handIdx === 0 ? "left" : "right"} hand that met all required conditions : ${JSON.stringify(have)}\nContinue by putting ${ballID} there.`
                        );
                    }
                }
            }
        }

        // Filter out all undefined spots in state.held, which makes newState a JugglerState.
        for (let handIdx = 0; handIdx < 2; handIdx++) {
            const newHand: string[] = [];
            for (const ballID of newState.held[handIdx]) {
                if (ballID !== undefined) {
                    newHand.push(ballID);
                }
            }
            newState.held[handIdx] = newHand;
        }

        // Compute all the moves.
        // TODO : Unify FromTmp and LocType
        function convertLoc(loc: DeepRequired<FromTmp>): LocType {
            if (loc.type === "juggler") {
                return { type: "held", handIdx: loc.handIdx, spotIdx: loc.spotIdx };
            } else if (loc.spot.type === "named") {
                return { type: "onTableSpot", spotName: loc.spot.name };
            } else {
                return { type: "onTableUnknownSpot" };
            }
        }
        const handMoves: MoveBall[] = [];
        for (let handIdx = 0; handIdx < 2; handIdx++) {
            for (let spotIdx = 0; spotIdx < state.held[handIdx].length; spotIdx++) {
                const ballID = state.held[handIdx][spotIdx];
                const oldLoc: LocType = { type: "held", handIdx, spotIdx };
                const newLocTmp = findBallIDLocation(newState, ballID);
                if (newLocTmp === undefined) {
                    continue;
                }
                const newLoc: LocType = convertLoc(newLocTmp);
                handMoves.push({ id: ballID, from: oldLoc, to: newLoc });
            }
        }
        if (state.table !== undefined && newState.table !== undefined) {
            for (const [spot, ballID] of state.table.namedSpot) {
                const oldLoc: LocType = { type: "onTableSpot", spotName: spot };
                const newLocTmp = findBallIDLocation(newState, ballID);
                if (newLocTmp === undefined) {
                    continue;
                }
                const newLoc: LocType = convertLoc(newLocTmp);
                handMoves.push({ id: ballID, from: oldLoc, to: newLoc });
            }
            for (const ballID of state.table.unknown) {
                const oldLoc: LocType = { type: "onTableUnknownSpot" };
                const newLocTmp = findBallIDLocation(newState, ballID);
                if (newLocTmp === undefined) {
                    continue;
                }
                const newLoc: LocType = convertLoc(newLocTmp);
                handMoves.push({ id: ballID, from: oldLoc, to: newLoc });
            }
        }

        return { preState, postState: newState as JugglerState, handMoves };
    }

    // TODO : Document that descendAirborneBalls must have been called before.
    processEvent(
        eventIdx: number,
        state: JugglerState
    ): {
        tosses?: HalfCompletedTosses;
        state: JugglerState;
        setupHands?: {
            preHandState: PartialHeldState;
            moves: MoveBall[];
            postHandState: PartialHeldState;
        };
    } {
        const { setupHands, globalBeat: beat } = this.events[eventIdx];

        // 1. prepare the hands by placing the necessary balls on the table, and
        // setting up the hands with the contents they must have.
        let setupHandsFilled:
            | {
                  preHandState: PartialHeldState;
                  moves: MoveBall[];
                  postHandState: PartialHeldState;
              }
            | undefined = undefined;
        if (setupHands !== undefined) {
            const res1 = this.swapBalls(beat, state, setupHands);
            state = res1.postState;
            setupHandsFilled = {
                preHandState: res1.preState.held,
                moves: res1.handMoves,
                postHandState: res1.postState.held
            };
        }

        // 2. Toss the balls that need to be tossed.
        const res2 = this.tossBalls(state, eventIdx);

        // Return relevant information.
        return {
            tosses: res2.tosses,
            state: res2.state,
            setupHands: setupHandsFilled
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
    addTossToState(toss: HalfCompletedTossInfo, state: JugglerState): { state: JugglerState } {
        state = cloneState(state);
        state.airborne.set(toss.ballID, {
            catchBeat: toss.to.beat,
            tossBeat: toss.from.beat,
            toRightHand: toss.to.handIdx === 1
        });
        return { state };
    }
}

function getBallIDsFrom(
    from: FromTmp & { template: string | undefined },
    state: JugglerState,
    ballIDMap: Map<string, string>
): string[] {
    const balls: string[] = [];

    if (from.type === "juggler") {
        if (from.handIdx === undefined) {
            return [
                ...getBallIDsFrom(
                    {
                        type: "juggler",
                        handIdx: 0,
                        spotIdx: from.spotIdx,
                        template: from.template
                    },
                    state,
                    ballIDMap
                ),
                ...getBallIDsFrom(
                    {
                        type: "juggler",
                        handIdx: 1,
                        spotIdx: from.spotIdx,
                        template: from.template
                    },
                    state,
                    ballIDMap
                )
            ];
        }

        // Look into the appropriate spots.
        if (from.spotIdx === undefined) {
            // Any held ball is valid.
            for (const ballID of state.held[from.handIdx]) {
                balls.push(ballID);
            }
        } else {
            // Just the ball in the spot.
            if (from.spotIdx < state.held[from.handIdx].length) {
                balls.push(state.held[from.handIdx][from.spotIdx]);
            }
        }
    } else {
        // from.type === "table"
        if (from.spot === undefined) {
            // Any spot will do.
            return [
                ...getBallIDsFrom(
                    {
                        type: "table",
                        spot: { type: "named" },
                        template: from.template
                    },
                    state,
                    ballIDMap
                ),
                ...getBallIDsFrom(
                    {
                        type: "table",
                        spot: { type: "unknown" },
                        template: from.template
                    },
                    state,
                    ballIDMap
                )
            ];
        }
        if (from.spot.type === "named") {
            if (from.spot.name === undefined) {
                for (const [, ballID] of state.table?.namedSpot ?? []) {
                    balls.push(ballID);
                }
            } else {
                const ballID = state.table?.namedSpot.get(from.spot.name);
                if (ballID !== undefined) {
                    balls.push(ballID);
                }
            }
        } else {
            for (const ballID of state.table?.unknown ?? []) {
                balls.push(ballID);
            }
        }
    }

    // Filter the balls so they math the template.
    if (from.template === undefined) {
        return balls;
    } else {
        return balls.filter((ballID) => ballIDMap.get(ballID) === from.template);
    }
}

        const uniqueSpotNameChar = "§";

        // Returns a unique string to identify a spot (whether held or on table).
        // Useful as map keys.
        function getSpotName(spot: DeepRequired<FromTmp>): string {
            if (spot.type === "juggler") {
                return `Held${uniqueSpotNameChar}${spot.handIdx}${uniqueSpotNameChar}${spot.spotIdx}`;
            } else if (spot.spot.type === "named") {
                return `Table${uniqueSpotNameChar}${spot.spot.name}`;
            } else {
                return `TableUnnamed${uniqueSpotNameChar}`;
            }
        }

        // Does the opposite from the above function.
        function getSpotFromName(spotName: string): DeepRequired<FromTmp> {
            const spotSplitInfo = spotName.split(uniqueSpotNameChar);
            if (spotSplitInfo.length === 0) {
                throw Error("Unrecognized name.");
            }
            if (spotSplitInfo[0] === "Held" && spotSplitInfo.length === 3) {
                return {
                    type: "juggler",
                    handIdx: parseInt(spotSplitInfo[1]),
                    spotIdx: parseInt(spotSplitInfo[2])
                };
            } else if (spotSplitInfo[0] === "Table" && spotSplitInfo.length === 2) {
                return { type: "table", spot: { type: "named", name: spotSplitInfo[1] } };
            } else if (spotSplitInfo[0] === "TableUnnamed") {
                return { type: "table", spot: { type: "unknown" } };
            }
            throw Error("Unrecognized name.");
        }

export type SpotName = string;
export type BallTemplateName = string;
type PartialJugglerState = Omit<JugglerState, "held"> & { held: PartialHeldState };

function findBallIDLocation(
    state: PartialJugglerState,
    ballID: string
): DeepRequired<FromTmp> | undefined {
    // Check if the ball is held.
    for (let handIdx = 0; handIdx < state.held.length; handIdx++) {
        for (let spotIdx = 0; spotIdx < state.held[handIdx].length; spotIdx++) {
            if (state.held[handIdx][spotIdx] === ballID) {
                return { type: "juggler", handIdx, spotIdx };
            }
        }
    }

    //TODO : Airborne if this function is truly generic ??

    // Check if the ball is on the table.
    if (state.table === undefined) {
        return undefined;
    }
    for (const [spotName, ballIDOnTable] of state.table.namedSpot)
        if (ballID === ballIDOnTable) {
            return { type: "table", spot: { type: "named", name: spotName } };
        }
    for (const ballIDOnTable of state.table.unknown) {
        if (ballIDOnTable === ballID) {
            return { type: "table", spot: { type: "unknown" } };
        }
    }
    return undefined;
}

function findBallTemplateNameInHands(
    state: PartialJugglerState,
    ballTemplateName: string,
    ballIDMap: Map<string, string>
): [Map<string, number>, Map<string, number>] {
    return [
        findBallTemplateNameInHand(state, ballTemplateName, 0, ballIDMap),
        findBallTemplateNameInHand(state, ballTemplateName, 1, ballIDMap)
    ];
}

function findBallTemplateNameInHand(
    state: PartialJugglerState,
    ballTemplateName: string,
    handIdx: number,
    ballIDMap: Map<BallID, BallTemplateName>
): Map<string, number> {
    const result = new Map<string, number>();
    // In hands, look for balls that have the matching template.
    for (let spotIdx = 0; spotIdx < state.held[handIdx].length; spotIdx++) {
        const ballID = state.held[handIdx][spotIdx];
        if (ballID !== undefined && ballIDMap.get(ballID) === ballTemplateName) {
            result.set(ballID, spotIdx);
        }
    }
    return result;
}

function findOccupiedTableSpotsByTemplateName(
    state: PartialJugglerState,
    ballTemplateName: string,
    ballIDMap: Map<BallID, BallTemplateName>
    // tableSpots: Map<SpotName, BallTemplateName>
): {
    named: Map<SpotName, BallID>;
    unnamed: Set<BallID>;
} {
    const result = {
        named: new Map<SpotName, BallID>(),
        unnamed: new Set<BallID>()
    };
    if (state.table === undefined) {
        return result;
    }
    // Look through the table to find matching balls.
    for (const [spotName, ballID] of state.table.namedSpot) {
        if (ballIDMap.get(ballID) === ballTemplateName) {
            result.named.set(spotName, ballID);
        }
    }
    for (const ballID of state.table.unknown) {
        if (ballIDMap.get(ballID) === ballTemplateName) {
            result.unnamed.add(ballID);
        }
    }

    return result;
}

/**
 * Find all unoccupied spots on the table.
 * @param ballTemplateName the name of the ball template.
 * @returns an array of all spot names that have no ball, in the order they were defined in.
 */
function findFreeTableSpotsByTemplateName(
    state: PartialJugglerState,
    ballTemplateName: string,
    tableSpotsMap: Map<SpotName, BallTemplateName>
): Set<string> {
    const result = new Set<string>();
    if (state.table === undefined) {
        return result;
    }
    // Look through the table to find matching balls.
    for (const [spotName, acceptedTemplate] of tableSpotsMap) {
        if (acceptedTemplate === ballTemplateName && !state.table.namedSpot.has(spotName)) {
            // The spot is of the right type, and not already occupied.
            result.add(spotName);
        }
    }
    return result;
}

//Document that this is to put balls on table without changing handIdx.
// function putBallNoIdxChange(ballID: string, spotName?: string): void {
//     // Handle the ballLocationBySound AND the state (they need to be kept in sync).

//     const moveFrom = this.findBallIDLocation(ballID);
//     if (moveFrom === null || moveFrom.type !== "held") {
//         throw Error("Ball must be held to be put on table.");
//     }

//     // Put the ball in its new location.
//     const ballName = this.ballIDMap.get(ballID)!;
//     const templateLoc = this.ballLocationBySound.get(ballName)!;

//     // Remove the ball from its previous location.
//     templateLoc.oldHands[moveFrom.handIdx].delete(ballID);
//     this.handsState[moveFrom.handIdx][moveFrom.spotIdx] = undefined;
//     if (spotName !== undefined) {
//         // Move the ball to a named spot, but check it accepts the correct type of balls.
//         if (ballName !== this.tableSpots.get(spotName)) {
//             throw Error("Can't put ball in a spot that doesn't accept balls of that kind.");
//         }
//         templateLoc.tableSpots.unoccupied.delete(spotName);
//         templateLoc.tableSpots.occupied.named.set(spotName, ballID);
//     } else {
//         templateLoc.tableSpots.occupied.unnamed.add(ballID);
//     }
// }

// function getBallNames(): MapIterator<string> {
//     return this.ballLocationBySound.keys();
// }

// function reconstructTableState(): JugglerState["table"] {
//     const tableState = {
//         namedSpot: new Map<string, BallID>(),
//         unknown: new Set<BallID>()
//     };

//     for (const { tableSpots } of this.ballLocationBySound.values()) {
//         for (const [spotName, ballID] of tableSpots.occupied.named) {
//             tableState.namedSpot.set(spotName, ballID);
//         }
//         for (const ballID of tableSpots.occupied.unnamed) {
//             tableState.unknown.add(ballID);
//         }
//     }
//     return tableState;
// }

// function reconstructHeldState(): JugglerState["held"] {
//     // Since some positions may have a ball undefined (see putBallNoIdxChange method for why),
//     // we need to filter them out.
//     const heldState: [string[], string[]] = [[], []];

//     for (let handIdx = 0; handIdx < 2; handIdx++) {
//         for (const ballID of this.handsState[handIdx]) {
//             if (ballID !== undefined) {
//                 heldState[handIdx].push(ballID);
//             }
//         }
//     }
//     return heldState;
// }

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
    handsSetup: HandsInstructions,
    ballsLocation: BallsLocation
): JugglerState {
    state = cloneState(state);
    if (handsSetup.haveBalls === undefined) {
        // We've only placed balls on the table.
        state.held = ballsLocation.reconstructHeldState();
        return state;
    }
    // Construct the new hands with ball IDs, to contruct the whole new state.
    // We will add one by one the ball IDs in their respective spot.
    const newHeldState: PartialHeldState = [
        Array<string | undefined>(handsSetup.haveBalls[0].length).fill(undefined),
        Array<string | undefined>(handsSetup.haveBalls[0].length).fill(undefined)
    ];
    for (const [ballID, move] of movedBalls) {
        if (move.to.type === "held") {
            newHeldState[move.to.handIdx][move.to.spotIdx] = ballID;
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
                    move.to.spotIdx = ballIdx;
                }
                ballIdx++;
            }
        }
    }
    return state;
}