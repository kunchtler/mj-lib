import Fraction from "fraction.js";
import { parseMusicalSiteswap, ParserToss, ParserTossMode } from "../parser/MusicalSiteswap";
import { MusicBeatConverter, MusicTempo } from "./MusicBeatConverter";
import {
    SchedulerEvent,
    PartialTossMode,
    PartialBall,
    FracSortedList,
    isInRhythm,
    XOR,
    FracTimeline,
    Ball,
    SchedulerParams,
    Scheduler
} from "./Scheduler";
import { closestWordsTo } from "../utils/LevenshteinDistance";
import { setIntersection } from "../utils/SetOperations";
import { TimedErrorLogger } from "../utils/ErrorLogger";
import { formatRawEventInput, JugglingAppParams } from "./JugglingApp";
import { stringifyEvents, stringifyFraction, stringifyHandSide } from "../utils/stringifyEvent";

//TODO : Rewrite more cleanly with Immer.js ?

//TODO : add beat to the object rather than have a 2-array element.
//TODO : useHand ?
export type RawPreParserEvent = {
    tempo?: string;
    hands?: [string[], string[]];
    pattern?: string /*; useHand?: "L" | "R" */;
};

export type PreParserEvent = {
    tempo?: Fraction;
    hands?: [string[], string[]];
    pattern?: string /*; useHand?: "L" | "R" */;
};

//TODO : Rename
//TODO : Rename InputEvent as part of MDN.
//TODO : Handle Jugglers having different balls at start.
// export interface ParserToSchedulerParams {
//     jugglers: Map<string, FracSortedList<PreParserEvent>>;
//     ballNames?: Set<string>;
//     ballIDs?: Map<string, string>;
//     musicConverter?: MusicBeatConverter;
// }

export interface ParserToSchedulerParams {
    jugglers: Map<string, { events: FracSortedList<PreParserEvent>; balls: Ball[] }>;
    ballNames: Set<string>;
    ballIDs: Map<string, { name: string }>;
    musicConverter?: MusicBeatConverter;
}

//Add to Raw -> Not Raw that time can be a Fraction already, or a normal number, or a bigint.

//TODO: signature -> timesignature.

