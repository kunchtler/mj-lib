// import { score11 as score } from "../examples/patternTest";
import {
    BallDescription,
    JugglingPhrase,
    JugglingScore,
    JugglingScoreHelper,
    TableTemplate
} from "./PerformanceDescription";
import Fraction from "fraction.js";
import { JugglerState, Scheduler, SchedulerJuggler, SymbolicEvent } from "./Scheduler";
import { getFirstInsertedKey } from "../utils/Operations";
import { ScoreConverter, MusicTempo, MusicBeat, TimeSignature } from "./ScoreConverter";
import { PerformanceModel } from "../model/PerformanceModel";
import {
    closestWordsTo,
    ElementOf,
    FracTimedErrorLogger,
    setIntersection,
    stringifyBall,
    stringifyEvent,
    stringifyState,
    stringifyStateEvent,
    TimedErrorLogger
} from "../utils";
import { formatJugglerPhrasesForScheduler } from "./ParserToScheduler";
import { GlobalBeatConverter } from "./GlobalBeatConverter";

//TODO : Silent Throws ?
//TODO : Have final repr in simulator using only splines ?
//TODO : Soft errors in simulator ! (with error Logger too ?) HECK YEAH !
//TODO : See how to handle errors when lexor is in PLS.

//TODO : Ici c'est la structure de donnée du minimum requis pour l'inférence.
//TODO : Faire en plus une structure de données avec la totale (modèles, sons, etc), de laquelle
//on récupèr les données minimales du TODO précédant.

//TODO : Where to critical fail ?
//TODO : Return error logger to ?
// TODO : Make it clear when errorLogger should be checked for criticalfail.
//TODO : ErrorLogger immutable with immer ?

//TODO : Warning when ball is forcefully put in a spot of wrong kind. Is it here or in scheduler ?
//TODO : Handle all pre-parser processing in a dedicated function to better separate concerns ?
//TODO : Inconsistent table.template and ball.name to refer to template.

