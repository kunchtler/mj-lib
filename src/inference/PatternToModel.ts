import Fraction from "fraction.js";
import { FracSortedList, Scheduler, SimulatorEvent } from "./old_Scheduler";
import { ScoreConverter, MusicTempo, MusicTime } from "./ScoreConverter";
import { simulateEvents } from "./SchedulerToModel";
import { PerformanceModel } from "../model/PerformanceModel";
import { closestWordsTo, FracTimedErrorLogger, setIntersection, TimedErrorLogger } from "../utils";
import {
    JSONJugglingPhrase,
    JSONJugglingScore,
    JSONPerformanceDescription,
    JSONScoreConverter,
    JSONTime,
    JugglingPhrase,
    JugglingScore,
    JugglingScoreGenerics
} from ".";
import { produce } from "immer";
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
    const jugglingScore = convertJSONJugglingScoreToJugglingScore(JSONJugglingScore, errorLogger);
    // Return early if there was a critical error.
    if (errorLogger.hasCriticalError()) {
        return undefined;
    }

    // 2. Check if all names / user defined IDs are unique and gather them.
    const { ballTemplateNames, ballUserIDs, jugglerNames, tableTemplateNames } =
        checkAndGatherJugglingScoreNamesAndIDs(jugglingScore, errorLogger);
    // Return early if there was a critical error.
    if (errorLogger.hasCriticalError()) {
        return undefined;
    }

    // 3. Add an ID to each ball (initially, on table or held) that doesn't have one.
    // The generated IDs are of the form : name?juggler?number. Ex : Do?Vincent?0
    const ballGeneratedIDs = addMissingBallID(jugglingScore, ballTemplateNames, ballUserIDs);

    const ballIDs = new Map<string, string>([...ballUserIDs, ...ballGeneratedIDs]);

    // 4. Parse each juggling phrase and format them.
    // Complete each information we can by looking at jugglers individually.
    for (const juggler of jugglingScore.jugglers) {
        formatJugglerPhrasesForScheduler(
            juggler.jugglingPhrases ?? [],
            juggler.name,
            ballTemplateNames,
            ballUserIDs,
            jugglerNames,
            errorLogger,
            jugglingScore.scoreConverter
        );
    }
    //TOCONTINUE : Scheduler + Form scheduler params + Finish all inference + Test

    // 5. Use the scheduler to infer the complete timeline of events.

    // 6. TODO : here. Or stop at 5 ? ??? Simulate (?) the timeline ???

    // TODO Today : Once all IDs have been scanned, give unused IDs to other balls. (when to do ? In scheduler only right ?)

    // 1b. rawJugglers
    const preParserJugglers = new Map<
        string,
        {
            balls: { id: string; name: string }[];
            events: FracSortedList<PreParserEvent>;
            table?: string;
        }
    >();
    for (const { name, events: rawEvents, balls, hasTable: table } of rawJugglers) {
        preParserJugglers.set(name, {
            balls: balls,
            events: convertJSONPatternToTODO(rawEvents, musicConverter),
            table: table
        });
    }
    if (preParserJugglers.size !== rawJugglers.length) {
        throw Error("TODO : Duplicate juggler name");
    }

    // 1c. Gather ball info from jugglers.
    //TODO : Fuse ballIDs and BallIDSounds ?
    //TODO : Sound on toss / catch.
    const ballIDs = new Map<
        string,
        { name: string; sound?: string; juggler: string; id: string }
    >();
    const ballNames = new Set<string>();
    const ballSounds = new Set<string>();
    for (const { name, balls } of rawJugglers) {
        for (const ball of balls) {
            if (ballIDs.has(ball.id)) {
                throw Error("TODO : Duplicate ball ID");
            }
            ballIDs.set(ball.id, {
                name: ball.name,
                sound: ball.sound,
                juggler: name,
                id: ball.id
            });
            ballTemplateNames.add(ball.name);
            if (ball.sound !== undefined) {
                ballSounds.add(ball.sound);
            }
        }
    }

    // 1d. Compile the parameters for the parser.
    const parserParams: PatternToSchedulerParams = {
        ballNames: ballTemplateNames,
        ballIDs: ballIDs,
        jugglerEvents: preParserJugglers,
        musicConverter: musicConverter
    };

    //TODO : Rename to parser only ? Name of method a bit convoluted.
    const schedulerParams = parserParamsToSchedulerParams(parserParams);
    const postSchedulerParams = new Scheduler(schedulerParams).validatePattern();

    // Creating the params for the simulation
    // const ballIDSounds2 = new Map<
    //     string,
    //     {
    //         onToss?: string | EventSound;
    //         onCatch?: string | EventSound;
    //     }
    // >();
    // for (const [name, sound] of ballIDs) {
    //     ballIDSounds2.set(name, { onCatch: sound });
    // }

    const jugglerParams = new Map<
        string,
        {
            table?: string;
            events: FracSortedList<SimulatorEvent<Fraction>>;
        }
    >();
    for (const [name, { events }] of postSchedulerParams) {
        jugglerParams.set(name, { events, table: preParserJugglers.get(name)?.table });
    }

    return simulateEvents({
        jugglers: jugglerParams,
        ballIDSounds: ballIDs,
        musicConverter: musicConverter
    });
}