export function transformParserParamsToSchedulerParams({
    jugglers,
    ballNames,
    ballIDs,
    musicConverter
}: ParserToSchedulerParams): SchedulerParams {
    // TODO : Handle elsewhere. We should give properly formatted ballNames and IDs.
    // TODO : Handle Error flow.
    // TODO : Is in rhythm ?
    // 1. Fill ballNames / ballIDs if they don't exist.
    // ({ ballNames, ballIDs } = formatBallNamesAndIDs({ ballNames: ballNames, ballIDs: ballIDs }));
    // 2. Check if ballIDs correctly refer to ballNames and that they aren't duplicates.
    checkBallNamesAndIDs(ballNames, ballIDs);

    const errorLogger = new TimedErrorLogger();
    const newParams: SchedulerParams = { jugglers: new Map() };
    for (const [jugglerName, { balls, events }] of jugglers) {
        // 1. Parse each pattern
        // + order them chronoligically (two events or patterns might clash)
        // + add the right beat / tempo information.
        const events1: FracSortedList<{
            tempo: Fraction;
            newDefaultHand?: "L" | "R";
            hands?: [string[], string[]];
            tosses?: {
                from: { hand?: "L" | "R" };
                to: { juggler?: string; hand?: "L" | "R" | "x" };
                ball?: { nameOrID: string };
                mode: ParserTossMode;
            }[];
        }> = parsePatterns(events, errorLogger, jugglerName);

        // 2. In case some events are duplicated, attempt to fuse them.
        const events2 = fuseDuplicateBeats(events1, errorLogger, jugglerName);

        // 3. Add empty tosses array if event has no tosses.
        const events3: FracSortedList<{
            tempo: Fraction;
            newDefaultHand?: "L" | "R";
            hands?: [string[], string[]];
            tosses: {
                from: { hand?: "L" | "R" };
                to: { juggler?: string; hand?: "L" | "R" | "x" };
                ball?: { nameOrID: string };
                mode: ParserTossMode;
            }[];
        }> = addTossesToAllEvents(events2);

        // 4. Transform the mode into a height / target beat.
        const events4: FracSortedList<{
            tempo: Fraction;
            newDefaultHand?: "L" | "R";
            hands?: [string[], string[]];
            tosses: {
                from: { hand?: "L" | "R" };
                to: { juggler?: string; hand?: "L" | "R" | "x" };
                ball?: { nameOrID: string };
                mode: PartialTossMode;
            }[];
        }> = formatMode(events3, errorLogger, musicConverter);

        // 5. Add from beat field.
        const events5: FracSortedList<{
            tempo: Fraction;
            newDefaultHand?: "L" | "R";
            hands?: [string[], string[]];
            tosses: {
                from: { hand?: "L" | "R"; beat: Fraction };
                to: { juggler?: string; hand?: "L" | "R" | "x" };
                ball?: { nameOrID: string };
                mode: PartialTossMode;
            }[];
        }> = addFromBeatToAllEvents(events4);

        // 6. Some events may be useless (height 0 for instance). Remove them.
        const events6 = filterEmptyEvents(events5);

        // 7. If a juggler name is missing, fill it in with the current juggler.
        const events7: FracSortedList<{
            tempo: Fraction;
            newDefaultHand?: "L" | "R";
            hands?: [string[], string[]];
            tosses: {
                from: { juggler: string; hand?: "L" | "R"; beat: Fraction };
                to: { juggler: string; hand?: "L" | "R" | "x" };
                ball?: { nameOrID: string };
                mode: PartialTossMode;
            }[];
        }> = addMissingJugglerNames(events6, jugglerName);

        // 7. Check if the juggler names are valid juggler names.
        checkJugglerNames(events7, new Set(jugglers.keys()), errorLogger);

        // 8. Identify if the held balls string refer to a ball name or a ball ID.
        const events8: FracSortedList<{
            tempo: Fraction;
            newDefaultHand?: "L" | "R";
            hands?: [PartialBall[], PartialBall[]];
            tosses: {
                from: { juggler: string; hand?: "L" | "R"; beat: Fraction };
                to: { juggler: string; hand?: "L" | "R" | "x" };
                ball?: { nameOrID: string };
                mode: PartialTossMode;
            }[];
        }> = formatHeldBalls(events7, ballNames, ballIDs, errorLogger);

        // 9. Identify if the held balls string refer to a ball name or a ball ID.
        const events9: FracSortedList<{
            tempo: Fraction;
            newDefaultHand?: "L" | "R";
            hands?: [PartialBall[], PartialBall[]];
            tosses: {
                from: { juggler: string; hand?: "L" | "R"; beat: Fraction };
                to: { juggler: string; hand?: "L" | "R" | "x" };
                ball?: PartialBall;
                mode: PartialTossMode;
            }[];
        }> = formatThrownBalls(events8, ballNames, ballIDs, errorLogger);

        // 10. Infer the default hand on all events.
        const events10: FracSortedList<{
            tempo: Fraction;
            newDefaultHand: "L" | "R";
            hands?: [PartialBall[], PartialBall[]];
            tosses: {
                from: { juggler: string; hand?: "L" | "R"; beat: Fraction };
                to: { juggler: string; hand?: "L" | "R" | "x" };
                ball?: PartialBall;
                mode: PartialTossMode;
            }[];
        }> = addDefaultHandToAllEvents(events9, errorLogger, jugglerName);

        // TODO ? checkEventsInRhythm();

        // 11. Format the jugglers balls.
        errorLogger.logErrors();
        newParams.jugglers.set(jugglerName, { events: events10, balls: balls });
    }
    return newParams;
}

export function compareEvents<T>(ev1: [Fraction, T], ev2: [Fraction, T]) {
    return ev1[0].compare(ev2[0]);
}

function sortEvents<T>(events: FracSortedList<T>): FracSortedList<T> {
    return [...events].sort(compareEvents);
}