export function JugglingScoreToModel(
    score: JugglingScore,
    errorLogger: TimedErrorLogger<Fraction>
): PerformanceModel | undefined {
    // 1. Check if all names / user defined IDs are unique and gather them.
    const { ballTemplateNames, ballIDs, jugglerNames, tableIDs } = checkScoreNamesAndIDs(
        score,
        errorLogger
    );
    // Return early if there was a critical error.
    if (errorLogger.hasCriticalError()) {
        errorLogger.printErrorsInConsole();
        return undefined;
    }

    // 2. Create the global beat.
    const globalBeat = new GlobalBeatConverter(score.globalBeat);

    // 3. Create the scheduler's parameters.
    const schedulerJugglers = new Map<string, SchedulerJuggler>();
    for (const juggler of score.jugglers) {
        // 3.a. Create the intial juggler states.
        const jugglerState = createInitialJugglerStates(juggler, errorLogger);

        // 3.b. Parse each juggling phrase and format them.
        const events =
            formatJugglerPhrasesForScheduler(
                juggler.jugglingPhrases ?? [],
                juggler.name,
                ballTemplateNames,
                ballUserIDs,
                jugglerNames,
                errorLogger,
                score.scoreConverter
            ) ?? [];
        const initialState = jugglerStates.get(juggler.name)!;
        const tableSpotsFull = score.tableTemplates?.find(
            (elem) => elem.name === juggler.table?.template
        )?.spots;
        const tableSpots = new Map<string, string>();
        for (const spot of tableSpotsFull ?? []) {
            if (spot.acceptedBallName === undefined) {
                throw Error("Not yet supported");
            }
            tableSpots.set(spot.name, spot.acceptedBallName);
        }
        schedulerJugglers.set(juggler.name, { events, initialState, tableSpots });
    }

    // 5. Use the scheduler to infer the complete timeline of events.
    const schedulerOutput = new Scheduler({
        ballIDMap: ballIDs,
        jugglers: schedulerJugglers
    }).validatePattern();

    // 5b. Console logs.
    console.log("Global Errors :\n");
    errorLogger.printErrorsInConsole();
    console.log("\n");
    for (const [jugglerName, { errorLogger, events, states }] of schedulerOutput) {
        console.log(`Juggler ${jugglerName} :\n`);
        // const tmp = new FracTimeline<{ state?: JugglerState; event?: SymbolicEvent<Fraction> }>();
        // for (const { beat, ...state } of states) {
        //     tmp.setElement(beat, { state: state });
        // }
        // for (const ev of events) {
        //     const elem = tmp.getElementByKey(ev.beat);
        //     if (elem !== undefined) {
        //         elem.event = ev;
        //     } else {
        //         tmp.setElement(ev.beat, { event: ev });
        //     }
        // }
        // for (const [beat, { state, event }] of tmp) {
        //     console.log(stringifyStateEvent(beat, state, event));
        //     console.log("\n");
        // }
        console.log("States:\n");
        states.forEach((elem) => {
            console.log(stringifyState(elem, elem.beat) + "\n");
        });
        console.log("Events:\n");
        events.forEach((elem) => {
            console.log(stringifyEvent(elem) + "\n");
        });
        console.log("Errors:\n");
        errorLogger.printErrorsInConsole();
    }
    console.log("Fini\n\n");

    // 6. Create the timelines.

    // 7. Combine timelines with positions to create models.

    // 8. All done.

    //TODO : Rename to parser only ? Name of method a bit convoluted.
    // const schedulerParams = parserParamsToSchedulerParams(parserParams);
    // const postSchedulerParams = new Scheduler(schedulerParams).validatePattern();

    // // Creating the params for the simulation
    // // const ballIDSounds2 = new Map<
    // //     string,
    // //     {
    // //         onToss?: string | EventSound;
    // //         onCatch?: string | EventSound;
    // //     }
    // // >();
    // // for (const [name, sound] of ballIDs) {
    // //     ballIDSounds2.set(name, { onCatch: sound });
    // // }

    // const jugglerParams = new Map<
    //     string,
    //     {
    //         table?: string;
    //         events: FracSortedList<SimulatorEvent<Fraction>>;
    //     }
    // >();
    // for (const [name, { events }] of postSchedulerParams) {
    //     jugglerParams.set(name, { events, table: preParserJugglers.get(name)?.table });
    // }

    // return simulateEvents({
    //     jugglers: jugglerParams,
    //     ballIDSounds: ballIDToTemplateName,
    //     musicConverter: musicConverter
    // });
}

//////////////////////////// Functions //////////////////////////

// Formats the jugglers in the juggling score in the form of an initial state.
function createInitialJugglerStates(
    juggler: ElementOf<JugglingScore["jugglers"]>,
    errorLogger: TimedErrorLogger<Fraction>
): JugglerState {
    const heldState: JugglerState["held"] = [[], []];
    for (let handIdx = 0; handIdx < 2; handIdx++) {
        for (const ball of juggler.ballsHeldAtStart[handIdx]) {
            //TODO In the future : support undefined ???
            if (ball === undefined) {
                errorLogger.logError({
                    severity: "Error",
                    message: `Juggler ${juggler.name} can't start with undefined spots in hands. This is not supported yet.`
                });
                continue;
            }
            heldState[handIdx].push(ball.id);
        }
    }

    let tableState: JugglerState["table"] = undefined;
    if (juggler.table?.ballsOnTableAtStart !== undefined) {
        tableState = { namedSpot: new Map(), unknown: new Set() };

        for (const ball of juggler.table.ballsOnTableAtStart) {
            if (ball.spot !== undefined) {
                tableState.namedSpot.set(ball.spot, ball.id);
            } else {
                tableState.unknown.add(ball.id);
            }
        }
    }

    return { airborne: new Map(), held: heldState, table: tableState };
}



