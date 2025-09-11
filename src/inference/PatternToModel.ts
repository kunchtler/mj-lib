import Fraction from "fraction.js";
import { FracSortedList, Scheduler, SimulatorEvent } from "./Scheduler";
import { ScoreConverter, MusicTempo, MusicTime } from "./ScoreConverter";
import {
    PatternToSchedulerParams,
    patternToScheduler as parserParamsToSchedulerParams
} from "./ParserToScheduler";
import { simulateEvents } from "./SchedulerToModel";
import { PerformanceModel } from "../model/PerformanceModel";
import { RawPreParserEvent, PreParserEvent } from "./ParserToScheduler";
import { FracTimedErrorLogger, TimedErrorLogger } from "../utils";
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

//TODO : Silent Throws ?
//TODO : Have final repr in simulator using only splines ?
//TODO : Soft errors in simulator ! (with error Logger too ?) HECK YEAH !
//TODO : See how to handle errors when lexor is in PLS.

//TODO : Ici c'est la structure de donnée du minimum requis pour l'inférence.
//TODO : Faire en plus une structure de données avec la totale (modèles, sons, etc), de laquelle
//on récupèr les données minimales du TODO précédant.

//TODO : Where to critical fail ?
//TODO : Return error logger to ?

//TODO : Warning when ball is forcefully put in a spot of wrong kind. Is it here or in scheduler ?
//TODO : Handle all pre-parser processing in a dedicated function to better separate concerns ?
//TODO : Inconsistent table.template and ball.name to refer to template.