//TODO : Pass juggler name to help with errorlogger ?
//TODO : ErrorLogger so that if a juggler fails, we can keep going with other juggler.
function parsePatterns(
    events: FracSortedList<PreParserEvent>,
    errorLogger: TimedErrorLogger,
    jugglerName: string
): FracSortedList<Tempo & Partial<NewDefaultHand & Tosses<ParserToss> & Hands<string>>> {
    if (events.length === 0) {
        return [];
    }
    const tempoChangesArray: [Fraction, Fraction][] = [];
    for (const [beat, ev] of events) {
        if (ev.tempo !== undefined) {
            tempoChangesArray.push([beat, ev.tempo]);
        }
    }
    if (tempoChangesArray.length === 0) {
        errorLogger.addError(
            events[0][0],
            "CriticalError",
            `${jugglerName}: Missing starting tempo indication.`
        );
        return [];
    }
    const tempoChanges = new FracTimeline(tempoChangesArray);
    const initialTempo = tempoChanges.begin().pointer[1];
    const newEvents: FracSortedList<
        Tempo & Partial<NewDefaultHand & Tosses<ParserToss> & Hands<string>>
    > = [];
    // let lastPatternBeat: Fraction | null = null;
    for (const [beat, ev] of events) {
        // We have to add the hands information to the first element of the pattern.
        // We remember its position to add them later.
        const lastEventsLength = newEvents.length;
        if (ev.pattern !== undefined) {
            let currentBeat = beat;
            const patternEvents = parseMusicalSiteswap(ev.pattern);
            for (const patternEv of patternEvents) {
                const tempo = tempoChanges.prevEvent(currentBeat)[1] ?? initialTempo;
                newEvents.push([currentBeat, { ...patternEv, tempo: tempo }]);
                currentBeat = currentBeat.add(tempo);
            }
            // Warn if a pattern is intertwined with another.
            // if (lastPatternBeat !== null && beat.lte(lastPatternBeat)) {
            //     errorLogger.addError(beat, "Warn", "TODO");
            // }
            // if (lastPatternBeat === null || lastPatternBeat.gt(beat)) {
            //     lastPatternBeat = beat;
            // }
        }
        if (lastEventsLength === newEvents.length) {
            // If no events were added, we should still add an event with the
            // new tempo (and with the new hands, which we'll add later).
            const tempo = tempoChanges.prevEvent(beat)[1] ?? initialTempo;
            newEvents.push([beat, { tempo: tempo }]);
        }
        newEvents[lastEventsLength][1].hands = ev.hands;
    }
    return sortEvents(newEvents);
}

type Tosses<TossT> = { tosses: TossT[] };
type Tempo = { tempo: Fraction };
type NewDefaultHand = { newDefaultHand: "L" | "R" };

//TODO : Rename newDefaulHand to defaultHand everywhere ?
function fuseDuplicateBeats<TossT, T extends Partial<Tosses<TossT> & Tempo & NewDefaultHand>>(
    events: FracSortedList<T>,
    errorLogger: TimedErrorLogger,
    jugglerName: string
): FracSortedList<T> {
    if (events.length === 0) {
        return [];
    }
    events = sortEvents(events);
    const newEvents: FracSortedList<T> = [events[0]];
    for (let i = 1; i < events.length; i++) {
        const [beat, ev] = events[i];
        if (!newEvents[newEvents.length - 1][0].equals(beat)) {
            newEvents.push([beat, ev]);
        } else {
            const { tosses: tosses1, tempo: tempo1, newDefaultHand: newDefaultHand1 } = ev;
            const {
                tosses: tosses2,
                tempo: tempo2,
                newDefaultHand: newDefaultHand2
            } = newEvents[newEvents.length - 1][1];

            let newTosses: TossT[] | undefined = undefined;
            if (tosses1 !== undefined && tosses2 !== undefined) {
                newTosses = tosses1.concat(tosses2);
            } else {
                newTosses = tosses1 ?? tosses2;
            }

            let newTempo: Fraction | undefined = undefined;
            if (tempo1 !== undefined && tempo2 !== undefined) {
                if (!tempo1.equals(tempo2)) {
                    errorLogger.addError(
                        beat,
                        "Error",
                        `${jugglerName}: Two different tempos (${tempo1.toString()} and ${tempo2.toString()})are defined on same beat. Proceeding by taking the first one.`
                    );
                }
                newTempo = tempo2;
            } else {
                newTempo = tempo1 ?? tempo2;
            }

            let newNewDefaultHand: "L" | "R" | undefined = undefined;
            if (newDefaultHand1 !== undefined && newDefaultHand2 !== undefined) {
                if (newDefaultHand1 !== newDefaultHand2) {
                    errorLogger.addError(
                        beat,
                        "Error",
                        `${jugglerName}: Two different newDefaultHands (${stringifyHandSide(newDefaultHand1)} and ${stringifyHandSide(newDefaultHand2)}) defined on same beat. Proceeding by taking the first one.`
                    );
                }
                newNewDefaultHand = newDefaultHand2;
            } else {
                newNewDefaultHand = newDefaultHand1 ?? newDefaultHand2;
            }

            newEvents[newEvents.length - 1][1] = {
                tosses: newTosses,
                tempo: newTempo,
                newDefaultHand: newNewDefaultHand
            } as T;
        }
    }
    return newEvents;
}