// The generated IDs are of the form : name?juggler?number. Ex : Do?Vincent?0
function createBallID(
    ball: { name: string; id?: string },
    jugglerName: string,
    ballTemplateNames: Set<string>,
    ballUserIDs: Map<string, string>,
    ballGeneratedIDs: Map<string, string>
): string {
    const ballIDRoot = `${ball.name}?${jugglerName}?`;
    let ballIDIdx = 0;
    let ballID: string;
    do {
        ballID = ballIDRoot + ballIDIdx.toString();
        ballIDIdx++;
    } while (
        ballTemplateNames.has(ballID) ||
        ballUserIDs.has(ballID) ||
        ballGeneratedIDs.has(ballID)
    );
    return ballID;
}

// The generated ID is of the form : "table"?juggler, as for now, tables belong
// to at most one juggler.
function createTableID(jugglerName: string): string {
    return `table?${jugglerName}`;
}

// TODO : Elsewhere, as we may want to implement tempo changes IN siteswap later.
// So we should only convert the tempo (and fuse it with the tempo multiplier)
// When we've identified all tempo changes (including siteswap).
// function convertBaseTempoToTossesPerBeat(
//     jugglingTempo: NonNullable<JugglingPhrase["localBeatTempo"]>,
//     signature: TimeSignature<Fraction>,
//     musicTempo: MusicTempo<Fraction>
// ): Fraction {
//     if (jugglingTempo.type === "perBeat") {
//         return new Fraction(jugglingTempo.tossesPerBeat);
//     } else if (jugglingTempo.type === "perMinute") {
//         const beatsPerMinute = musicTempo.notesPerMinute
//             .mul(musicTempo.noteDuration)
//             .div(signature.beatDuration);
//         return new Fraction(jugglingTempo.tossesPerMinute).div(beatsPerMinute);
//     } else {
//         return new Fraction(jugglingTempo.tossesPerNote)
//             .mul(musicTempo.noteDuration)
//             .div(jugglingTempo.noteDuration);
//     }
// }

// This is dirty and makes me wanna cry a bit.
// Edit : it's a tidbit better now that it is finished.

