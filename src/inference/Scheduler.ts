import { Timeline } from "../simulator/Timeline";
import Fraction from "fraction.js";
import { stringifyBall, stringifyHand, stringifyTable } from "../utils/stringifyEvent";
import { Severity, TimedErrorLogger } from "../utils/ErrorLogger";
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
type SortedList<T> = T[];
export type FracSortedList<T> = SortedList<[Fraction, T]>;

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

export type Hands<BallT> = [BallT[], BallT[]];
//TODO : Remove Balls and PartialBallsInHands and replace with Hands<...>.
export type BallsInHands = Hands<Ball>;
export type PartialBallsInHands = Hands<PartialBall>;

// TODO: Rename
export interface PartialToss2 {
    from: { juggler: string; rightHand: boolean; beat: Fraction };
    to: { juggler: string; hand?: "R" | "L" | "x"; beat: Fraction };
    ball: Ball;
}

export interface SimulatorToss<BeatT> {
    from: { juggler: string; rightHand: boolean; beat: BeatT };
    to: { juggler: string; rightHand: boolean; beat: BeatT };
    ball: Ball;
}

export interface SchedulerEvent {
    tosses: PartialToss[];
    tempo: Fraction;
    hands?: PartialBallsInHands;
    newDefaultHand: "L" | "R";
}

export interface SimulatorEvent<T> {
    tosses: SimulatorToss<T>[];
    tempo: Fraction;
    hands?: { old: BallsInHands; new: BallsInHands };
}

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
    jugglers: Map<string, { events: FracSortedList<SchedulerEvent>; balls: Ball[] }>;
}

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
        for (const [name, { balls, events }] of jugglers) {
            const manager = new JugglerManager(name, balls, events);
            const cache = manager.generateInitialCache();
            this.jugglers.set(name, { manager: manager, cache: cache });
        }
    }

    //TODO : Handle errors.
    //TODO : Add arguments from / to ?
    //TODO : Add Return type.
    //TODO : State copy to not have problems ?
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
            manager.errorLogger.logErrors();
        }
        return schedulerRes;
    }
}

interface JugglerState {
    airborne: Map<
        string,
        {
            toRightHand: boolean;
            ball: Ball;
            catchBeat: Fraction;
            throwBeat: Fraction;
        }
    >;
    held: BallsInHands;
    onTable: Map<string, Ball>;
}

function cloneState(state: JugglerState): JugglerState {
    return {
        airborne: new Map(state.airborne),
        held: [[...state.held[0]], [...state.held[1]]],
        onTable: new Map(state.onTable)
    };
}

export function isInRhythm(beat: Fraction, startBeat: Fraction, tempo: Fraction): boolean {
    return beat.sub(startBeat).divisible(tempo);
}

