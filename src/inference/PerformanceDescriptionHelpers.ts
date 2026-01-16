// import { score11 as score } from "../examples/patternTest";
import {
    JugglingPhrase,
    JugglingScore,
    JugglingScoreHelper,
    ScoreRhythmDescription
} from "./PerformanceDescription";
import Fraction from "fraction.js";
import { JugglerState, Scheduler, SchedulerJuggler, SymbolicEvent } from "./Scheduler";
import { getFirstInsertedKey } from "../utils/Operations";
import { ScoreConverter, MusicTempo, MusicBeat, TimeSignature } from "./ScoreConverter";
import { PerformanceModel } from "../model/PerformanceModel";
import {
    closestWordsTo,
    FracTimedErrorLogger,
    setIntersection,
    stringifyBall,
    stringifyEvent,
    stringifyState,
    stringifyStateEvent,
    TimedErrorLogger
} from "../utils";
import { formatJugglerPhrasesForScheduler } from "./ParserToScheduler";

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

export function JSONJugglingScoreToModel(
    JSONJugglingScore: JSONJugglingScore,
    errorLogger: TimedErrorLogger<Fraction>
): PerformanceModel | undefined {
    // 1. Convert the JSON juggling score into a friendlier object.
    const jugglingScore = convertJSONToJugglingScore(JSONJugglingScore, errorLogger);
    // Return early if there was a critical error.
    if (errorLogger.hasCriticalError()) {
        errorLogger.printErrorsInConsole();
        return undefined;
    }

    // 2. Check if all names / user defined IDs are unique and gather them.
    const { ballTemplateNames, ballUserIDs, jugglerNames, tableTemplateNames } =
        checkAndGatherJugglingScoreNamesAndIDs(jugglingScore, errorLogger);
    // Return early if there was a critical error.
    if (errorLogger.hasCriticalError()) {
        errorLogger.printErrorsInConsole();
        return undefined;
    }

    // 3. Create the initial juggler states by adding an ID to each ball that doesn't have one.
    // The generated IDs are of the form : name?juggler?number. Ex : Do?Vincent?0
    const { jugglerStates, ballGeneratedIDs } = createInitialJugglerStates(
        jugglingScore,
        ballTemplateNames,
        ballUserIDs,
        errorLogger
    );

    // Make a big list of all ball IDs.
    const ballIDToTemplateName = new Map<string, string>([...ballUserIDs, ...ballGeneratedIDs]);

    // 4. Parse each juggling phrase and format them.
    // Complete each information we can by looking at jugglers individually.
    const schedulerJugglers = new Map<string, SchedulerJuggler>();
    for (const juggler of jugglingScore.jugglers) {
        const events =
            formatJugglerPhrasesForScheduler(
                juggler.jugglingPhrases ?? [],
                juggler.name,
                ballTemplateNames,
                ballUserIDs,
                jugglerNames,
                errorLogger,
                jugglingScore.scoreConverter
            ) ?? [];
        const initialState = jugglerStates.get(juggler.name)!;
        const tableSpotsFull = jugglingScore.tableTemplates?.find(
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
        ballIDMap: ballIDToTemplateName,
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

function createInitialJugglerStates(
    jugglingScore: JugglingScore,
    ballTemplateNames: Set<string>,
    ballUserIDs: Map<string, string>,
    errorLogger: TimedErrorLogger<Fraction>
): { jugglerStates: Map<string, JugglerState>; ballGeneratedIDs: Map<string, string> } {
    const ballGeneratedIDs = new Map<string, string>();
    const jugglerStates = new Map<string, JugglerState>();
    for (const juggler of jugglingScore.jugglers) {
        // Generate an ID for each ball held in hand that doesn't have one.
        const heldState: JugglerState["held"] = [[], []];
        if (juggler.ballsHeldAtStart !== undefined) {
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                for (const ball of juggler.ballsHeldAtStart[handIdx]) {
                    if (ball.id !== undefined) {
                        heldState[handIdx].push(ball.id);
                    } else {
                        const ballID = createBallID(
                            ball,
                            juggler.name,
                            ballTemplateNames,
                            ballUserIDs,
                            ballGeneratedIDs
                        );
                        ballGeneratedIDs.set(ballID, ball.name);
                        heldState[handIdx].push(ballID);
                    }
                }
            }
        }

        // Generate an ID for each ball on table that doesn't have one yet.
        // Give a spot to each ball that doesn't have one yet.
        // If we can't give a spot, it will go on the default table place.
        let tableState: JugglerState["table"] = undefined;
        if (juggler.table?.ballsOnTableAtStart !== undefined) {
            tableState = { namedSpot: new Map(), unknown: new Set() };

            // Make a Map of all free spots.
            const freeSpotsByAcceptedTemplateName = new Map<string, Set<string>>();
            for (const name of ballTemplateNames) {
                freeSpotsByAcceptedTemplateName.set(name, new Set());
            }
            // First fill in all spot names.
            const tableSpots = jugglingScore.tableTemplates?.find(
                (elem) => elem.name === juggler.table?.template
            )?.spots;
            for (const spot of tableSpots ?? []) {
                if (spot.acceptedBallName === undefined) {
                    throw Error("Not yet supported");
                }
                freeSpotsByAcceptedTemplateName.get(spot.acceptedBallName)!.add(spot.name);
            }
            // Then remove the balls that are in designated spots.
            for (const ball of juggler.table.ballsOnTableAtStart) {
                if (ball.spot !== undefined) {
                    freeSpotsByAcceptedTemplateName.get(ball.name)?.delete(ball.spot);
                }
            }

            for (const ball of juggler.table.ballsOnTableAtStart) {
                // Figure out the ball ID.
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
                            message: `Ball ${stringifyBall(ball)} of juggler ${juggler.name} has no available spot to be put on the table.\nContinue by putting it on a default position.`
                        });
                    } else {
                        spots.delete(spotName);
                    }
                }

                // Add the ball to the table state.
                if (spotName === undefined) {
                    tableState.unknown.add(ballID);
                } else {
                    tableState.namedSpot.set(spotName, ballID);
                }
            }
        }

        // Create the full juggler state.
        jugglerStates.set(juggler.name, {
            airborne: new Map(),
            held: heldState,
            table: tableState
        });
    }
    return { jugglerStates, ballGeneratedIDs };
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