export function createJugglingScoreFromHelper(
    score: JugglingScoreHelper,
    errorLogger: TimedErrorLogger<Fraction>
): {
    score: JugglingScore;
    ballUserIDs: Map<string, string>;
    ballGeneratedIDs: Map<string, string>;
} {
    // We need to do a few things :
    // - Remove table templates and add the info directly to the table.
    // - Add an ID to each ball that doesn't have one. But make sure it is not
    //   an existing ID given by the user.
    // - Properly create the global beat track.

    let newGlobalBeat: JugglingScore["globalBeat"];
    if (score.globalBeat === undefined) {
        newGlobalBeat = {
            beatOffsetInSeconds: 0,
            // Count the seconds.
            changes: [{ startTime: { type: "byBeat", beat: 0 }, beatsPerMinute: 60 }]
        };
    } else if (score.globalBeat.type === "constant") {
        newGlobalBeat = {
            beatOffsetInSeconds: score.globalBeat.firstBeatOffsetInSeconds ?? 0,
            // Count the beats.
            changes: [
                {
                    startTime: { type: "byBeat", beat: 0 },
                    beatsInBar: score.globalBeat.beatsInBar,
                    beatsPerMinute: score.globalBeat.beatsPerMinute
                }
            ]
        };
    } else {
        newGlobalBeat = {
            beatOffsetInSeconds: score.globalBeat.beatOffsetInSeconds ?? 0,
            changes: score.globalBeat.changes
        };
    }

    const newScore: JugglingScore = {
        ballTemplates: score.ballTemplates,
        jugglers: [],
        globalBeat: newGlobalBeat
    };
    const ballUserIDs = new Map<string, string>();
    const ballGeneratedIDs = new Map<string, string>();
    const ballTemplateNames = new Set<string>();
    const tableTemplateNames = new Set<string>();

    for (const { name } of score.ballTemplates) {
        ballTemplateNames.add(name);
    }

    for (const { name } of score.tableTemplates ?? []) {
        tableTemplateNames.add(name);
    }

    // 1. Gather all UserBallIDs.
    for (const juggler of score.jugglers) {
        for (const hand of juggler.ballsHeldAtStart ?? []) {
            for (const ball of hand) {
                if (ball?.id !== undefined) {
                    ballUserIDs.set(ball.id, ball.name);
                }
            }
            for (const ball of juggler.table?.ballsOnTableAtStart ?? []) {
                if (ball.id !== undefined) {
                    ballUserIDs.set(ball.id, ball.name);
                }
            }
        }
    }

    // 2. Iterate over jugglers to fuse table templates and generate missing IDs
    // (if balls with no IDs and tables).
    for (const juggler of score.jugglers) {
        // Add object to new Score.
        const newJuggler: ElementOf<JugglingScore["jugglers"]> = {
            name: juggler.name,
            ballsHeldAtStart: [[], []],
            beatReference: {
                jugglerBeat: juggler.beatReference?.jugglerBeat ?? 0,
                globalTime: juggler.beatReference?.globalTime ?? { type: "byGlobalBeat", beat: 0 }
            },
            jugglingPhrases: juggler.jugglingPhrases ?? [],
            table: undefined
        };

        // Add ball IDs if held in hand.
        if (juggler.ballsHeldAtStart !== undefined) {
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                for (const ball of juggler.ballsHeldAtStart[handIdx]) {
                    let newBall: Required<BallDescription> | undefined;
                    if (ball === undefined) {
                        newBall = undefined;
                    } else if (ball.id !== undefined) {
                        newBall = { name: ball.name, id: ball.id };
                    } else {
                        const ballID = createBallID(
                            ball,
                            juggler.name,
                            ballTemplateNames,
                            ballUserIDs,
                            ballGeneratedIDs
                        );
                        ballGeneratedIDs.set(ballID, ball.name);
                        newBall = { name: ball.name, id: ballID };
                    }
                    newJuggler.ballsHeldAtStart[handIdx].push(newBall);
                }
                for (const ball of juggler.table?.ballsOnTableAtStart ?? []) {
                    if (ball.id !== undefined) {
                        ballUserIDs.set(ball.id, ball.name);
                    }
                }
            }
        }

        // Add table if applicable.
        if (juggler.table !== undefined) {
            const template = score.tableTemplates?.find(
                ({ name: name }) => name === juggler.table?.template
            );
            if (template === undefined) {
                handleIfStringUnknown({
                    errorLogger: errorLogger,
                    errorMessage: `Unknown table template named "${juggler.table.template}" for juggler ${juggler.name}`,
                    name: juggler.table.template,
                    namesList: tableTemplateNames
                });
            } else {
                // In the helper, a ball having no spot means we didn't to specify where it should go.
                // In the true score, a ball having no spot means it goes on the "unknown" spot.
                // So while converting from helper to true score, we need to compute each ball's spot.
                const replacedBallsAtStart = assignUndefinedSpotsToFreeTableSpots(
                    juggler.name,
                    juggler.table.ballsOnTableAtStart ?? [],
                    template.spots,
                    ballTemplateNames,
                    errorLogger
                );
                newJuggler.table = {
                    id: createTableID(juggler.name),
                    spots: template.spots,
                    ballsOnTableAtStart: replacedBallsAtStart.map((ball) => {
                        let ballID: string;
                        if (ball.id !== undefined) {
                            ballID = ball.id;
                        } else {
                            ballID = createBallID(
                                ball,
                                juggler.name,
                                ballTemplateNames,
                                ballUserIDs,
                                ballGeneratedIDs
                            );
                            ballGeneratedIDs.set(ballID, ball.name);
                        }
                        return { ...ball, id: ballID };
                    })
                };
            }
        }

        // Add to jugglers list.
        newScore.jugglers.push(newJuggler);
    }
    return { score: newScore, ballUserIDs: ballUserIDs, ballGeneratedIDs: ballGeneratedIDs };
}

