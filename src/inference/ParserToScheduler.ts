import Fraction from "fraction.js";
import { parseMusicalSiteswap, ParserToss, ParserTossMode } from "../parser/MusicalSiteswap";
import { GlobalBeatConverter } from "./GlobalBeatConverter";
import { FracTimedErrorLogger, TimedErrorLogger } from "../utils/TimedErrorLogger";
import { stringifyFraction } from "../utils/stringifyEvent";
import {
    HandsInstructions,
    JugglerBeatReference,
    JugglingPhrase,
    JugglingScore
} from "./PerformanceDescription";
import { TossMode, SchedulerEvent, SchedulerToss } from "./Scheduler";
import { XOR } from "../utils/Operations";
import { produce, current } from "immer";
import { handleIfNameUnknown } from "./PatternToModel";
import { LocalBeatConverter } from "./LocalBeatConverter";
import { ElementOf } from "../utils";
import { ActiveHandComputer } from "./ActiveHandComputer";

//TODO : Changer ParserTossMode to be :
// - RelLocalBeat (or siteswap)
// - AbsLocalBeat
// - AbsGlobalBeat
// - AbsGlobalBarBeat
//TODO : Check when computing time of flatten that do not entertwine.

type Cache1Event = {
    globalBeat: Fraction;
    localBeat: Fraction;
    setupHands?: HandsInstructions;
    tosses: ParserToss[];
};

//TODO : Change name.
type FlatJugglingPhrase = Omit<JugglingPhrase, "pattern"> & {
    defaultHand?: "L" | "R";
    tosses?: ParserToss[]; // TODO : In parser toss, just have string, not object.
};

// TODO : Handle Error flow.
// TODO : Is in rhythm ?

//TODO : What about params ? Rather pass the same thing than the preivous step ?
//TODO : Check the comments.

