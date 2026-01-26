// import { score11 as score } from "../examples/patternTest";
import { JugglingScore, MiseEnScene } from "./PerformanceDescription";
import Fraction from "fraction.js";
import { JugglerState, Scheduler, SchedulerJuggler } from "./Scheduler";
import { PerformanceModel } from "../model/PerformanceModel";
import {
    closestWordsTo,
    ElementOf,
    FracTimedErrorLogger,
    setIntersection,
    TimedErrorLogger
} from "../utils";
import { formatJugglerPhrasesForScheduler } from "./ParserToScheduler";
import { GlobalBeatConverter } from "./GlobalBeatConverter";
import { createModelTimelines, CreateModelTimelinesParams } from "./SchedulerToTimelines";
import { BallModel, BallSound, HandModel, JugglerModel } from "../model";
import { Euler, Vector3 } from "three";
import { toVector } from "../utils/three/Vector";
import { SpotModelParams, toSpotParam } from "../model/SpotModel";

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
    miseEnScene: MiseEnScene,
    errorLogger: TimedErrorLogger<Fraction>
): PerformanceModel | undefined {
    const jugglersMap = new Map<
        string,
        ElementOf<JugglingScore["jugglers"]> & { errorLogger: FracTimedErrorLogger }
    >();
    for (const juggler of score.jugglers) {
        jugglersMap.set(juggler.name, { ...juggler, errorLogger });
    }

    // 1. Check if all names / user defined IDs are unique and gather them.
    const { ballTemplates, ballIDs, jugglerNames, tableIDs } = checkScoreNamesAndIDs(
        score,
        errorLogger
    );
    // Return early if there was a critical error.
    if (errorLogger.hasCriticalError()) {
        errorLogger.printErrorsInConsole();
        return undefined;
    }

    // 2. Create the global beat.
    const globalBeatConverter = new GlobalBeatConverter(score.globalBeat);

    // 3. Create the scheduler's parameters.
    // TODO : Change name.
    const schedulerJugglers = new Map<string, SchedulerJuggler>();
    const formattedRes = formatJugglerPhrasesForScheduler(
        jugglersMap,
        new Set(ballTemplates.keys()),
        ballIDs,
        globalBeatConverter
    );
    for (const juggler of jugglersMap.values()) {
        const { events, localBeatConverter } = formattedRes.get(juggler.name)!;
        const initialState = createInitialJugglerStates(juggler, errorLogger);

        let tableSpots: Map<string, string> | undefined = undefined;
        if (juggler.table !== undefined) {
            tableSpots = new Map<string, string>();
            for (const spot of juggler.table.spots) {
                tableSpots.set(spot.name, spot.acceptedBallName);
            }
        }
        schedulerJugglers.set(juggler.name, {
            events,
            initialState,
            tableSpots,
            errorLogger: juggler.errorLogger,
            localBeatConverter
        });
    }

    // 4. Use the scheduler to infer the complete timeline of events.
    const schedulerOutput = new Scheduler({
        ballIDMap: ballIDs,
        jugglers: schedulerJugglers
    }).validatePattern();

    // 5b. Console logs.
    console.log("Global Errors :\n");
    errorLogger.printErrorsInConsole();
    console.log("\n");
    for (const [jugglerName, { errorLogger, events: timeline }] of schedulerOutput) {
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
        // console.log("States:\n");
        // states.forEach((elem) => {
        //     console.log(stringifyState(elem, elem.beat) + "\n");
        // });
        // console.log("Events:\n");
        // events.forEach((elem) => {
        //     console.log(stringifyEvent(elem) + "\n");
        // });
        // console.log("Errors:\n");
        // errorLogger.printErrorsInConsole();
    }
    // console.log("Fini\n\n");

    // 6. Create the timelines.
    //TODO : More conviniently create this from a fusion of score and mise en scene.
    //TODO : Also check for errors.
    const ballIDsMiseEnScene = new Map<string, ElementOf<MiseEnScene["ballTemplates"]>>();
    const ballMapMiseEnScene = new Map<string, ElementOf<MiseEnScene["ballTemplates"]>>();
    for (const ball of miseEnScene.ballTemplates) {
        ballMapMiseEnScene.set(ball.name, ball);
    }
    for (const [ballID, ballName] of ballIDs) {
        ballIDsMiseEnScene.set(ballID, ballMapMiseEnScene.get(ballName)!);
    }
    const timelineJugglersParam: CreateModelTimelinesParams["jugglers"] = new Map();
    for (const [jugglerName, { events }] of schedulerOutput) {
        const { localBeatConverter } = schedulerJugglers.get(jugglerName)!;
        const { table } = jugglersMap.get(jugglerName)!;
        timelineJugglersParam.set(jugglerName, { events, localBeatConverter, tableID: table?.id });
    }
    const timelines = createModelTimelines({
        jugglers: timelineJugglersParam,
        ballIDToSound: ballIDsMiseEnScene,
        globalBeatConverter
    });

    // 7. Combine timelines with positions to create models.
    const performanceModel = new PerformanceModel();
    const ballTemplatesMiseEnScene = new Map<string, ElementOf<MiseEnScene["ballTemplates"]>>();
    for (const ball of miseEnScene.ballTemplates) {
        ballTemplatesMiseEnScene.set(ball.name, ball);
    }

    for (const [ballID, timeline] of timelines.balls) {
        const ballModel = new BallModel({
            id: ballID,
            radius: ballIDsMiseEnScene.get(ballID)!.radius,
            timeline: timeline
        });
        performanceModel.balls.set(ballID, ballModel);
    }
    //TODO : HANDLE SCALE LATER (need to adjust spot position correctly ?)
    //TODO : + need to have in ThreeSyncedProp scale as a Vector3 and not a single number.
    for (const juggler of miseEnScene.jugglers) {
        const handModels: HandModel[] = [];
        const handsDescription = [juggler.leftHand, juggler.rightHand];
        for (let handIdx = 0; handIdx < handsDescription.length; handIdx++) {
            const handDescription = handsDescription[handIdx];
            const spotsMap = new Map<number, SpotModelParams>();
            for (let spotIdx = 0; spotIdx < handDescription.heldSpots.length; spotIdx++) {
                const { position, rotation } = handDescription.heldSpots[spotIdx];
                spotsMap.set(spotIdx, toSpotParam(position, rotation));
            }
            const handModel = new HandModel({
                jugglerName: juggler.name,
                catchSpot: toSpotParam(
                    handDescription.catchSpot.position,
                    handDescription.catchSpot.rotation
                ),
                tossSpot: toSpotParam(
                    handDescription.tossSpot.position,
                    handDescription.tossSpot.rotation
                ),
                restSpot: toSpotParam(
                    handDescription.restSpot.position,
                    handDescription.restSpot.rotation
                ),
                swapSpot: toSpotParam(
                    handDescription.swapSpot.position,
                    handDescription.swapSpot.rotation
                ),
                defaultHoldSpotNumber: spotsMap.size - 1,
                holdSpots: spotsMap,
                scale: toVector(juggler.scale),
                timeline: timelines.jugglers.get(juggler.name)![handIdx]
            });
            handModels.push(handModel);
        }
        const jugglerModel = new JugglerModel({
            name: juggler.name,
            position: new Vector3(...juggler.position),
            rotation: new Euler(...juggler.rotation),
            scale: new Vector3(...juggler.scale),
            hands: handModels as [HandModel, HandModel]
        });
        performanceModel.jugglers.set(juggler.name, jugglerModel);
    }

    return performanceModel;
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
    ballTemplates: Map<string, { soundOnCatch?: BallSound; soundOnToss?: BallSound } | undefined>;
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
    const ballTemplates = new Map<
        string,
        { soundOnCatch?: BallSound; soundOnToss?: BallSound } | undefined
    >();
    for (const { name: templateName, soundOnCatch, soundOnToss } of score.ballTemplates) {
        handleIfStringDuplicate({
            name: templateName,
            namesList: ballTemplates,
            errorMessage: `Duplicate ball template name: "${templateName}".`,
            errorLogger: errorLogger
        });
        ballTemplates.set(templateName, { soundOnCatch, soundOnToss });
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
                    namesList: ballTemplates,
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
                    namesList: ballTemplates,
                    errorMessage: `Unknown ball template name "${acceptedBallName}" for spot "${spotName}" on table of juggler ${jugglerName} (id: ${table.id}).`,
                    errorLogger: errorLogger
                });
            }

            for (const ball of table.ballsOnTableAtStart) {
                // Balls on table refer to existing template name.
                handleIfStringUnknown({
                    name: ball.name,
                    namesList: ballTemplates,
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
                            namesList: ballTemplates,
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
                        namesList: ballTemplates,
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
    const intersection = setIntersection(new Set(ballTemplates.keys()), new Set(ballIDs.keys()));
    if (intersection.size > 0) {
        for (const name of intersection) {
            errorLogger.logError({
                severity: "CriticalError",
                message: `"${name}" is both a ball template name and a ball ID.`
            });
        }
    }

    return { ballTemplates: ballTemplates, ballIDs, jugglerNames, tableIDs };
}

export function handleIfStringUnknown({
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

export function handleIfStringDuplicate({
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