//TODO : Correct Partial/Required Types
//TODO : Make sure empty list events works.
// function addTempoToAllEvents<T extends Partial<Tempo>>(
//     events: FracSortedList<T>,
//     errorLogger: TimedErrorLogger
// ): FracSortedList<T & Tempo> {
//     if (events.length === 0) {
//         return [];
//     }
//     if (events[0][1].tempo === undefined) {
//         errorLogger.addError(events[0][0], "CriticalError", "Missing starting tempo indication");
//         return [];
//     }
//     let tempo = events[0][1].tempo;
//     const newEvents: FracSortedList<T & Tempo> = [];
//     for (const [beat, ev] of events) {
//         if (ev.tempo !== undefined) {
//             tempo = ev.tempo;
//         }
//         newEvents.push([beat, { ...ev, tempo: tempo }]);
//     }
//     return newEvents;
// }

//TODO : Typescript unkown where possible
function addFromBeatToAllEvents<TossT extends Partial<{ from: object }>, T>(
    events: FracSortedList<T & Tosses<TossT>>
): FracSortedList<T & Tosses<TossT & FromBeat>> {
    const newEvents: FracSortedList<T & Tosses<TossT & FromBeat>> = [];
    for (const [beat, ev] of events) {
        const newTosses: (TossT & FromBeat)[] = [];
        for (const toss of ev.tosses) {
            newTosses.push({ ...toss, from: { ...toss.from, beat: beat } });
        }
        newEvents.push([beat, { ...ev, tosses: newTosses }]);
    }
    return newEvents;
}

//Rename TimedErrorLogger.logError/addError method. Misleading name.
function addDefaultHandToAllEvents<T extends Partial<NewDefaultHand> & Tempo>(
    events: FracSortedList<T>,
    errorLogger: TimedErrorLogger,
    jugglerName: string
): FracSortedList<T & NewDefaultHand> {
    if (events.length === 0) {
        return [];
    }
    let lastDefaultHand: "L" | "R";
    if (events[0][1].newDefaultHand === undefined) {
        errorLogger.addError(
            events[0][0],
            "Warn",
            `${jugglerName}: No starting hand detected. We assume they will start with their right hand on beat ${events[0][0].toString()}.`
        );
        lastDefaultHand = "R";
    } else {
        lastDefaultHand = events[0][1].newDefaultHand;
    }
    let lastBeat = events[0][0];
    let lastTempo = events[0][1].tempo;
    const newEvents: FracSortedList<T & NewDefaultHand> = [];
    for (const [beat, ev] of events) {
        // TODO : Elsewhere.
        // 1. Check if event is on rhythm nice and dandy.
        // if (!isInRhythm(beat, lastBeat, ev.tempo)) {
        //     const nbSteps = beat.sub(lastBeat).div(ev.tempo).floor();
        //     const prevBeat = beat.add(ev.tempo).mul(nbSteps);
        //     errorLogger.addError(
        //         beat,
        //         "Error",
        //         `An event happens offbeat.\n$TODO's previous beat: ${prevBeat.toString()}.\nTempo: ${stringifyFraction(ev.tempo)}.\nEvent's beat: ${beat.toString()}.`
        //     );
        //TODO : Check if alright ?
        // }
        if (ev.newDefaultHand !== undefined) {
            lastDefaultHand = ev.newDefaultHand;
        } else {
            const nbSteps = beat.sub(lastBeat).div(lastTempo);
            if (!nbSteps.divisible(1)) {
                //TODO : Handle elsewhere, or gracefully here (by taking next event).
                // errorLogger.addError(beat, "Error", )
                throw Error("TODO");
            }
            lastDefaultHand = XOR(nbSteps.divisible(2), lastDefaultHand === "R") ? "L" : "R";
        }
        newEvents.push([beat, { ...ev, newDefaultHand: lastDefaultHand }]);
        lastBeat = beat;
        lastTempo = ev.tempo;
    }
    return newEvents;
}