//TODO : Reorganize flow ???
export function rename(
    jugglers: Map<
        string,
        {
            name: string;
            beatReference: JugglerBeatReference;
            jugglingPhrases: JugglingPhrase[];
            errorLogger: FracTimedErrorLogger;
        }
    >,
    ballTemplateNames: Set<string>,
    ballIDs: Map<string, string>,
    globalBeatConverter: GlobalBeatConverter
) {
    // Create the following dictionaries for each juggler.
    const cache1 = new Map<
        string,
        {
            localBeatConverter: LocalBeatConverter;
            activeHandComputer: ActiveHandComputer;
            events: Cache1Event[];
        }
    >();

    for (const { name, jugglingPhrases, beatReference, errorLogger } of jugglers.values()) {
        // 1. Create singular events from the juggling phrase.
        const flatEvents = flattenJugglingPhrases(jugglingPhrases, name, errorLogger);
        if (errorLogger.hasCriticalError()) {
            continue;
        }

        // 2. If the first event has a time of type "follow previous", format it correctly.
        if (flatEvents.length !== 0 && flatEvents[0].startTime.type === "followPrevious") {
            errorLogger.logError({
                severity: "Warn",
                message: `First event of juggler ${name} is not explicitely given.\nContinue by assuming they start on their first beat.`
            });
            flatEvents[0].startTime = { type: "byLocalBeat", beat: 0 };
        }

        // 3. Construct the juggler's local beat converter.
        const localBeatConverter = new LocalBeatConverter(
            {
                beatReference: beatReference,
                changes: flatEvents
            },
            globalBeatConverter
        );

        // 4. Convert all event time to beats.
        const events: Cache1Event[] = [];
        const defaultHandEvents: {
            localBeat: Fraction;
            defaultHand?: "L" | "R";
        }[] = [];
        let localBeat: Fraction = new Fraction(0);
        let globalBeat: Fraction = new Fraction(0);
        for (const ev of flatEvents) {
            // First, convert the start time.
            if (ev.startTime.type === "byLocalBeat") {
                localBeat = new Fraction(ev.startTime.beat);
                globalBeat = localBeatConverter.convertLocalBeatToGlobalBeat(localBeat);
            } else if (ev.startTime.type === "followPrevious") {
                // Note : we've made sure earlier that the first event is NOT of this type.
                localBeat = localBeat.add(1);
                globalBeat = localBeatConverter.convertLocalBeatToGlobalBeat(localBeat);
            } else {
                if (ev.startTime.type === "byGlobalBeat") {
                    globalBeat = new Fraction(ev.startTime.beat);
                } else if (ev.startTime.type === "byGlobalBarBeat") {
                    globalBeat = globalBeatConverter.convertBarBeatToAbsoluteBeat({
                        bar: ev.startTime.bar,
                        beat: new Fraction(ev.startTime.beatInBar)
                    });
                } else {
                    globalBeat = globalBeatConverter.convertSecondsToAbsoluteBeat(
                        new Fraction(ev.startTime.seconds)
                    );
                }
                localBeat = localBeatConverter.convertGlobalBeatToLocalBeat(globalBeat);
            }

            // Then add it to the events.
            events.push({
                globalBeat,
                localBeat,
                setupHands: ev.setupHands,
                tosses: ev.tosses ?? []
            });
            if (ev.defaultHand !== undefined) {
                defaultHandEvents.push({ localBeat, defaultHand: ev.defaultHand });
            }
        }

        // 5. Don't forget to sort the events.
        events.sort((ev1, ev2) => ev1.globalBeat.compare(ev2.globalBeat));

        // 6. Fuse possibly duplicate events.
        const events2: Cache1Event[] = events.length === 0 ? [] : [events[0]];
        for (let evIdx = 1; evIdx < events.length; evIdx++) {
            if (!events[evIdx - 1].globalBeat.equals(events[evIdx].globalBeat)) {
                events2.push(events[evIdx]);
            } else {
                if (events[evIdx].setupHands !== undefined) {
                    events2[events2.length - 1].setupHands = events[evIdx].setupHands;
                }
                for (const toss of events[evIdx].tosses) {
                    events2[events2.length - 1].tosses.push(toss);
                }
            }
        }

        const activeHandComputer = new ActiveHandComputer(defaultHandEvents);
        // Add everything to the maps.
        cache1.set(name, { localBeatConverter, activeHandComputer, events: events2 });
    }

    // // Return early if failed critically.
    // if (errorLogger.hasCriticalError()) {
    //     return undefined;
    // }

    // Now that the first information have been computed, get some more :
    const res = new Map<
        string,
        {
            localBeatConverter: LocalBeatConverter;
            activeHandComputer: ActiveHandComputer;
            events: SchedulerEvent[];
        }
    >();

    for (const [jugglerName, { events, activeHandComputer, localBeatConverter }] of cache1) {
        const errorLogger = jugglers.get(jugglerName)!.errorLogger;

        // 7. Format tosses.
        const events3: SchedulerEvent[] = [];
        for (const ev of events) {
            const newTosses: SchedulerToss[] = [];
            for (const toss of ev.tosses) {
                // 8. Format from hand.
                let newFromHandIdx: number;
                if (toss.from.hand === undefined) {
                    const res = activeHandComputer.defaultHandAtLocalBeat(ev.localBeat);
                    if (res.offbeat) {
                        errorLogger.logError({
                            severity: "Error",
                            message: `${jugglerName}: Can't infer tossing hand at event on ${stringifyFraction(ev.globalBeat)} because it is offbeat.\n Continue by tossing with the hand the previous (correct) beat would have : ${res.handIdx === 1 ? "right" : "left"}.`
                        });
                    }
                    newFromHandIdx = res.handIdx;
                } else {
                    newFromHandIdx = toss.from.hand === "L" ? 0 : 1;
                }

                // 9. Format to.globalBeat.
                let newToGlobalBeat: Fraction;
                if (toss.mode.type === "Height") {
                    // If a toss is made by siteswap height, it is computed in the juggler's local beat system,
                    // even if tossed to another juggler.
                    newToGlobalBeat = localBeatConverter.convertLocalBeatToGlobalBeat(
                        ev.localBeat.add(toss.mode.height)
                    );
                } else if (toss.mode.type === "AbsBeat") {
                    newToGlobalBeat = toss.mode.beat;
                } else if (toss.mode.type === "AbsMeasureBeat") {
                    try {
                        newToGlobalBeat = globalBeatConverter.convertBarBeatToAbsoluteBeat(
                            toss.mode.measureBeat
                        );
                    } catch (err) {
                        // Error was caused, probably beacuse of missing beatsInBar information.
                        errorLogger.logError({
                            severity: "CriticalError",
                            message: `Error while parsing bar ${toss.mode.measureBeat.bar} beat ${toss.mode.measureBeat.beat} of juggler ${jugglerName} :\n\t${(err as Error).message}`,
                            time: ev.globalBeat
                        });
                    }
                    continue;
                } else {
                    newToGlobalBeat = ev.globalBeat.add(toss.mode.beat);
                }

                // 10. Format mode and check it makes actual sense.
                let newMode: TossMode;
                if (toss.mode.type === "Height") {
                    if (toss.mode.height <= 0) {
                        errorLogger.logError({
                            severity: "Error",
                            message: `Can't toss a ball at siteswap height <= 0. Continue by skipping this toss.`,
                            time: ev.globalBeat
                        });
                        continue;
                    }
                    newMode = toss.mode;
                } else {
                    if (toss.mode.beat.lte(ev.globalBeat)) {
                        errorLogger.logError({
                            severity: "Error",
                            message: `Can't catch a ball before tossing it. Continue by skipping this toss.`,
                            time: ev.globalBeat
                        });
                        continue;
                    }
                    newMode = { type: "Beat", beat: newToGlobalBeat };
                }

                // 11. Format ball, by looking for a matching name or ID.
                let newBall: SchedulerToss["ball"];
                if (toss.ball === undefined) {
                    newBall = undefined;
                } else if (ballTemplateNames.has(toss.ball.nameOrID)) {
                    newBall = { name: toss.ball.nameOrID };
                } else if (ballIDs.has(toss.ball.nameOrID)) {
                    newBall = { id: toss.ball.nameOrID };
                } else {
                    handleIfNameUnknown({
                        name: toss.ball.nameOrID,
                        namesList: new Set(...ballTemplateNames, ...ballIDs),
                        errorMessage: `Juggler ${jugglerName} : Unknown ball "${toss.ball.nameOrID}" is neither a valid ball name nor ID.`,
                        errorLogger: errorLogger,
                        time: ev.globalBeat
                    });
                    continue;
                }

                // 12. Format to.juggler and check they exist.
                const newToJuggler = toss.to.juggler ?? jugglerName;
                handleIfNameUnknown({
                    name: newToJuggler,
                    namesList: jugglers,
                    errorMessage: `Unkown juggler name "${toss.to.juggler}"`,
                    errorLogger: errorLogger,
                    time: ev.globalBeat
                });

                // 13. Format to.handIdx.
                let newToHandIdx: number;
                if (toss.to.hand === "L") {
                    // Give priority to user defined hand.
                    newToHandIdx = 0;
                } else if (toss.to.hand === "R") {
                    newToHandIdx = 1;
                } else if (newMode.type === "Height" && newToJuggler === jugglerName) {
                    // In case the toss is defined via siteswap (and not via catching beat time), we compute
                    // the catching hand based on the siteswap height.
                    // Indeed, say we toss to self a 3, but change in siteswap the hands midway.
                    // We expect the 3 to land in the other hand FROM the toss.
                    // But if we toss a 3 to another juggler, then it should fall in the hand
                    // that will be ready at that time (unless we specified L, R or x)
                    const normalHandIdx =
                        newMode.height % 2 === 0 ? newFromHandIdx : (newFromHandIdx + 1) % 2;
                    newToHandIdx = toss.to.hand === "x" ? (normalHandIdx + 1) % 2 : normalHandIdx;
                } else {
                    // toss.to.hand is either "x" or undefined.
                    // We need to compute in which hand the ball should fall.
                    const res = activeHandComputer.defaultHandAtLocalBeat(ev.localBeat);
                    if (res.offbeat) {
                        errorLogger.logError({
                            severity: "Error",
                            message: `${jugglerName}: Can't infer catching hand at event on ${stringifyFraction(newToGlobalBeat)} because it is offbeat.\n Continue by cacthing with the hand the previous (correct) beat would have : ${res.handIdx === 1 ? "right" : "left"}.`
                        });
                    }
                    newToHandIdx = toss.to.hand === "x" ? (res.handIdx + 1) % 2 : res.handIdx;
                }

                newTosses.push({
                    from: { handIdx: newFromHandIdx },
                    to: {
                        globalBeat: newToGlobalBeat,
                        handIdx: newToHandIdx,
                        juggler: newToJuggler
                    },
                    ball: newBall,
                    mode: newMode
                });
            }

            // 14. Check whether or not there is useful information in the event.
            if (
                newTosses.length === 0 &&
                ev.setupHands?.haveBalls === undefined &&
                ev.setupHands?.placeBalls === undefined
            ) {
                continue;
            }
            events3.push({
                globalBeat: ev.globalBeat,
                setupHands: ev.setupHands,
                tosses: newTosses
            });
        }
        res.set(jugglerName, { localBeatConverter, activeHandComputer, events: events3 });
    }

    // // Return early if failed critically.
    // if (errorLogger.hasCriticalError()) {
    //     return undefined;
    // }

    return res;
}

