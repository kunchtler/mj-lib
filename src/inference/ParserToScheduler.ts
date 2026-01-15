import Fraction from "fraction.js";
import { parseMusicalSiteswap, ParserTossMode } from "../parser/MusicalSiteswap";
import { ScoreConverter } from "./ScoreConverter";
import { FracTimedErrorLogger, TimedErrorLogger } from "../utils/TimedErrorLogger";
import { stringifyFraction } from "../utils/stringifyEvent";
import { HandsInstructions, JugglingPhrase } from "./PerformanceDescription";
import { TossMode, SchedulerEvent } from "./Scheduler";
import { XOR } from "../utils/Operations";
import { produce, current } from "immer";
import { handleIfNameUnknown } from "./PatternToModel";

//TODO : Expurge FracSortedList.
//TODO : Handle error on creation of ScoreConverter (in case no tempo or other) by putting one by default. Either have no error or keep error but provide default value when calling the class ?

type HybridToss = {
    from: { hand?: "L" | "R" };
    to: { juggler?: string; hand?: "L" | "R" | "x" };
    ball?: { nameOrID: string } | { name: string } | { id: string };
    mode: ParserTossMode | TossMode;
};

//TODO : useHand ?
type HybridEvent = {
    beat: Fraction;
    tempo?: Fraction;
    defaultHand?: "L" | "R";
    setupHands?: HandsInstructions;
    tosses?: HybridToss[];
};

//TODO: signature -> timesignature.
// TODO : Handle Error flow.
// TODO : Is in rhythm ?

//TODO : What about params ? Rather pass the same thing than the preivous step ?
//TODO : Check the comments.

export function formatJugglerPhrasesForScheduler(
    jugglingPhrase: JugglingPhrase[],
    jugglerName: string,
    ballTemplateNames: Set<string>,
    ballUserIDs: Map<string, string>,
    jugglerNames: Set<string>,
    errorLogger: TimedErrorLogger<Fraction>,
    scoreConverter?: ScoreConverter
): SchedulerEvent[] | undefined {
    // 1. Sort the events array.
    const sortedPhrases = copyAndSort(jugglingPhrase, (a, b) => a.startTime.compare(b.startTime));

    // 2. Find the initial tempo.
    const startingTempo = findOrCreateStartingTempo(sortedPhrases, jugglerName, errorLogger);

    // 3. Parse each pattern
    // + order them chronologically, and group them if needed.
    let events = parseJugglingPhrases(sortedPhrases, startingTempo, jugglerName, errorLogger);

    if (errorLogger.hasCriticalError()) {
        return undefined;
    }

    const startingHand = findOrCreateStartingHand(events, jugglerName, errorLogger);

    // 1.5. In case some events are duplicated, attempt to fuse them. NOW IMPOSSIBLE
    // const events2 = fuseDuplicateBeats(events1, errorLogger, jugglerName);

    // 4. Add empty tosses array if event has no tosses.
    events = addTossesToAllEvents(events);

    // 5. Transform the mode into a height / target beat.
    events = formatMode(events, errorLogger, scoreConverter);

    if (errorLogger.hasCriticalError()) {
        return undefined;
    }

    // 4. Add from beat field. HAS BEEN REMOVED.

    // 6. Some events may be useless (height 0 for instance). Remove them.
    events = filterUselessTossesAndEvents(events);

    // 7. If a juggler name is missing, fill it in with the current juggler.
    events = addMissingToJuggler(events, jugglerName);

    // 8. Check if the juggler names are valid juggler names.
    checkJugglerNames(events, jugglerNames, errorLogger);

    // 8. Identify if the held balls string refer to a ball name or a ball ID. NOT NEEDED NOW as Id or Name must be explicitely mentioned in the description.
    // events = formatHeldBalls(events, ballNames, ballIDs, jugglerName, errorLogger);

    // 9. Identify if the held balls string refer to a ball name or a ball ID.
    events = formatThrownBalls(events, ballTemplateNames, ballUserIDs, jugglerName, errorLogger);

    // 10. Infer the default hand on all events.
    events = addTempoAndDefaultHandAndFromHand(
        events,
        startingTempo,
        startingHand,
        jugglerName,
        errorLogger
    );

    // 11. Add tempo to all events. DONE In previous step.
    // events = addTempoToAllEvents(events, startingTempo);

    // Check if the error logger has failed critically, and exit with nothing.

    if (!areHybridEventsSchedulerEvents(events)) {
        throw Error("Wrong hybrid to scheduler events conversion. Shouldn't happen.");
    }

    return events;
}