function addTossesToAllEvents<TossT, T>(
    events: FracSortedList<T & Partial<Tosses<TossT>>>
): FracSortedList<T & Tosses<TossT>> {
    const newEvents: FracSortedList<T & Tosses<TossT>> = [];
    for (const [beat, ev] of events) {
        newEvents.push([beat, { ...ev, tosses: ev.tosses ?? [] }]);
    }
    return newEvents;
}

export type DeepRequired<T> = {
    [K in keyof T]: Required<DeepRequired<T[K]>>;
};
export type DeepPartial<T> = {
    [K in keyof T]: Partial<DeepPartial<T[K]>>;
};

type TossJuggler = { to: { juggler: string }; from: { juggler: string } };

//TODO : tosses empty list at some point instead of undefined ?
function addMissingJugglerNames<TossT, T>(
    events: FracSortedList<T & Tosses<TossT & DeepPartial<TossJuggler>>>,
    defaultJugglerName: string
): FracSortedList<T & Tosses<TossT & TossJuggler>> {
    const newEvents: FracSortedList<T & Tosses<TossT & TossJuggler>> = [];
    for (const [beat, ev] of events) {
        const newTosses: (TossT & TossJuggler)[] = [];
        for (const toss of ev.tosses) {
            const toJuggler = toss.to.juggler ?? defaultJugglerName;
            const fromJuggler = toss.from.juggler ?? defaultJugglerName;
            newTosses.push({
                ...toss,
                to: { ...toss.to, juggler: toJuggler },
                from: { ...toss.from, juggler: fromJuggler }
            });
        }
        newEvents.push([beat, { ...ev, tosses: newTosses }]);
    }
    return newEvents;
}

function checkJugglerNames<TossT extends TossJuggler, T extends Tosses<TossT>>(
    events: FracSortedList<T>,
    jugglerNames: Set<string>,
    errorLogger: TimedErrorLogger
): void {
    for (const [beat, ev] of events) {
        for (const toss of ev.tosses) {
            if (!jugglerNames.has(toss.from.juggler)) {
                handleUnkownName(toss.from.juggler, jugglerNames, "juggler", errorLogger, beat);
            }
            if (!jugglerNames.has(toss.to.juggler)) {
                handleUnkownName(toss.to.juggler, jugglerNames, "juggler", errorLogger, beat);
            }
        }
    }
}

type BallNameAndID = { name: string; id?: string };
type TossBall<BallT> = { ball: BallT };
type Hands<BallT> = { hands: [BallT[], BallT[]] };

//TODO : Fuse TossBallNameOrId so that it uses field ball in objetc to have one huge printing function.
//TODO : Check that ballIDs values are valid ballNames in another function.
//TODO : Unconsistent way across functions of defining generic type.
function formatThrownBalls<TossT, T>(
    events: FracSortedList<T & Tosses<TossT & Partial<TossBall<{ nameOrID: string }>>>>,
    ballNames: Set<string>,
    ballIDs: Map<string, { name: string }>,
    errorLogger: TimedErrorLogger
): FracSortedList<T & Tosses<TossT & Partial<TossBall<PartialBall>>>> {
    const newEvents: FracSortedList<T & Tosses<TossT & Partial<TossBall<BallNameAndID>>>> = [];
    for (const [beat, ev] of events) {
        const newTosses: (TossT & Partial<BallNameAndID>)[] = [];
        for (const toss of ev.tosses) {
            const ball: BallNameAndID | undefined =
                toss.ball?.nameOrID === undefined
                    ? undefined
                    : getBall(toss.ball.nameOrID, ballNames, ballIDs, errorLogger, beat);
            newTosses.push({ ...toss, ball: ball });
        }
        newEvents.push([beat, { ...ev, tosses: newTosses }]);
    }
    return newEvents;
}

