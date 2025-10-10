import Fraction from "fraction.js";
import {
    getFirstInsertedKey,
    JugglerState,
    Scheduler,
    SchedulerJuggler,
    SymbolicEvent
} from "./Scheduler";
import { ScoreConverter, MusicTempo, MusicTime } from "./ScoreConverter";
import { simulateEvents } from "./SchedulerToModel";
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
import {
    JSONJugglingPhrase,
    JSONJugglingScore,
    JSONScoreConverter,
    JSONTime,
    JugglingPhrase,
    JugglingScore
} from ".";
import { formatJugglerPhrasesForScheduler } from "./ParserToScheduler";

import { score11 as score } from "../examples/patternTest";
import { Timeline } from "../utils/Timeline";
import { FracTimeline } from "../utils/FracTimeline";

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

JSONJugglingScoreToModel(score, new FracTimedErrorLogger());

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
    // 5. Use the scheduler to infer the complete timeline of events.
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

    const schedulerOutput = new Scheduler({
        ballIDMap: ballIDToTemplateName,
        jugglers: schedulerJugglers
    }).validatePattern();

    console.log("Global Errors :\n");
    errorLogger.printErrorsInConsole();
    console.log("\n");
    for (const [jugglerName, { errorLogger, events, states }] of schedulerOutput) {
        console.log(`Juggler ${jugglerName} :\n`);
        const tmp = new FracTimeline<{ state?: JugglerState; event?: SymbolicEvent<Fraction> }>();
        for (const { beat, ...state } of states) {
            tmp.setElement(beat, { state: state });
        }
        for (const ev of events) {
            const elem = tmp.getElementByKey(ev.beat);
            if (elem !== undefined) {
                elem.event = ev;
            } else {
                tmp.setElement(ev.beat, { event: ev });
            }
        }
        for (const [beat, { state, event }] of tmp) {
            console.log(stringifyStateEvent(beat, state, event));
            console.log("\n");
        }
        // console.log("States:\n");
        // states.forEach((elem) => {
        //     console.log(stringifyState(elem, elem.beat) + "\n");
        // });
        // console.log("Events:\n");
        // events.forEach((elem) => {
        //     console.log(stringifyEvent(elem) + "\n");
        // });
        // console.log("Errors:\n");
        errorLogger.printErrorsInConsole();
    }
    console.log("Fini");
    // 6. TODO : here. Or stop at 5 ? ??? Simulate (?) the timeline ???

    // TODO Today : Once all IDs have been scanned, give unused IDs to other balls. (when to do ? In scheduler only right ?)

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

/**
 * Convert JSON time to a Fraction.
 * @param timeJSON the time to convert.
 * @param scoreConverter an optional score converter (if time if provided as bar and beat)
 * @param errorLogger an error logger in case a score converter was missing but required.
 * @returns the time converted to a Fraction.
 */