function copyAndSort<T>(array: T[], compare: (a: T, b: T) => number) {
    return [...array].sort(compare);
}

/**
 * Parse the jugglingPhrases and return a list of events (that should be completed later).
 * @param jugglingPhrases the liste of juggling phrases.
 * @param errorLogger an error logger. Fails critically if two phrases are intertwined.
 * @param jugglerName the name of the juggler parsed (for error logging).
 * @returns
 */
function parseJugglingPhrases(
    jugglingPhrases: JugglingPhrase[],
    startingTempo: Fraction,
    jugglerName: string,
    errorLogger: FracTimedErrorLogger
): HybridEvent[] {
    const jugglingEvents: HybridEvent[] = [];
    // Keeps track of the beat to add events on the right time.
    // Is also used to confirm that two phrases don't end up intertwined.
    let currentTempo = startingTempo;
    let currentBeat: Fraction | null = null;
    for (const phrase of jugglingPhrases) {
        const phraseEvents: HybridEvent[] = [];

        // Warn if a pattern is intertwined with another.
        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
        if (currentBeat !== null && phrase.startTime.lt(currentBeat)) {
            errorLogger.logError({
                severity: "CriticalError",
                message: "Two juggling phrases are intertwined.",
                time: phrase.startTime
            });
        }

        if (phrase.withTempo !== undefined) {
            currentTempo = phrase.withTempo;
        }

        // Process the pattern
        if (phrase.pattern !== undefined) {
            currentBeat = phrase.startTime;
            const patternEvents = parseMusicalSiteswap(phrase.pattern);
            for (const patternEv of patternEvents) {
                phraseEvents.push({ ...patternEv, beat: currentBeat });
                currentBeat = currentBeat.add(currentTempo);
            }
        }

        // Add handsSetup to the first event of the phrase.
        if (phraseEvents.length === 0) {
            // We need to create an empty event first
            phraseEvents.push({ beat: phrase.startTime });
        }
        phraseEvents[0].setupHands = phrase.setupHands;
        phraseEvents[0].tempo = currentTempo;

        // Finally add all of this phrase's events to the big list.
        jugglingEvents.push(...phraseEvents);
    }

    // Add the startingTempo to the first event.
    if (jugglingEvents.length === 0) {
        return [{ beat: new Fraction(0), tempo: startingTempo }];
    }
    jugglingEvents[0].tempo ??= startingTempo;
    return jugglingEvents;
}

function areHybridEventsSchedulerEvents(
    jugglingEvents: HybridEvent[]
): jugglingEvents is SchedulerEvent[] {
    for (const ev of jugglingEvents) {
        if (!isHybridEventASchedulerEvent(ev)) {
            return false;
        }
    }
    return true;
}

function isHybridEventASchedulerEvent(ev: HybridEvent): ev is SchedulerEvent {
    if (ev.defaultHand === undefined || ev.tempo === undefined || ev.tosses === undefined) {
        return false;
    }
    for (const toss of ev.tosses ?? []) {
        if (
            (toss.ball !== undefined && "nameOrID" in toss.ball) ||
            toss.to.juggler === undefined ||
            toss.mode.type === "AbsBeat" ||
            toss.mode.type === "AbsMeasureBeat" ||
            toss.mode.type === "RelBeat" ||
            toss.from.hand === undefined
        ) {
            return false;
        }
    }
    return true;
}

//TODO : Rename newDefaulHand to defaultHand everywhere ?
// function fuseDuplicateBeats<TossT, T extends Partial<Tosses<TossT> & Tempo & NewDefaultHand>>(
//     events: FracSortedList<T>,
//     errorLogger: FracTimedErrorLogger,
//     jugglerName: string
// ): FracSortedList<T> {
//     if (events.length === 0) {
//         return [];
//     }
//     events = sortEvents(events);
//     const newEvents: FracSortedList<T> = [events[0]];
//     for (let i = 1; i < events.length; i++) {
//         const [beat, ev] = events[i];
//         if (!newEvents[newEvents.length - 1][0].equals(beat)) {
//             newEvents.push([beat, ev]);
//         } else {
//             const { tosses: tosses1, tempo: tempo1, newDefaultHand: newDefaultHand1 } = ev;
//             const {
//                 tosses: tosses2,
//                 tempo: tempo2,
//                 newDefaultHand: newDefaultHand2
//             } = newEvents[newEvents.length - 1][1];