function getBall(
    ballNameOrID: string | undefined,
    ballNames: Set<string>,
    ballIDs: Map<string, { name: string }>,
    errorLogger: TimedErrorLogger,
    beat: Fraction
): { name: string; id?: string } | undefined {
    if (ballNameOrID === undefined) {
        return undefined;
    } else if (ballNames.has(ballNameOrID)) {
        return { name: ballNameOrID };
    } else if (ballIDs.has(ballNameOrID)) {
        // const ballID = toss.ballNameOrID;
        // const ballName = ballIDs.get(toss.ballNameOrID)!;
        // if (!ballNames.has(ballName)) {
        //     errorLogger.addError(beat, "CriticalError", `Ball with ID`)
        // }
        return { name: ballIDs.get(ballNameOrID)!.name, id: ballNameOrID };
    }
    handleUnkownName(ballNameOrID, [...ballNames, ...ballIDs.keys()], "ball", errorLogger, beat);
    return undefined;
}

function formatHeldBalls<T>(
    events: FracSortedList<T & Partial<Hands<string>>>,
    ballNames: Set<string>,
    ballIDs: Map<string, { name: string }>,
    errorLogger: TimedErrorLogger
): FracSortedList<T & Partial<Hands<BallNameAndID>>> {
    const newEvents: FracSortedList<T & Partial<Hands<BallNameAndID>>> = [];
    for (const [beat, ev] of events) {
        let newHands: [BallNameAndID[], BallNameAndID[]] | undefined;
        if (ev.hands !== undefined) {
            newHands = [[], []];
            for (let i = 0; i < 2; i++) {
                for (const ball of ev.hands[i]) {
                    const newBall = getBall(ball, ballNames, ballIDs, errorLogger, beat);
                    if (newBall === undefined) {
                        continue;
                    }
                    newHands[i].push(newBall);
                }
            }
        } else {
            newHands = undefined;
        }
        newEvents.push([beat, { ...ev, hands: newHands }]);
    }
    return newEvents;
}

function handleUnkownName(
    name: string,
    namesList: Iterable<string>,
    nameCategory: string,
    errorLogger: TimedErrorLogger,
    beat: Fraction
): void {
    let text = `Unknown ${nameCategory} : "${name}".`;
    const closeMatches = closestWordsTo(name, namesList, 2);
    if (closeMatches.length > 0) {
        text += ` Did you mean "${closestWordsTo(name, namesList, 2)}" ?`;
    }
    errorLogger.addError(beat, "CriticalError", text);
}

type FromBeat = { from: { beat: Fraction } };

function filterEmptyEvents<
    HandT,
    TossT,
    T extends Partial<Tosses<TossT & { mode: PartialTossMode } & FromBeat>> &
        Partial<Tempo & NewDefaultHand & Hands<HandT>>
>(events: FracSortedList<T>): FracSortedList<T> {
    // Static function to filter tosses.
    function keepToss(toss: TossT & { mode: PartialTossMode } & FromBeat): boolean {
        return (
            (toss.mode.type === "Height" && toss.mode.height > 0) ||
            (toss.mode.type === "Beat" && toss.mode.beat.gt(toss.from.beat))
        );
    }

    // Remove events with no usefull toss and other information.
    const newEvents: FracSortedList<T> = [];
    let lastTempo: Fraction | null = null;
    for (const [beat, ev] of events) {
        const newTosses = ev.tosses?.filter(keepToss);
        if (
            !(
                (newTosses === undefined || newTosses.length === 0) &&
                (ev.tempo === undefined || lastTempo?.equals(ev.tempo)) &&
                ev.newDefaultHand === undefined &&
                ev.hands === undefined
            )
        ) {
            newEvents.push([beat, { ...ev, tosses: newTosses }]);
        }
        lastTempo = ev.tempo ?? lastTempo;
    }
    return newEvents;
}