export function XOR(a: boolean, b: boolean): boolean {
    return a !== b;
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
class JugglerManager {
    name: string;
    events: FracSortedList<SchedulerEvent>;
    errorLogger: TimedErrorLogger;
    ballsOnTable: Ball[];
    // catches: FracSortedList<SimulatorToss>;
    // beats: FracSortedList<JugglerState>;
    // private _currentTempo: Fraction;
    // private _currentBeatIdx: number;
    // private _currentBeat: Fraction;
    // private _nextEventIdx: number;
    // private _hasProcessedFirstBeat = false;

    //TODO : FOr the packages in pnpm, if they have modular install, use it !
    //TODO : When only siteswap height 3 was given, should we deafult to:
    //TODO : Document that currentbeat : state does not exist yet. But info on tempo and usehand might ! Misleading name ?
    // - 3 beats (even if the tempo then gets shorter ?)
    // - 3 * current unit value (possibly falling outside of rhythm)
    // FIRST ANSWER, reason : to keep the symbolic of the height (hand changing etc)
    //+ Easier to understand in practice (number of actions done before catching it).
    //TODO: Reorder constructor code.
    constructor(name: string, ballsOnTable: Ball[], events: FracSortedList<SchedulerEvent>) {
        this.name = name;
        this.events = events;
        this.errorLogger = new TimedErrorLogger();
        this.ballsOnTable = ballsOnTable;
    }

    generateIntialState(): JugglerState {
        const ballsOnTableMap: [string, Ball][] = this.ballsOnTable.map((ball) => [ball.id, ball]);
        return {
            airborne: new Map(),
            held: [[], []],
            onTable: new Map(ballsOnTableMap)
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

    hasReachedEnd(eventIdx: number): boolean {
        return eventIdx >= this.events.length;
    }

    // requiresProcessing(): boolean {
    //     // The end has been reached if we no longer have events to process, nor
    //     // do we have balls in the air that need falling.
    //     return this.nextBeatToProcess() !== null;
    // }

    logError(beat: Fraction, severity: Severity, message: string): void {
        this.errorLogger.addError(beat, severity, `Juggler ${this.name}:\n\t${message}`);
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
                ball: ball
            });
        }
        return { tosses: newTosses, state: state };
    }

    // TODO : document that state is not copied ?
    // TODO : Lefthand / Righthand : make Array. It is simpler to manipulate.
    // and document the convention that left cell = left, right cell = right.
    // TODO : Unify some of the behaviour here with tossBalls ?
    swapBalls(beat: Fraction, state: JugglerState, newHands: PartialBallsInHands): JugglerState {
        state = cloneState(state);
        // 1. Put all held balls on the table.
        for (const hand of state.held) {
            for (const ball of hand) {
                state.onTable.set(ball.id, ball);
            }
        }
        state.held = [[], []];

        // 2. Put the according balls from the table in the hands.
        for (let i = 0; i < 2; i++) {
            for (const ballPartial of newHands[i] as PartialBall[]) {
                let ball: Ball;
                if (ballPartial.id !== undefined) {
                    if (!state.onTable.has(ballPartial.id)) {
                        this.logError(
                            beat,
                            "Error",
                            `Can't take ${stringifyBall(ballPartial)} from the table.\nTable's content: ${stringifyTable(state.onTable)}\nContinues without tossing a ball.`
                        );
                        continue;
                    }
                    ball = state.onTable.get(ballPartial.id)!;
                } else {
                    const matches: Ball[] = [];
                    for (const ball of state.onTable.values()) {
                        if (ball.name === ballPartial.name) {
                            matches.push(ball);
                        }
                    }
                    if (matches.length === 0) {
                        this.logError(
                            beat,
                            "Error",
                            `Can't take ${stringifyBall(ballPartial)} from the table.\nTable's content: ${stringifyTable(state.onTable)}\nContinues without tossing a ball.`
                        );
                        continue;
                    } else if (matches.length > 1) {
                        this.logError(
                            beat,
                            "Warn",
                            `Multiple balls ${stringifyBall(ballPartial)} can be taken from the table. This ambiguity may have consequences later.\nTable's content: ${stringifyTable(state.onTable)}\n${stringifyBall(matches[matches.length - 1])}.`
                        );
                    }
                    ball = matches[0];
                }
                state.onTable.delete(ball.id);
                state.held[i].push(ball);
            }
        }
        return state;
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
        hands?: { old: BallsInHands; new: BallsInHands };
        tempo: Fraction;
    } {
        // Manage state.
        const eventBeat = this.events[nextEventIdx][0];
        const { hands, tosses, tempo } = this.events[nextEventIdx][1];
        let handsInfo: { old: BallsInHands; new: BallsInHands } | undefined = undefined;
        state = this.descendAirborneBalls(eventBeat, state);
        if (hands !== undefined) {
            const oldHands = [[...state.held[0]], [...state.held[1]]] as BallsInHands;
            state = this.swapBalls(eventBeat, state, hands);
            const newHands = [[...state.held[0]], [...state.held[1]]] as BallsInHands;
            handsInfo = { old: oldHands, new: newHands };
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
                ball: toss.ball
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