//             let newTosses: TossT[] | undefined = undefined;
//             if (tosses1 !== undefined && tosses2 !== undefined) {
//                 newTosses = tosses1.concat(tosses2);
//             } else {
//                 newTosses = tosses1 ?? tosses2;
//             }

//             let newTempo: Fraction | undefined = undefined;
//             if (tempo1 !== undefined && tempo2 !== undefined) {
//                 if (!tempo1.equals(tempo2)) {
//                     errorLogger.logError({
//                         time: beat,
//                         severity: "Error",
//                         message: `${jugglerName}: Two different tempos (${tempo1.toString()} and ${tempo2.toString()})are defined on same beat. Proceeding by taking the first one.`
//                     });
//                 }
//                 newTempo = tempo2;
//             } else {
//                 newTempo = tempo1 ?? tempo2;
//             }

//             let newNewDefaultHand: "L" | "R" | undefined = undefined;
//             if (newDefaultHand1 !== undefined && newDefaultHand2 !== undefined) {
//                 if (newDefaultHand1 !== newDefaultHand2) {
//                     errorLogger.logError({
//                         time: beat,
//                         severity: "Error",
//                         message: `${jugglerName}: Two different newDefaultHands (${stringifyHandSide(newDefaultHand1)} and ${stringifyHandSide(newDefaultHand2)}) defined on same beat. Proceeding by taking the first one.`
//                     });
//                 }
//                 newNewDefaultHand = newDefaultHand2;
//             } else {
//                 newNewDefaultHand = newDefaultHand1 ?? newDefaultHand2;
//             }

//             newEvents[newEvents.length - 1][1] = {
//                 tosses: newTosses,
//                 tempo: newTempo,
//                 newDefaultHand: newNewDefaultHand
//             } as T;
//         }
//     }
//     return newEvents;
// }

// function addTempoToAllEvents(events: HybridEvent[], startingTempo: Fraction): HybridEvent[] {
//     return produce(events, (draft) => {
//         let tempo = startingTempo;
//         for (const ev of draft) {
//             if (ev.tempo !== undefined) {
//                 tempo = ev.tempo;
//             }
//             ev.tempo = tempo;
//         }
//     });
// }

// function addFromBeatToAllEvents(events: HybridEvent[]): HybridEvent[] {
//     return produce(events, (draft) => {
//         for (const ev of draft) {
//             for (const toss of ev.tosses ?? []) {
//                 toss.from.beat = ev.beat;
//             }
//         }
//     });
// }

function findOrCreateStartingTempo(
    jugglingPhrases: JugglingPhrase[],
    jugglerName: string,
    errorLogger: TimedErrorLogger<Fraction>
): Fraction {
    const startingTempoIdx = jugglingPhrases.findIndex((phrase) => {
        return phrase.withTempo !== undefined;
    });

    if (startingTempoIdx === -1) {
        errorLogger.logError({
            severity: "Warn",
            message: `${jugglerName}: Missing starting tempo indication. Continue by giving it a default value of "1".`
        });
        return new Fraction(1);
    }

    return jugglingPhrases[startingTempoIdx].withTempo!;
}