function formatMode<TossT, T>(
    events: FracSortedList<T & Tosses<TossT & { mode: ParserTossMode }>>,
    errorLogger: TimedErrorLogger,
    musicConverter?: MusicBeatConverter
): FracSortedList<T & Tosses<TossT & { mode: PartialTossMode }>> {
    const newEvents: FracSortedList<T & Tosses<TossT & { mode: PartialTossMode }>> = [];
    for (const [beat, ev] of events) {
        const newTosses: (TossT & { mode: PartialTossMode })[] = [];
        for (const toss of ev.tosses) {
            let mode: PartialTossMode;
            if (toss.mode.type === "Height") {
                mode = { ...toss.mode };
            } else if (toss.mode.type === "AbsBeat") {
                mode = { type: "Beat", beat: toss.mode.beat };
            } else if (toss.mode.type === "AbsMeasureBeat") {
                if (musicConverter === undefined) {
                    errorLogger.addError(
                        beat,
                        "CriticalError",
                        "No Signature information was provided to be able to use measures. TODO."
                    );
                    continue;
                }
                mode = {
                    type: "Beat",
                    beat: musicConverter.convertMeasureToBeat(toss.mode.measureBeat)
                };
            } else {
                mode = { type: "Beat", beat: beat.add(toss.mode.beat) };
            }
            newTosses.push({ ...toss, mode: mode });
        }
        newEvents.push([beat, { ...ev, tosses: newTosses }]);
    }
    return newEvents;
}

//TODO : Mode loop / loops out of the way into main function if possible !

function checkBallNamesAndIDs(
    ballNames: Set<string>,
    ballIDs: Map<string, { name: string }>
): void {
    const inter = setIntersection(ballNames, new Set(ballIDs.keys()));
    let text = "";
    if (inter.size > 0) {
        for (const name of inter) {
            text += `Ball ${name} is both a name and an ID.\n`;
        }
    }
    for (const [ballID, { name: ballName }] of ballIDs) {
        if (!ballNames.has(ballName)) {
            text += `Ball with ID ${ballID} has unknown ball name ${ballName}.\n`;
        }
    }
    if (text !== "") {
        throw Error(text);
    }
}

//TODO
// function formatBallNamesAndIDs({
//     ballNames,
//     ballIDs
// }: {
//     ballNames?: Set<string>;
//     ballIDs?: Map<string, { name: string }>;
// }): { ballNames: Set<string>; ballIDs: Map<string, string> } {
//     if (ballNames === undefined) {
//         for (const { name } of ballIDs.values())
//             ballNames = new Set(ballIDs !== undefined ? ballIDs.values() : []);
//     }
//     if (ballIDs === undefined) {
//         ballIDs = new Map();
//     }
//     return { ballNames: ballNames, ballIDs: ballIDs };
// }