export function convertJSONTimeToFractionTime(
    timeJSON: JSONTime,
    errorLogger: TimedErrorLogger<Fraction>,
    scoreConverter?: ScoreConverter
): Fraction {
    if (typeof timeJSON === "number" || typeof timeJSON === "string") {
        return new Fraction(timeJSON);
    }
    if (scoreConverter === undefined) {
        errorLogger.logError({
            severity: "CriticalError",
            message: `Can't convert score time information because no JSON Score Converter was provided.`
        });
        return new Fraction(0);
    }
    return scoreConverter.convertMeasureToBeat([timeJSON.bar, new Fraction(timeJSON.beat)]);
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

/**
 * Convert JSON simplified score converter into a full ScoreConverter instance.
 * @param scoreConverterJSON the JSON score converter.
 * @returns the ScoreConverter instance.
 */
export function convertJSONScoreConverterToScoreConverter(
    scoreConverterJSON: JSONScoreConverter
): ScoreConverter {
    const signatureChanges: [number, Fraction][] = [];
    const tempoChanges: [number, MusicTempo][] = [];
    for (const { bar, timeSignature, tempo } of scoreConverterJSON) {
        if (timeSignature !== undefined) {
            signatureChanges.push([bar, new Fraction(timeSignature)]);
        }
        if (tempo !== undefined) {
            tempoChanges.push([bar, { note: new Fraction(tempo.note), bpm: tempo.bpm }]);
        }
    }
    return new ScoreConverter(signatureChanges, tempoChanges);
}

//TODO : add beat to the object rather than have a 2-array element.

// This is dirty and makes me wanna cry a bit.
// Edit : it's a tidbit better now that it is finished.
/**
 * Convert a JSON juggling score to a juggling score object.
 * @param JSONJugglingScore the JSON
 * @param errorLogger an error logger that will signal a critical fail if operation failed.
 * @returns the pattern description.
 */
export function convertJSONToJugglingScore(
    JSONJugglingScore: JSONJugglingScore,
    errorLogger: TimedErrorLogger<Fraction>
): JugglingScore {
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

export function handleIfNameUnknown({
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

export function handleIfNameDuplicate({
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

// TODO: generate IDs for all other balls.

export function checkAndGatherJugglingScoreNamesAndIDs(
    jugglingScore: JugglingScore,
    errorLogger: TimedErrorLogger<Fraction>
): {
    ballTemplateNames: Set<string>;
    ballUserIDs: Map<string, string>;
    tableTemplateNames: Map<string, Set<string>>;
    jugglerNames: Set<string>;
} {
    // 2. Check to see if :
    // - ball template names are unique.

    // - table template names are unique.
    // - Within a table template, spot names are unique.
    // - spots accepted balls refer to existing ball templates.

    // - juggler names are unique.
    // - a juggler's table refer to an existing template name.
    // - ball instances (held and on table) refer to existing templates.
    // - no two ball instances have the same user defined ID.
    // - gather all ball user IDs.

    // - Check that no ball name is also an ID and conversely.

    // 2.a Check if ball template names are unique.
    const ballTemplateNames = new Set<string>();
    for (const { name: templateName } of jugglingScore.ballTemplates) {
        handleIfNameDuplicate({
            name: templateName,
            namesList: ballTemplateNames,
            errorMessage: `Duplicate ball template name: "${templateName}".`,
            errorLogger: errorLogger
        });
        ballTemplateNames.add(templateName);
    }

    // 2.b Check if table template names are unique + TODO
    const tableTemplateNames = new Map<string, Set<string>>();
    for (const { name: templateName, spots } of jugglingScore.tableTemplates ?? []) {
        // Uniqueness of table template names.
        handleIfNameDuplicate({
            name: templateName,
            namesList: tableTemplateNames,
            errorMessage: `Duplicate table template name: "${templateName}".`,
            errorLogger: errorLogger
        });

        const spotNames = new Set<string>();
        for (const { name: spotName, acceptedBallName } of spots) {
            // Uniqueness of table spot names.
            handleIfNameDuplicate({
                name: spotName,
                namesList: spotNames,
                errorMessage: `Duplicate spot name "${spotName}" on table template "${templateName}".`,
                errorLogger: errorLogger
            });
            spotNames.add(spotName);

            // Spot accepted balls refer to existing ball template.
            if (acceptedBallName !== undefined) {
                handleIfNameUnknown({
                    name: acceptedBallName,
                    namesList: ballTemplateNames,
                    errorMessage: `Unknown ball template name "${acceptedBallName}" for spot "${spotName}" on table template "${templateName}".`,
                    errorLogger: errorLogger
                });
            }
        }

        tableTemplateNames.set(templateName, spotNames);
    }

    // 2.c Juggler checks.
    const jugglerNames = new Set<string>();
    const ballUserIDs = new Map<string, string>();
    for (const {
        name: jugglerName,
        ballsHeldAtStart,
        jugglingPhrases,
        table
    } of jugglingScore.jugglers) {
        // Uniqueness of juggler names.
        handleIfNameDuplicate({
            name: jugglerName,
            namesList: jugglerNames,
            errorMessage: `Duplicate juggler name: "${jugglerName}".`,
            errorLogger: errorLogger
        });
        jugglerNames.add(jugglerName);

        for (const ballsInHand of ballsHeldAtStart ?? [[], []]) {
            for (const ball of ballsInHand) {
                // Held balls refer to existing template name.
                handleIfNameUnknown({
                    name: ball.name,
                    namesList: ballTemplateNames,
                    errorMessage: `Unknown ball template name "${ball.name}" held by juggler "${jugglerName}".`,
                    errorLogger: errorLogger
                });

                // Uniqueness of ball user-defined IDs.
                if (ball.id !== undefined) {
                    handleIfNameDuplicate({
                        name: ball.id,
                        namesList: ballUserIDs,
                        errorMessage: `Duplicate ball ID: "${ball.id}".`,
                        errorLogger: errorLogger
                    });
                    ballUserIDs.set(ball.id, ball.name);
                }
            }
        }

        const spotNamesOnTable =
            table === undefined ? undefined : tableTemplateNames.get(table.template);
        if (table !== undefined) {
            // Table refers to an existing table template.
            handleIfNameUnknown({
                name: table.template,
                namesList: tableTemplateNames,
                errorMessage: `Unknown table template name "${table.template}" of juggler "${jugglerName}".`,
                errorLogger: errorLogger
            });

            for (const ball of table.ballsOnTableAtStart ?? []) {
                // Balls on table refer to existing template name.
                handleIfNameUnknown({
                    name: ball.name,
                    namesList: ballTemplateNames,
                    errorMessage: `Unknown ball template name "${ball.name}" on the table of juggler "${jugglerName}".`,
                    errorLogger: errorLogger
                });

                // Uniqueness of ball user-defined IDs.
                if (ball.id !== undefined) {
                    handleIfNameDuplicate({
                        name: ball.id,
                        namesList: ballUserIDs,
                        errorMessage: `Duplicate ball ID: "${ball.id}".`,
                        errorLogger: errorLogger
                    });
                    ballUserIDs.set(ball.id, ball.name);
                }

                // Spot name refer to an existing spot of the table.
                if (ball.spot !== undefined && spotNamesOnTable !== undefined) {
                    handleIfNameUnknown({
                        name: ball.spot,
                        namesList: spotNamesOnTable,
                        errorMessage: `Unknown spot name "${ball.spot}" on the table of juggler "${jugglerName}".`,
                        errorLogger: errorLogger
                    });
                }
            }
        }

        for (const { startTime, setupHands } of jugglingPhrases ?? []) {
            for (const ballsInHand of setupHands?.have ?? [[], []]) {
                for (const ball of ballsInHand) {
                    if ("name" in ball) {
                        // All ball templates refer to existing template names.
                        handleIfNameUnknown({
                            name: ball.name,
                            namesList: ballTemplateNames,
                            errorMessage: `Unknown ball template name "${ball.name}" in juggling phrases of juggler "${jugglerName}".`,
                            errorLogger: errorLogger,
                            time: startTime
                        });
                    }
                    if ("id" in ball) {
                        // All ball IDs refer to existing user-defined IDs.
                        handleIfNameUnknown({
                            name: ball.id,
                            namesList: ballUserIDs,
                            errorMessage: `Unknown ball ID "${ball.id}" in juggling phrases of juggler ${jugglerName}.`,
                            errorLogger: errorLogger,
                            time: startTime
                        });
                    }
                    if ("fromSpot" in ball && ball.fromSpot !== undefined) {
                        if (table === undefined) {
                            errorLogger.logError({
                                severity: "CriticalError",
                                message: `Juggler "${jugglerName}" has no table, so can't use the fromSpot attribute.`,
                                time: startTime
                            });
                        } else if (spotNamesOnTable !== undefined) {
                            // If the table template is unknown, a warning has been issued preivously.
                            handleIfNameUnknown({
                                name: ball.fromSpot,
                                namesList: spotNamesOnTable,
                                errorMessage: `Unknown spot name "${ball.fromSpot}" on the table of juggler "${jugglerName}".`,
                                errorLogger: errorLogger,
                                time: startTime
                            });
                        }
                    }

                    // TODO Today : Reuse checkBallNamesAndIDs. Gist : check no ball name is used for an ID.
                }
            }

            for (const ball of setupHands?.place ?? []) {
                if ("name" in ball) {
                    handleIfNameUnknown({
                        name: ball.name,
                        namesList: ballTemplateNames,
                        errorMessage: `TODO`,
                        errorLogger: errorLogger,
                        time: startTime
                    });
                } else {
                    handleIfNameUnknown({
                        name: ball.id,
                        namesList: ballUserIDs,
                        errorMessage: `TODO`,
                        errorLogger: errorLogger,
                        time: startTime
                    });
                }

                if (table === undefined) {
                    errorLogger.logError({
                        severity: "CriticalError",
                        message: `Juggler "${jugglerName}" has no table, so can't use the toSpot attribute.`,
                        time: startTime
                    });
                } else if (spotNamesOnTable !== undefined && ball.toSpot !== undefined) {
                    // If spotNamesOnTable is undefined, then an error message has already been logged.
                    handleIfNameUnknown({
                        name: ball.toSpot,
                        namesList: spotNamesOnTable,
                        errorMessage: `TODO.`,
                        errorLogger: errorLogger,
                        time: startTime
                    });
                }
            }
        }
    }

    // - Check that no ball name is also an ID and conversely.
    const intersection = setIntersection(ballTemplateNames, new Set(ballUserIDs.keys()));
    if (intersection.size > 0) {
        for (const name of intersection) {
            errorLogger.logError({
                severity: "CriticalError",
                message: `"${name}" is both a ball template name and a ball ID.`
            });
        }
    }

    return { ballTemplateNames, ballUserIDs, tableTemplateNames, jugglerNames };
}