function convertBaseTempoToTossesPerBeat(
    jugglingTempo: NonNullable<JugglingPhrase["baseTempo"]>,
    signature: TimeSignature<Fraction>,
    musicTempo: MusicTempo<Fraction>
): Fraction {
    if (jugglingTempo.type === "perBeat") {
        return new Fraction(jugglingTempo.tossesPerBeat);
    } else if (jugglingTempo.type === "perMinute") {
        const beatsPerMinute = musicTempo.notesPerMinute
            .mul(musicTempo.noteDuration)
            .div(signature.beatDuration);
        return new Fraction(jugglingTempo.tossesPerMinute).div(beatsPerMinute);
    } else {
        return new Fraction(jugglingTempo.tossesPerNote)
            .mul(musicTempo.noteDuration)
            .div(jugglingTempo.noteDuration);
    }
}

// TODO
/**
 * Convert JSON time to a Fraction.
 * @param time the time to convert.
 * @param scoreRhythm an optional score converter (if time if provided as bar and beat)
 * @param errorLogger an error logger in case a score converter was missing but required.
 * @returns the time converted to a Fraction.
 */
export function convertJugglingPhraseStartTime(
    time: JugglingPhrase["startTime"],
    errorLogger: TimedErrorLogger<Fraction>,
    scoreRhythm?: ScoreConverter
): { type: "followPreviousPhrase" } | { type: "byBeat"; beat: Fraction } {
    if (time.type === "followPreviousPhrase") {
        return time;
    } else if (time.type === "byToss") {
    }
    if (scoreRhythm === undefined) {
        errorLogger.logError({
            severity: "CriticalError",
            message: `Can't convert score time information because no JSON Score Converter was provided.`
        });
        return new Fraction(0);
    }
    return scoreRhythm.convertBarBeatToAbsoluteBeat([time.bar, new Fraction(time.beat)]);
}

export function convertJSONJugglingPhraseToJugglingPhrase(
    phrase: JSONJugglingPhrase,
    errorLogger: TimedErrorLogger<Fraction>,
    scoreConverter?: ScoreConverter
): JugglingPhrase {
    // Change the start time and tempo to a Fraction.
    return {
        ...phrase,
        startTime: convertJSONTimeToFractionTime(phrase.startTime, errorLogger, scoreConverter),
        withTempo: phrase.withTempo === undefined ? undefined : new Fraction(phrase.withTempo)
    };
}

export function convertScoreRhythm(scoreRhythm: ScoreRhythmDescription): ScoreConverter {
    const signatureChanges: { bar: number; timeSignature: TimeSignature<string | number> }[] = [];
    const tempoChanges: { bar: number; tempo: MusicTempo<string | number> }[] = [];
    for (const { bar, timeSignature, tempo } of scoreRhythm) {
        if (timeSignature !== undefined) {
            signatureChanges.push({ bar, timeSignature });
        }
        if (tempo !== undefined) {
            tempoChanges.push({ bar, tempo });
        }
    }
    return new ScoreConverter(signatureChanges, tempoChanges);
}

// This is dirty and makes me wanna cry a bit.
// Edit : it's a tidbit better now that it is finished.

export function createJugglingScoreFromHelper(
    score: JugglingScoreHelper,
    errorLogger: TimedErrorLogger<Fraction>
): JugglingScore {
    const newScore = { jugglers: [], scoreRhythm: score.scoreRhythm };

    ballUserIDs;

    return newScore;

    // The two things that need to be modified from JSON are :
    // - the score converter
    // - all fraction-like types appearing in juggling phrases.
    const { scoreConverter: JSONScoreConverter } = JSONJugglingScore;
    const scoreConverter =
        JSONScoreConverter === undefined
            ? undefined
            : convertJSONScoreConverterToScoreConverter(JSONScoreConverter);

    const jugglers: JugglingScore["jugglers"] = [];
    for (const JSONjuggler of JSONJugglingScore.jugglers) {
        let jugglingPhrases: JugglingPhrase[] | undefined;
        if (JSONjuggler.jugglingPhrases === undefined) {
            jugglingPhrases = undefined;
        } else {
            jugglingPhrases = [];
            for (const JSONphrase of JSONjuggler.jugglingPhrases) {
                const phrase = convertJSONJugglingPhraseToJugglingPhrase(
                    JSONphrase,
                    errorLogger,
                    scoreConverter
                );
                jugglingPhrases.push(phrase);
            }
        }
        jugglers.push({ ...JSONjuggler, jugglingPhrases });
    }
    return {
        ...JSONJugglingScore,
        scoreConverter,
        jugglers
    };
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
                    name: ball.templateName,
                    namesList: ballTemplateNames,
                    errorMessage: `Unknown ball template name "${ball.templateName}" on the table of juggler "${jugglerName}".`,
                    errorLogger: errorLogger
                });

                // Uniqueness of ball user-defined IDs.
                handleIfStringDuplicate({
                    name: ball.id,
                    namesList: ballIDs,
                    errorMessage: `Duplicate ball ID: "${ball.id}".`,
                    errorLogger: errorLogger
                });
                ballIDs.set(ball.id, ball.templateName);

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