function findOrCreateStartingHand(
    events: HybridEvent[],
    // startingTempo: Fraction,
    jugglerName: string,
    errorLogger: TimedErrorLogger<Fraction>
): "R" | "L" {
    if (events[0].defaultHand === undefined) {
        errorLogger.logError({
            severity: "Warn",
            message: `${jugglerName}: Missing starting hand indication. The first toss will be made from the right hand. If you wish to change this behaviour, put that information in the siteswap by starting it with an L.`
        });
        return "R";
    }
    return events[0].defaultHand;
    // const startingHandIdx = events.findIndex((phrase) => {
    //     return phrase.defaultHand !== undefined;
    // });

    // // No default starting hand exist
    // if (startingHandIdx === -1) {
    //     errorLogger.logError({
    //         severity: "Warn",
    //         message: `${jugglerName}: Missing starting hand indication. The first toss will be made from the right hand. If you wish to change this behaviour, put that information in the siteswap by starting it with an L.`
    //     });
    //     return "R";
    // }

    // // There is a default starting hand, but it could have been defined very late
    // // in the pattern. So we need to compute (backwards) what the first hand
    // // would have been.

    // let nbSiteswapSteps = 0;
    // let lastTempo = startingTempo;
    // for (let i = 1; i < startingHandIdx + 1; i++) {
    //     const currentBeat = events[i].beat;
    //     const lastBeat = events[i - 1].beat;
    //     const nbStepsSinceLastEvent = currentBeat.sub(lastBeat).div(lastTempo);
    //     if (!nbStepsSinceLastEvent.divisible(1)) {
    //         const prevBeat = ev.beat.add(nbSteps.floor().mul(lastTempo));
    //         errorLogger.logError({
    //             severity: "Error",
    //             message: `${jugglerName}: beat ${stringifyFraction(ev.beat)} is offbeat.\n Previous beat: ${stringifyFraction(prevBeat)}.\nTempo: ${stringifyFraction(lastTempo)}.\nNumber of time steps between the previous beat and this beat: ${stringifyFraction(nbSteps)}.\n Hands may not alternate correctly.`
    //         });
    //     }
    //     nbSiteswapSteps = nbSiteswapSteps.add(nbStepsSinceLastEvent);
    // }

    // return jugglingPhrases[startingTempoIdx].withTempo!;
}

// function findInitialTempoIdx(jugglingPhrases: HybridEvent[]): number | undefined {
//     for (let i = 0; i < jugglingPhrases.length; i++) {
//         if (jugglingPhrases[i].tempo !== undefined) {
//             return i;
//         }
//     }
//     return undefined;
// }

// function addFromHandToAllEvents(
//     events: HybridEvent[],
//     jugglerName: string,
//     errorLogger: TimedErrorLogger<Fraction>
// ): HybridEvent[] {
//     return produce(events, (draft) => {
//         let lastDefaultHand: "L" | "R";
//         if (draft[0].defaultHand === undefined) {
//             errorLogger.logError({
//                 severity: "Log",
//                 message: `${jugglerName}: No starting hand detected. Assume they will start with their right hand on beat ${draft[0].beat.toString()}.`,
//                 time: draft[0].beat
//             });
//             lastDefaultHand = "R";
//         } else {
//             lastDefaultHand = draft[0].defaultHand;
//         }
//         let lastBeat = draft[0].beat;
//         if (draft[0].tempo === undefined) {
//             errorLogger.logError({
//                 severity: "CriticalError",
//                 message: `No initial tempo indication. TODO`
//             });
//             return;
//         }
//         let lastTempo = draft[0].tempo;
//         for (const ev of draft) {
//             if (ev.defaultHand !== undefined) {
//                 lastDefaultHand = ev.defaultHand;
//             } else {
//                 const nbSteps = ev.beat.sub(lastBeat).div(lastTempo);
//                 if (!nbSteps.divisible(1)) {
//                     const prevBeat = ev.beat.add(nbSteps.floor().mul(lastTempo));
//                     errorLogger.logError({
//                         severity: "Error",
//                         message: `${jugglerName}: beat ${stringifyFraction(ev.beat)} is offbeat.\n Previous beat: ${stringifyFraction(prevBeat)}.\nTempo: ${stringifyFraction(lastTempo)}.\nNumber of time steps between the previous beat and this beat: ${stringifyFraction(nbSteps)}.\n Hands may not alternate correctly.`
//                     });
//                 }
//                 lastDefaultHand = XOR(nbSteps.divisible(2), lastDefaultHand === "R") ? "L" : "R";
//             }
//             ev.defaultHand = lastDefaultHand;
//             lastBeat = ev.beat;
//             lastTempo = ev.tempo ?? lastTempo;
//         }
//     });
// }