//////////////////////////// Functions //////////////////////////

// The generated IDs are of the form : name?juggler?number. Ex : Do?Vincent?0
export function addMissingBallID(
    jugglingScore: JugglingScore,
    ballTemplateNames: Set<string>,
    ballUserIDs: Map<string, string>
): Map<string, string> {
    const ballGeneratedIDs = new Map<string, string>();
    for (const juggler of jugglingScore.jugglers) {
        for (const ballsInHand of juggler.ballsHeldAtStart ?? [[], []]) {
            for (const ball of ballsInHand) {
                if (ball.id === undefined) {
                    const ballIDRoot = `${ball.name}?${juggler.name}?`;
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
                    ballGeneratedIDs.set(ballID, ball.name);
                }
            }
        }
    }
    return ballGeneratedIDs;
}

// export function formatJugglerBalls(
//     commonBallNames: string[],
//     jugglersSpecificBallNames: { name: string; ballNames: string[] }[]
// ): { name: string; balls: Ball[] }[] {
//     const jugglerBalls: { name: string; balls: Ball[] }[] = [];
//     for (const { name: jugglerName, ballNames: specificBallNames } of jugglersSpecificBallNames) {
//         const balls: Ball[] = [];
//         for (const ball of [...commonBallNames, ...specificBallNames]) {
//             balls.push({ id: ball, id: ball + "?" + jugglerName });
//         }
//         jugglerBalls.push({ name: jugglerName, balls: balls });
//     }
//     return jugglerBalls;
// }

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
export function convertJSONJugglingScoreToJugglingScore(
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
                    if ("ballName" in ball) {
                        // All ball templates refer to existing template names.
                        handleIfNameUnknown({
                            name: ball.ballName,
                            namesList: ballTemplateNames,
                            errorMessage: `Unknown ball template name "${ball.ballName}" in juggling phrases of juggler "${jugglerName}".`,
                            errorLogger: errorLogger,
                            time: startTime
                        });
                    }
                    if ("ballID" in ball) {
                        // All ball IDs refer to existing user-defined IDs.
                        handleIfNameUnknown({
                            name: ball.ballID,
                            namesList: ballUserIDs,
                            errorMessage: `Unknown ball ID "${ball.ballID}" in juggling phrases of juggler ${jugglerName}.`,
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
                if ("ballName" in ball) {
                    handleIfNameUnknown({
                        name: ball.ballName,
                        namesList: ballTemplateNames,
                        errorMessage: `TODO`,
                        errorLogger: errorLogger,
                        time: startTime
                    });
                } else {
                    handleIfNameUnknown({
                        name: ball.ballID,
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