export function patternToModel(
    JSONPatternDescription: JSONJugglingScore,
    errorLogger: TimedErrorLogger
): PerformanceModel {
    // 1. Convert the JSON juggling score into a friendlier object.
    const jugglingScore = convertJSONJugglingScoreToJugglingScore(
        JSONPatternDescription,
        errorLogger
    );
    // Check for a critical failure to return early.
    if (errorLogger.hasCriticalError()) {
        return new PerformanceModel();
    }

    // 2. Check to see if :
    // - ball template names are unique. 1

    // - table template names are unique. 1
    // - Within a table template, spot names are unique. 1
    // - spots accepted balls refer to existing ball templates. 1

    // - juggler names are unique. 1
    // - a juggler's table refer to an existing template name. 1
    // - ball instances (held and on table) refer to existing templates. 1
    // - no two ball instances have the same user defined ID. 1
    // - gather all ball user IDs. 1
    // - generate IDs for all other balls.

    // 2.a Check if ball template names are unique.
    const ballTemplateNames = new Set<string>();
    for (const { name } of jugglingScore.ballTemplates) {
        if (ballTemplateNames.has(name)) {
            errorLogger.logError({
                severity: "CriticalError",
                message: `Duplicate ball template name: "${name}".`
            });
        }
        ballTemplateNames.add(name);
    }

    // 2.b Check if table template names are unique + TODO
    const tableTemplateNames = new Map<string, Set<string>>();
    for (const { name: templateName, spots } of jugglingScore.tableTemplates ?? []) {
        // Uniqueness of table template names.
        if (tableTemplateNames.has(templateName)) {
            errorLogger.logError({
                severity: "CriticalError",
                message: `Duplicate table template name: "${templateName}".`
            });
        }

        const spotNames = new Set<string>();
        for (const { name: spotName, acceptedBallName } of spots) {
            // Uniqueness of table spot names.
            if (spotNames.has(spotName)) {
                errorLogger.logError({
                    severity: "CriticalError",
                    message: `Duplicate spot name "${spotName}" on table template "${templateName}".`
                });
            }
            spotNames.add(spotName);

            // Spot accepted balls refer to existing ball template.
            if (acceptedBallName !== undefined && !ballTemplateNames.has(acceptedBallName)) {
                errorLogger.logError({
                    severity: "CriticalError",
                    message: `Unknown ball template name "${acceptedBallName}" for spot "${spotName}" on table template "${templateName}".`
                });
            }
        }

        tableTemplateNames.set(templateName, spotNames);
    }

    // 2.c Check if juggler names are unique.
    const jugglerNames = new Set<string>();
    const ballUserIDs = new Set<string>();
    for (const {
        name: jugglerName,
        ballsHeldAtStart,
        jugglingPhrases,
        table
    } of jugglingScore.jugglers) {
        // Uniqueness of juggler names.
        if (jugglerNames.has(jugglerName)) {
            errorLogger.logError({
                severity: "CriticalError",
                message: `Duplicate juggler name: "${jugglerName}".`
            });
        }
        jugglerNames.add(jugglerName);

        for (const ballsInHand of ballsHeldAtStart ?? [[], []]) {
            for (const ball of ballsInHand) {
                // Held balls refer to existing template name.
                if (!ballTemplateNames.has(ball.name)) {
                    errorLogger.logError({
                        severity: "CriticalError",
                        message: `Unknown ball template name "${ball.name}" held by juggler "${jugglerName}".`
                    });
                }

                // Uniqueness of ball user-defined IDs.
                if (ball.id !== undefined) {
                    if (ballUserIDs.has(ball.id)) {
                        errorLogger.logError({
                            severity: "CriticalError",
                            message: `Duplicate ball ID: "${ball.id}".`
                        });
                    }
                    ballUserIDs.add(ball.id);
                }
            }
        }

        if (table !== undefined) {
            // Table refers to an existing table template.
            const spotNamesOnTableTemplate = tableTemplateNames.get(table.template);
            if (spotNamesOnTableTemplate === undefined) {
                errorLogger.logError({
                    severity: "CriticalError",
                    message: `Unknown table template name "${table.template}" of juggler "${jugglerName}".`
                });
            }

            // Uniqueness of ball user-defined IDs
            for (const ball of table.ballsOnTableAtStart ?? []) {
                // Held balls refer to existing template name.
                if (!ballTemplateNames.has(ball.name)) {
                    errorLogger.logError({
                        severity: "CriticalError",
                        message: `Unknown ball template name "${ball.name}" on the table of juggler "${jugglerName}".`
                    });
                }

                // Uniqueness of ball user-defined IDs.
                if (ball.id !== undefined) {
                    if (ballUserIDs.has(ball.id)) {
                        errorLogger.logError({
                            severity: "CriticalError",
                            message: `Duplicate ball ID: "${ball.id}".`
                        });
                    }
                    ballUserIDs.add(ball.id);
                }

                // Spot name refer to an existing spot of the table.
                if (ball.spot !== undefined && !spotNamesOnTableTemplate?.has(ball.spot)) {
                    errorLogger.logError({
                        severity: "CriticalError",
                        message: `Unknown spot name "${ball.spot}" on the table of juggler "${jugglerName}".`
                    });
                }
            }
        }

        for (const { setupHands, thenPlace } of jugglingPhrases ?? []) {
            for (const ballsInHand of setupHands ?? [[], []]) {
                for (const ball of ballsInHand) {
                    if ("ballName" in ball) {
                        // TODO Today : Reuse checkBallNamesAndIDs. Gist : check no ball name is used for an ID.
                        // TODO : If so, do we really need to separate ballName from ballID in description ?
                        // TODO Today : -Reuse handleUnknownName / ID
                        // TODO Today : Once all IDs have been scanned, give unused IDs to other balls. (when to do ? In scheduler only right ?)
                    }
                }
            }
        }
    }

    // 2.d Within each table template, check if spot names are unique.

    if (tableTemplates !== undefined) {
        // Check if no duplicate table template name.
        const tableTemplateNames = new Set<string>();
        for (const tableTemplate of tableTemplates) {
            if (tableTemplateNames.has(tableTemplate.name)) {
                errorLogger.logError({
                    severity: "CriticalError",
                    message: `Error : When listing table templates, duplicate name "${tableTemplate.name}".`
                });
            }
            tableTemplateNames.add(tableTemplate.name);
        }

        for (const tableTemplate of tableTemplates) {
            // Check if no duplicate spot name + check if all balls exist.
            const spotNames = new Set<string>();
            for (const spot of tableTemplate.disposition) {
                if (spot.spotName !== undefined) {
                    if (spotNames.has(spot.spotName)) {
                        errorLogger.logError({
                            severity: "CriticalError",
                            message: `Error : When listing spot names in table template "${tableTemplate.name}", duplicate spot name "${spot.spotName}".`
                        });
                    }
                    spotNames.add(spot.spotName);
                }

                if (!ballTemplateNames.has(spot.ball)) {
                    errorLogger.logError({
                        severity: "CriticalError",
                        message: `Error : When listing spot names in table template "${tableTemplate.name}", unknown ball "${spot.ball}".`
                    });
                }
            }
        }
    }

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
    errorLogger: TimedErrorLogger,
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
    errorLogger: TimedErrorLogger,
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
export function convertJSONScoreConverterToScoreCOnverter(
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
    errorLogger: TimedErrorLogger
): JugglingScore {
    // The two things that need to be modified from JSON are :
    // - the score converter
    // - all fraction-like types appearing in juggling phrases.
    const { scoreConverter: JSONScoreConverter } = JSONJugglingScore;
    const scoreConverter =
        JSONScoreConverter === undefined
            ? undefined
            : convertJSONScoreConverterToScoreCOnverter(JSONScoreConverter);

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

export function