function addTempoAndDefaultHandAndFromHand(
    events: HybridEvent[],
    startingTempo: Fraction,
    startingHand: "L" | "R",
    jugglerName: string,
    errorLogger: TimedErrorLogger<Fraction>
): HybridEvent[] {
    return produce(events, (draft) => {
        if (draft.length === 0) {
            return;
        }
        draft[0].tempo = startingTempo;
        draft[0].defaultHand = startingHand;
        for (let i = 1; i < draft.length; i++) {
            const lastTempo = draft[i - 1].tempo!;
            const lastDefaultHand = draft[i - 1].defaultHand!;
            const lastBeat = draft[i - 1].beat;
            const currentBeat = draft[i].beat;

            // Set the tempo if undefined.
            draft[i].tempo ??= lastTempo;

            // Set the defaultHand if undefined.
            if (draft[i].defaultHand === undefined) {
                const nbSteps = currentBeat.sub(lastBeat).div(lastTempo);
                const newDefaultHand = XOR(nbSteps.ceil().divisible(2), lastDefaultHand === "R")
                    ? "L"
                    : "R";
                if (!nbSteps.divisible(1)) {
                    errorLogger.logError({
                        severity: "Error",
                        message: `${jugglerName}: Can't infer tossing hand at event on ${stringifyFraction(currentBeat)} because it is offbeat.\n Previous event at beat ${stringifyFraction(lastBeat)} tosses with ${lastDefaultHand === "R" ? "right" : "left"} hand.\nTempo: ${stringifyFraction(lastTempo)}.\nNumber of time steps between the previous event beat and this event beat: ${stringifyFraction(nbSteps)}.\n Hands may not alternate correctly.\n Continue by tossing with the hand the next (correct) beat would have : ${newDefaultHand === "R" ? "right" : "left"}.`
                    });
                }
                draft[i].defaultHand = newDefaultHand;
            }
        }
        // Set the tossing hand if undefined.
        for (const ev of draft) {
            for (const toss of ev.tosses ?? []) {
                toss.from.hand ??= ev.defaultHand!;
            }
        }
    });
}

function addTossesToAllEvents(events: HybridEvent[]): HybridEvent[] {
    return produce(events, (draft) => {
        for (const ev of draft) {
            ev.tosses ??= [];
        }
    });
}

function addMissingToJuggler(events: HybridEvent[], defaultJugglerName: string): HybridEvent[] {
    return produce(events, (draft) => {
        for (const ev of draft) {
            for (const toss of ev.tosses ?? []) {
                toss.to.juggler ??= defaultJugglerName;
                // toss.from.juggler ??= defaultJugglerName;
            }
        }
    });
}

function checkJugglerNames(
    events: HybridEvent[],
    jugglerNames: Set<string>,
    errorLogger: FracTimedErrorLogger
): void {
    for (const ev of events) {
        for (const toss of ev.tosses ?? []) {
            // if (toss.from.juggler !== undefined) {
            //     handleIfNameUnknown({
            //         name: toss.from.juggler,
            //         namesList: jugglerNames,
            //         errorMessage: `Unkown juggler name "${toss.from.juggler}" in TODO`,
            //         errorLogger: errorLogger,
            //         time: ev.beat
            //     });
            // }
            if (toss.to.juggler !== undefined) {
                handleIfNameUnknown({
                    name: toss.to.juggler,
                    namesList: jugglerNames,
                    errorMessage: `Unkown juggler name "${toss.to.juggler}" in TODO`,
                    errorLogger: errorLogger,
                    time: ev.beat
                });
            }
        }
    }
}

//TODO : Wrong checks if ball is with ID or Name (yet it shouldn't be the case.)
function formatThrownBalls(
    events: HybridEvent[],
    ballNames: Set<string>,
    ballIDs: Map<string, string>,
    jugglerName: string,
    errorLogger: TimedErrorLogger<Fraction>
): HybridEvent[] {
    return produce(events, (draft) => {
        for (const ev of draft) {
            for (const toss of ev.tosses ?? []) {
                if (toss.ball === undefined) {
                    continue;
                }
                let ballString: string;
                if ("name" in toss.ball) {
                    ballString = toss.ball.name;
                } else if ("id" in toss.ball) {
                    ballString = toss.ball.id;
                } else {
                    ballString = toss.ball.nameOrID;
                }
                toss.ball = getBall(
                    ballString,
                    ballNames,
                    ballIDs,
                    jugglerName,
                    errorLogger,
                    ev.beat
                );
            }
        }
    });
}