// Testing
// const commonBallNames = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si", "Do'"];
// const ballsVincent: Ball[] = [];
// const ballsFlorent: Ball[] = [
//     { name: "Mi'", id: "Mi'?F" },
//     { name: "Fa#", id: "Fa#?F" }
// ];
// for (const name of commonBallNames) {
//     ballsVincent.push({ name: name, id: name + "?V" });
//     ballsFlorent.push({ name: name, id: name + "?F" });
// }
// const ballNames = new Set<string>();
// const ballIDs = new Map<string, string>();
// for (const { name, id } of ballsVincent) {
//     ballNames.add(name);
//     ballIDs.set(id, name);
// }
// for (const { name, id } of ballsFlorent) {
//     ballNames.add(name);
//     ballIDs.set(id, name);
// }
// const rawPattern = "3";
// const rawPattern = "L404[Sol4 Do'5]1";
// const rawPattern = "R3 (1x {12} e)^3 (4,[82x]) (1, 0)! L5x 7";
// const rawPattern = "{M1B1/4}303{Do B5}{B6/1}{+B2 x}";
// const rawPattern = "LBo3"; //Should Fail
// const rawEvents: [string, RawPreParserEvent][] = [
//     ["0", {tempo: "1", pattern: rawPattern}]
// ];
// const musicConverter = undefined;
// const musicConverter = new MusicBeatConverter(
//     [[0, new Fraction("3/4")]],
//     [[0, { note: new Fraction("1/4"), bpm: 160 }]]
// );
// // prettier-ignore
// const rawEventsVincent: [string, RawPreParserEvent][] = [
//     ["-1, 1/4", { tempo: "1/4", hands: [["Mi", "Do"], ["Sol"]], pattern: "L40441001" }],
//     ["3, 1/4", { hands: [["Mi", "Do"], ["Sol"]], pattern: "L40441001" }],
//     ["7, 1/4", { hands: [["Fa", "Re"], ["La"]], pattern: "L40441001" }],
//     ["11, 1/4", { hands: [["Fa", "Re"], ["La"]], pattern: "L40441001" }],
//     // prettier-ignore
//     ["15, 1/4", { hands: [["Mi", "Do"], ["Do'", "Sol"]], pattern: "L404[Sol4Do'5]" }],
//     // prettier-ignore
//     ["19, 1/4", { hands: [["Mi", "Do"], ["Do'", "Sol"]], pattern: "L404[Sol4Do'5]" }],
//     ["23, 1/4", { hands: [["Fa", "Re"], ["La"]], pattern: "L40441001" }],
//     ["28, 2/4", { hands: [["Re"], ["Do'"]], pattern: "R2201" }],
//     ["31, 2/4", { hands: [["Do"], []], pattern: "L1" }],
//     ["32, 0", { tempo: "1/8", pattern: "11" }],
//     ["32, 1/4", { tempo: "1/4", pattern: "1" }]
// ];
// // prettier-ignore
// const rawEventsFlorent: [
//     string,
//     { tempo?: string; hands?: [string[], string[]]; pattern?: string }
// ][] = [
//     ["1, 2/4", { tempo: "1/4", hands: [["Mi"], ["Sol"]], pattern: "R3501001" }],
//     ["5, 2/4", { hands: [["Fa"], ["Sol"]], pattern: "R3501001" }],
//     ["9, 2/4", { hands: [["Fa"], ["La"]], pattern: "R3501001" }],
//     ["13, 2/4", { hands: [["Mi"], ["La"]], pattern: "R3501001" }],
//     ["17, 2/4", { hands: [["Sol"], ["Do'"]], pattern: "R3501001" }],
//     ["21, 2/4", { hands: [["La"], ["Do'"]], pattern: "R3501001" }],
//     ["26, 1/4", { hands: [["Mi'", "Fa#"], ["Sol"]], pattern: "L3(3^2)" }],
//     ["29, 1/4", { hands: [["Do", "La"], ["Sol", "Re"]], pattern: "R445x5x" }],
// ]
// const eventsVincent = formatRawEventInput(rawEventsVincent, musicConverter);
// const eventsFlorent = formatRawEventInput(rawEventsFlorent, musicConverter);
// const params: ParserToSchedulerParams = {
//     ballNames: ballNames,
//     ballIDs: ballIDs,
//     jugglers: new Map([
//         // ["NoName", { events: events, balls: balls }]
//         ["Vincent", { events: eventsVincent, balls: ballsVincent }],
//         ["Florent", { events: eventsFlorent, balls: ballsFlorent }]
//     ]),
//     musicConverter: musicConverter
// };
// const preSchedulerEvents = transformParserParamsToSchedulerParams(params);
// console.log("Before Scheduler:\n\n");
// console.log(
//     stringifyEvents<SchedulerEvent>(
//         preSchedulerEvents.jugglers.get("Vincent")!.events,
//         musicConverter
//     )
// );
// const scheduler = new Scheduler(preSchedulerEvents);
// const res = scheduler.validatePattern();
// console.log("\n\n");
// console.log("After Simulator:\n\n");
// console.log(stringifyEvents(res.get("Vincent")!.events, musicConverter));