/**
 * Parse the jugglingPhrases and return a list of events (that should be completed later).
 * @param jugglingPhrases the liste of juggling phrases.
 * @param errorLogger an error logger. Fails critically if two phrases are intertwined.
 * @param jugglerName the name of the juggler parsed (for error logging).
 * @returns
 */
function flattenJugglingPhrases(
    jugglingPhrases: JugglingPhrase[],
    jugglerName: string,
    errorLogger: FracTimedErrorLogger
): FlatJugglingPhrase[] {
    const jugglingEvents: FlatJugglingPhrase[] = [];
    for (const phrase of jugglingPhrases) {
        const phraseEvents: FlatJugglingPhrase[] = [];

        // Process the pattern
        try {
            if (phrase.pattern !== undefined) {
                const patternEvents = parseMusicalSiteswap(phrase.pattern);
                for (const patternEv of patternEvents) {
                    phraseEvents.push({ ...patternEv, startTime: { type: "followPrevious" } });
                }
            }
        } catch (err) {
            errorLogger.logError({
                severity: "CriticalError",
                message: `Error while parsing "${phrase.pattern}" of juggler ${jugglerName}.\nParser Error : ${(err as Error).message}`
            });
        }

        // Add the phrase information (tempo, hands setup, ...) to the first event.
        const phraseData = {
            startTime: phrase.startTime,
            localBeatTempo: phrase.localBaseTempo,
            localBeatTempoMultiplier: phrase.localTempoMultiplier,
            setupHands: phrase.setupHands
        };
        if (phraseEvents.length === 0) {
            // We need to create an empty event first
            phraseEvents.push(phraseData);
        } else {
            // We need to unpack phraseData last to overwrite the "follow previous phase".
            phraseEvents[0] = { ...phraseEvents[0], ...phraseData };
        }

        // Finally add all of this phrase's events to the big list.
        jugglingEvents.push(...phraseEvents);
    }

    return jugglingEvents;
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