function getBall(
    ballNameOrID: string | undefined,
    ballNames: Set<string>,
    ballIDs: Map<string, string>,
    jugglerName: string,
    errorLogger: FracTimedErrorLogger,
    beat: Fraction
): { name: string } | { id: string } | undefined {
    if (ballNameOrID === undefined) {
        return undefined;
    } else if (ballNames.has(ballNameOrID)) {
        return { name: ballNameOrID };
    } else if (ballIDs.has(ballNameOrID)) {
        return { id: ballNameOrID };
    }
    handleIfNameUnknown({
        name: ballNameOrID,
        namesList: new Set(...ballNames, ...ballIDs),
        errorMessage: `Juggler ${jugglerName} : Unknown ball "${ballNameOrID}" is neither a valid ball name nor ID.`,
        errorLogger: errorLogger,
        time: beat
    });
    return undefined;
}

// function formatHeldBalls(
//     events: HybridEvent[],
//     ballNames: Set<string>,
//     ballIDs: Set<string>,
//     jugglerName: string,
//     errorLogger: TimedErrorLogger<Fraction>
// ): HybridEvent[] {
//     return produce(events, (draft) => {
//         for (const ev of draft) {
//             if (ev.setupHands === undefined) {
//                 continue
//             }
//             if (ev.setupHands.have !== undefined) {
//                 for (let i = 0; i < 2; i++) {
//                     for (const ball of ev.setupHands.have[i]) {
//                         ev.setupHands.have[i] = getBall(ball., ballNames, ballIDs, jugglerName, errorLogger, ev.beat);
//                         if (newBall === undefined) {
//                             continue;
//                         }
//                         newHands[i].push(newBall);
//                     }
//                 }
//             }
//             } else {
//                 newHands = undefined;
//             }
//             newEvents.push([beat, { ...ev, hands: newHands }]);

//     });
// }

/**
 * Filter useless events, ie ones that don't add anything new to the patten, or that has tosses throwing back in time. // -Remove empty events / With height 0 / Caught on same beat as thrown
 * @param events
 * @returns
 */
function filterUselessTossesAndEvents(events: HybridEvent[]): HybridEvent[] {
    // Static function to filter tosses.
    // TODO : Have errorLogger fire when a toss is thrown.
    function keepToss(toss: HybridToss, beat: Fraction): boolean {
        return (
            (toss.mode.type === "Height" && toss.mode.height > 0) ||
            (toss.mode.type === "Beat" && toss.mode.beat.gt(beat))
        );
    }

    // Remove events with no usefull toss and other information.
    const newEvents: HybridEvent[] = [];
    let currentTempo: Fraction | null = null;
    for (const ev of events) {
        const newTosses = ev.tosses?.filter((toss) => keepToss(toss, ev.beat));
        if (
            !(
                (newTosses === undefined || newTosses.length === 0) &&
                (ev.tempo === undefined || currentTempo?.equals(ev.tempo)) &&
                ev.defaultHand === undefined &&
                (ev.setupHands === undefined ||
                    (ev.setupHands.haveBalls === undefined &&
                        ev.setupHands.placeBalls === undefined))
            )
        ) {
            newEvents.push({ ...ev, tosses: newTosses });
        }
        currentTempo = ev.tempo ?? currentTempo;
    }
    return newEvents;
}

function formatMode(
    events: HybridEvent[],
    errorLogger: FracTimedErrorLogger,
    scoreConverter?: ScoreConverter
): HybridEvent[] {
    return produce(events, (draft) => {
        for (const ev of draft) {
            for (const toss of ev.tosses ?? []) {
                if (toss.mode.type === "Height") {
                    continue;
                } else if (toss.mode.type === "AbsBeat") {
                    toss.mode = { type: "Beat", beat: toss.mode.beat };
                } else if (toss.mode.type === "AbsMeasureBeat") {
                    if (scoreConverter === undefined) {
                        errorLogger.logError({
                            severity: "CriticalError",
                            message: `No Signature information was provided to be able to use measures. TODO.`,
                            time: ev.beat
                        });
                        continue;
                    }
                    toss.mode = {
                        type: "Beat",
                        beat: scoreConverter.convertMeasureToBeat(toss.mode.measureBeat)
                    };
                } else {
                    toss.mode = { type: "Beat", beat: ev.beat.add(toss.mode.beat) };
                }
            }
        }
    });
}

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