type HelperBallsOnTable = NonNullable<
    NonNullable<ElementOf<JugglingScoreHelper["jugglers"]>["table"]>["ballsOnTableAtStart"]
>;

// In the helper, a ball having no spot means we didn't to specify where it should go.
// In the true score, a ball having no spot means it goes on the "unknown" spot.
// So while converting from helper to true score, we need to compute each ball's spot.
function assignUndefinedSpotsToFreeTableSpots(
    jugglerName: string,
    ballsOnTableAtStart: HelperBallsOnTable,
    tableSpots: {
        name: string;
        acceptedBallName: string;
    }[],
    ballTemplateNames: Set<string>,
    errorLogger: TimedErrorLogger<Fraction>
): HelperBallsOnTable {
    const newBallsOnTable: HelperBallsOnTable = [];

    // Make a Map of all free spots.
    const freeSpotsByAcceptedTemplateName = new Map<string, Set<string>>();
    for (const name of ballTemplateNames) {
        freeSpotsByAcceptedTemplateName.set(name, new Set());
    }
    for (const spot of tableSpots) {
        freeSpotsByAcceptedTemplateName.get(spot.acceptedBallName)!.add(spot.name);
    }
    // Then remove the balls that are in designated spots.
    for (const ball of ballsOnTableAtStart) {
        if (ball.spot !== undefined) {
            freeSpotsByAcceptedTemplateName.get(ball.name)?.delete(ball.spot);
        }
    }

    for (const ball of ballsOnTableAtStart) {
        // Figure out the ball spot.
        let spotName: string | undefined;
        if (ball.spot !== undefined) {
            spotName = ball.spot;
        } else {
            // Find a free spot.
            const spots = freeSpotsByAcceptedTemplateName.get(ball.name)!;
            spotName = getFirstInsertedKey(spots);
            if (spotName === undefined) {
                errorLogger.logError({
                    severity: "Warn",
                    message: `Ball ${stringifyBall(ball)} of juggler ${jugglerName} has no available spot to be put on the table.\nContinue by putting it on a default position.`
                });
            } else {
                spots.delete(spotName);
            }
        }

        // Add the ball to the table state.
        newBallsOnTable.push({ name: ball.name, id: ball.id, spot: spotName });
    }
    return newBallsOnTable;
}

// TODO : Readd time for debugging ?
// TODO : Rehandle sed defined IDs.
/**
 * Errors if there is a duplicate ID or Name. Return all unique template names and IDs.
 * @param score
 * @param errorLogger
 * @returns
 */
export function checkScoreNamesAndIDs(
    score: JugglingScore,
    errorLogger: TimedErrorLogger<Fraction>
): {
    ballTemplateNames: Set<string>;
    ballIDs: Map<string, string>;
    tableIDs: Map<string, string>; // Maps table to juggler.
    jugglerNames: Set<string>;
} {
    // Check to see if :
    // - ball template names are unique.
    // - ball IDs are unique (held and on table and in juggling phrases "setupHands").
    // - table IDs are unique.
    // - on a table, spot names are unique.
    // - on a table, balls refer to existing spot names.
    // - juggler names are unique.
    // - check that no ball name is also an ID and conversely.

    // Check if ball template names are unique.
    const ballTemplateNames = new Set<string>();
    for (const { name: templateName } of score.ballTemplates) {
        handleIfStringDuplicate({
            name: templateName,
            namesList: ballTemplateNames,
            errorMessage: `Duplicate ball template name: "${templateName}".`,
            errorLogger: errorLogger
        });
        ballTemplateNames.add(templateName);
    }

    // Juggler checks.
    const jugglerNames = new Set<string>();
    const ballIDs = new Map<string, string>();
    const tableIDs = new Map<string, string>();
    for (const { name: jugglerName, ballsHeldAtStart, jugglingPhrases, table } of score.jugglers) {
        // Uniqueness of juggler names.
        handleIfStringDuplicate({
            name: jugglerName,
            namesList: jugglerNames,
            errorMessage: `Duplicate juggler name: "${jugglerName}".`,
            errorLogger: errorLogger
        });
        jugglerNames.add(jugglerName);

        for (const ballsInHand of ballsHeldAtStart) {
            for (const ball of ballsInHand) {
                if (ball === undefined) {
                    continue;
                }
                // Held balls refer to existing template names.
                handleIfStringUnknown({
                    name: ball.name,
                    namesList: ballTemplateNames,
                    errorMessage: `Unknown ball template name "${ball.name}" held by juggler "${jugglerName}".`,
                    errorLogger: errorLogger
                });

                // Uniqueness of ball IDs.
                handleIfStringDuplicate({
                    name: ball.id,
                    namesList: ballIDs,
                    errorMessage: `Duplicate ball ID: "${ball.id}".`,
                    errorLogger: errorLogger
                });
                ballIDs.set(ball.id, ball.name);
            }
        }

        const spotNames = new Set<string>();
        if (table !== undefined) {
            // Check if table ID is unique.
            handleIfStringDuplicate({
                name: table.id,
                namesList: tableIDs,
                errorMessage: `Duplicate table ID "${table.id}" of juggler ${jugglerName}.`,
                errorLogger: errorLogger
            });
            tableIDs.set(table.id, jugglerName);

            // Check if table spot names are unique.
            for (const { name: spotName, acceptedBallName } of table.spots) {
                // Uniqueness of table spot names.
                handleIfStringDuplicate({
                    name: spotName,
                    namesList: spotNames,
                    errorMessage: `Duplicate spot name "${spotName}" on table of juggler ${jugglerName} (id: ${table.id}).`,
                    errorLogger: errorLogger
                });
                spotNames.add(spotName);

                // Spot accepted balls refer to existing ball template.
                handleIfStringUnknown({
                    name: acceptedBallName,
                    namesList: ballTemplateNames,
                    errorMessage: `Unknown ball template name "${acceptedBallName}" for spot "${spotName}" on table of juggler ${jugglerName} (id: ${table.id}).`,
                    errorLogger: errorLogger
                });
            }

            for (const ball of table.ballsOnTableAtStart) {
                // Balls on table refer to existing template name.
                handleIfStringUnknown({
                    name: ball.name,
                    namesList: ballTemplateNames,
                    errorMessage: `Unknown ball template name "${ball.name}" on the table of juggler "${jugglerName}".`,
                    errorLogger: errorLogger
                });

                // Uniqueness of ball user-defined IDs.
                handleIfStringDuplicate({
                    name: ball.id,
                    namesList: ballIDs,
                    errorMessage: `Duplicate ball ID: "${ball.id}".`,
                    errorLogger: errorLogger
                });
                ballIDs.set(ball.id, ball.name);

                // Spot name refer to an existing spot of the table.
                if (ball.spot !== undefined) {
                    handleIfStringUnknown({
                        name: ball.spot,
                        namesList: spotNames,
                        errorMessage: `Unknown spot name "${ball.spot}" on the table of juggler "${jugglerName}".`,
                        errorLogger: errorLogger
                    });
                }
            }
        }

        for (const { setupHands } of jugglingPhrases) {
            for (const ballsInHand of setupHands?.haveBalls ?? [[], []]) {
                for (const ball of ballsInHand) {
                    if (ball.type === "byName") {
                        // All ball templates refer to existing template names.
                        handleIfStringUnknown({
                            name: ball.name,
                            namesList: ballTemplateNames,
                            errorMessage: `Unknown ball template name "${ball.name}" in juggling phrases of juggler "${jugglerName}".`,
                            errorLogger: errorLogger
                        });
                        if (ball.fromSpot !== undefined) {
                            if (table === undefined) {
                                errorLogger.logError({
                                    severity: "CriticalError",
                                    message: `Juggler "${jugglerName}" has no table, so can't use the fromSpot attribute.`
                                });
                            } else if (!spotNames.has(ball.fromSpot)) {
                                // All spot names refer to existing spot names.
                                handleIfStringUnknown({
                                    name: ball.fromSpot,
                                    namesList: spotNames,
                                    errorMessage: `Unknown spot name "${ball.fromSpot}" on the table of juggler "${jugglerName}".`,
                                    errorLogger: errorLogger
                                });
                            }
                        }
                    } else {
                        // All ball IDs refer to existing user-defined IDs.
                        handleIfStringUnknown({
                            name: ball.id,
                            namesList: ballIDs,
                            errorMessage: `Unknown ball ID "${ball.id}" in juggling phrases of juggler ${jugglerName}.`,
                            errorLogger: errorLogger
                        });
                    }
                }
            }

            for (const ball of setupHands?.placeBalls ?? []) {
                if (ball.type === "byName") {
                    // All ball templates refer to existing template names.
                    handleIfStringUnknown({
                        name: ball.name,
                        namesList: ballTemplateNames,
                        errorMessage: `TODO`,
                        errorLogger: errorLogger
                    });
                    if (ball.toSpot !== undefined) {
                        if (table === undefined) {
                            errorLogger.logError({
                                severity: "CriticalError",
                                message: `Juggler "${jugglerName}" has no table, so can't use the toSpot attribute.`
                            });
                        } else if (!spotNames.has(ball.toSpot)) {
                            // All spot names refer to existing spot names.
                            handleIfStringUnknown({
                                name: ball.toSpot,
                                namesList: spotNames,
                                errorMessage: `Unknown spot name "${ball.toSpot}" in juggler's "${jugglerName}" juggling phrases.`,
                                errorLogger: errorLogger
                            });
                        }
                    }
                } else {
                    // All ball IDs refer to existing user-defined IDs.
                    handleIfStringUnknown({
                        name: ball.id,
                        namesList: ballIDs,
                        errorMessage: `Unknown ball ID "${ball.id}" in juggling phrases of juggler ${jugglerName}.`,
                        errorLogger: errorLogger
                    });
                }
            }
        }
    }

    // Check that no ball name is also an ID and conversely.
    const intersection = setIntersection(ballTemplateNames, new Set(ballIDs.keys()));
    if (intersection.size > 0) {
        for (const name of intersection) {
            errorLogger.logError({
                severity: "CriticalError",
                message: `"${name}" is both a ball template name and a ball ID.`
            });
        }
    }

    return { ballTemplateNames, ballIDs, jugglerNames, tableIDs };
}

function handleIfStringUnknown({
    errorMessage,
    errorLogger,
    name,
    namesList,
    time
}: {
    errorMessage: string;
    errorLogger: FracTimedErrorLogger;
    name: string;
    namesList: Set<string> | Map<string, unknown>;
    time?: Fraction;
}): void {
    if (!namesList.has(name)) {
        let text = errorMessage;
        const matchingWords = closestWordsTo(name, namesList.keys(), 2);
        if (matchingWords.length > 0) {
            text += `\nDid you mean "${matchingWords[0]}" ?`;
        }
        errorLogger.logError({ time: time, severity: "CriticalError", message: text });
    }
}

function handleIfStringDuplicate({
    errorMessage,
    errorLogger,
    name,
    namesList
}: {
    errorMessage: string;
    errorLogger: FracTimedErrorLogger;
    name: string;
    namesList: Set<string> | Map<string, unknown>;
}): void {
    if (namesList.has(name)) {
        errorLogger.logError({ severity: "CriticalError", message: errorMessage });
    }
}
