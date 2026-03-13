// import { score11 as score } from "../examples/patternTest";
import { JugglingScore, PerformanceLayout, BallSoundDescription } from "./PerformanceDescription";
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
import { BallModel, HandModel, JugglerModel, TableModel } from "../model";
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

export function performanceDescriptionToModel(
    score: JugglingScore,
    layout: PerformanceLayout,
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
        const table: ElementOf<JugglingScore["tables"]> | undefined = score.tables.find(
            (table) => table.id === juggler.defaultTableID
        );
        const initialState = createInitialJugglerStates(juggler, table, errorLogger);

        // TODO : Adapt Scheduler to have tables outside of juggling state.
        let tableSpots: Map<string, string> | undefined = undefined;
        if (table !== undefined) {
            tableSpots = new Map<string, string>();
            for (const spot of table.spots) {
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
    const ballIDMap = new Map<string, string>();
    for (const [ballID, { template }] of ballIDs) {
        ballIDMap.set(ballID, template);
    }
    const schedulerOutput = new Scheduler({
        ballIDMap: ballIDMap,
        jugglers: schedulerJugglers
    }).validatePattern();

    // 5b. Console logs.
    // console.log("Global Errors :\n");
    // errorLogger.printErrorsInConsole();
    // console.log("\n");
    // for (const [jugglerName, { errorLogger, events: timeline }] of schedulerOutput) {
    //     console.log(`Juggler ${jugglerName} :\n`);
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
    // }
    // console.log("Fini\n\n");

    // 6. Create the timelines.
    //TODO : More conviniently create this from a fusion of score and mise en scene.
    //TODO : Also check for errors.
    const timelineJugglersParam: CreateModelTimelinesParams["jugglers"] = new Map();
    for (const [jugglerName, { events }] of schedulerOutput) {
        const { localBeatConverter } = schedulerJugglers.get(jugglerName)!;
        const { defaultTableID } = jugglersMap.get(jugglerName)!;
        timelineJugglersParam.set(jugglerName, {
            events,
            localBeatConverter,
            tableID: defaultTableID
        });
    }
    const timelines = createModelTimelines({
        jugglers: timelineJugglersParam,
        ballIDToSound: ballIDs,
        globalBeatConverter,
        tableDescriptions: score.tables
    });

    // 7. Combine timelines with positions to create models.
    const performanceModel = new PerformanceModel();

    for (const [ballID, timeline] of timelines.balls) {
        const ballModel = new BallModel({
            id: ballID,
            radius: layout.balls.find((ball) => ball.id === ballID)!.radius,
            timeline: timeline
        });
        performanceModel.balls.set(ballID, ballModel);
    }
    //TODO : HANDLE SCALE LATER (need to adjust spot position correctly ?)
    //TODO : + need to have in ThreeSyncedProp scale as a Vector3 and not a single number.
    for (const juggler of layout.jugglers) {
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

    for (const table of layout.tables) {
        const spotsParams = new Map<string, SpotModelParams>();
        for (const spot of table.spots) {
            spotsParams.set(spot.name, {
                position: new Vector3(...spot.position),
                rotation: new Euler(...spot.rotation)
            });
        }
        const tableModel = new TableModel({
            id: table.id,
            position: new Vector3(...table.position),
            rotation: new Euler(...table.rotation),
            scale: new Vector3(...table.scale),
            spotsParams: spotsParams,
            unkownSpot: {
                position: new Vector3(...table.unknownSpot.position),
                rotation: new Euler(...table.unknownSpot.rotation)
            }
        });
        performanceModel.tables.set(table.id, tableModel);
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
    table: ElementOf<JugglingScore["tables"]> | undefined,
    errorLogger: TimedErrorLogger<Fraction>
): JugglerState {
    const heldState: JugglerState["held"] = [[], []];
    for (let handIdx = 0; handIdx < 2; handIdx++) {
        for (const ballID of juggler.ballsHeldAtStart[handIdx]) {
            //TODO In the future : support undefined ???
            if (ballID === undefined) {
                errorLogger.logError({
                    severity: "Error",
                    message: `Juggler ${juggler.name} can't start with undefined spots in hands. This is not supported yet.`
                });
                continue;
            }
            heldState[handIdx].push(ballID);
        }
    }

    let tableState: JugglerState["table"] = undefined;
    if (table !== undefined) {
        tableState = { namedSpot: new Map(), unknown: new Set() };
        for (const spot of table.spots) {
            if (spot.ballAtStart !== undefined) {
                tableState.namedSpot.set(spot.name, spot.ballAtStart);
            }
        }
        for (const ballID of table.unknownSpot.ballIDs) {
            tableState.unknown.add(ballID);
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
    ballTemplates: Set<string>;
    ballIDs: Map<
        string,
        {
            template: string;
            soundOnCatch?: BallSoundDescription;
            soundOnToss?: BallSoundDescription;
        }
    >;
    tableIDs: Set<string>;
    jugglerNames: Set<string>;
} {
    // Check to see if :
    // - ball IDs and template names are unique (held and on table and in juggling phrases "setupHands").
    // - table IDs are unique.
    // - ballIDs on a table and in hands refer to existing ball IDs.
    // - on a table, spot names are unique.
    // - on a table, balls refer to existing spot names.
    // - juggler names are unique.
    // - check that no ball name is also an ID and conversely.

    // Populate ball Ids and templates maps and sets.
    const ballTemplates = new Set<string>();
    const ballIDs = new Map<
        string,
        {
            template: string;
            soundOnCatch?: BallSoundDescription;
            soundOnToss?: BallSoundDescription;
        }
    >();
    for (const { id, templateName, soundOnCatch, soundOnToss } of score.balls) {
        ballTemplates.add(templateName);
        handleIfStringDuplicate({
            name: id,
            namesList: ballIDs,
            errorMessage: `Duplicate ball ID: "${id}".`,
            errorLogger: errorLogger
        });
        ballIDs.set(id, { template: templateName, soundOnCatch, soundOnToss });
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

    // Table checks.
    const tableIDs = new Set<string>();
    const foundBallIDs = new Set<string>();
    for (const table of score.tables) {
        const spotNames = new Set<string>();

        // Check if table ID is unique.
        handleIfStringDuplicate({
            name: table.id,
            namesList: tableIDs,
            errorMessage: `Duplicate table ID "${table.id}".`,
            errorLogger: errorLogger
        });
        tableIDs.add(table.id);

        for (const spot of table.spots) {
            // Uniqueness of table spot names.
            handleIfStringDuplicate({
                name: spot.name,
                namesList: spotNames,
                errorMessage: `Duplicate spot name "${spot.name}" on table ${table.id}.`,
                errorLogger: errorLogger
            });
            spotNames.add(spot.name);

            // Spot accepted balls refer to existing ball template.
            // handleIfStringUnknown({
            //     name: acceptedBallName,
            //     namesList: ballTemplates,
            //     errorMessage: `Unknown ball template name "${acceptedBallName}" for spot "${spotName}" on table ${table.id}.`,
            //     errorLogger: errorLogger
            // });

            if (spot.ballAtStart !== undefined) {
                // Balls on table refer to existing ball ID.
                handleIfStringUnknown({
                    name: spot.ballAtStart,
                    namesList: ballIDs,
                    errorMessage: `Unknown ball ID "${spot.ballAtStart}" on the table ${table.id}.`,
                    errorLogger: errorLogger
                });

                // Balls are in one place only.
                handleIfStringDuplicate({
                    name: spot.ballAtStart,
                    namesList: foundBallIDs,
                    errorMessage: `Ball ${spot.ballAtStart} has been created twice.`,
                    errorLogger: errorLogger
                });
                foundBallIDs.add(spot.ballAtStart);

                // Ball is of the correct type.
                const ballTemplate =
                    ballIDs.get(spot.ballAtStart)?.template ?? spot.acceptedBallName;
                if (ballTemplate !== spot.acceptedBallName) {
                    errorLogger.logError({
                        severity: "Warn",
                        message: `Ball ${spot.ballAtStart} is on a spot that should only accept ball with template ${spot.acceptedBallName}.`
                    });
                }
            }
        }

        for (const ballID of table.unknownSpot.ballIDs) {
            // Balls on table refer to existing ball ID.
            handleIfStringUnknown({
                name: ballID,
                namesList: ballIDs,
                errorMessage: `Unknown ball ID "${ballID}" on the table ${table.id}.`,
                errorLogger: errorLogger
            });

            // Balls are in one place only.
            handleIfStringDuplicate({
                name: ballID,
                namesList: foundBallIDs,
                errorMessage: `Ball ${ballID} has been created twice.`,
                errorLogger: errorLogger
            });
            foundBallIDs.add(ballID);
        }
    }

    // Juggler checks.
    const jugglerNames = new Set<string>();
    for (const {
        name: jugglerName,
        ballsHeldAtStart,
        jugglingPhrases,
        defaultTableID
    } of score.jugglers) {
        // Uniqueness of juggler names.
        handleIfStringDuplicate({
            name: jugglerName,
            namesList: jugglerNames,
            errorMessage: `Duplicate juggler name: "${jugglerName}".`,
            errorLogger: errorLogger
        });
        jugglerNames.add(jugglerName);

        //Table ID refers to an existing table.
        let table: ElementOf<JugglingScore["tables"]> | undefined = undefined;
        if (defaultTableID !== undefined) {
            handleIfStringUnknown({
                name: defaultTableID,
                namesList: tableIDs,
                errorMessage: `Table ID no found: "${defaultTableID}".`,
                errorLogger: errorLogger
            });
            table = score.tables.find((table) => table.id === defaultTableID);
        }

        for (const ballsInHand of ballsHeldAtStart) {
            for (const ballID of ballsInHand) {
                if (ballID === undefined) {
                    continue;
                }
                // Held balls refer to existing ball IDs
                handleIfStringUnknown({
                    name: ballID,
                    namesList: ballIDs,
                    errorMessage: `Unknown ball template name "${ballID}" held by juggler "${jugglerName}".`,
                    errorLogger: errorLogger
                });

                // Uniqueness of ball IDs.
                handleIfStringDuplicate({
                    name: ballID,
                    namesList: foundBallIDs,
                    errorMessage: `Duplicate ball ID: "${ballID}".`,
                    errorLogger: errorLogger
                });
                foundBallIDs.add(ballID);
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
                            } else {
                                // All spot names refer to existing spot names.
                                handleIfStringUnknown({
                                    name: ball.fromSpot,
                                    namesList: new Set(table.spots.map((spot) => spot.name)),
                                    errorMessage: `Unknown spot name "${ball.fromSpot}" on the table of juggler "${jugglerName}".`,
                                    errorLogger: errorLogger
                                });
                            }
                        }
                    } else {
                        // Held balls refer to existing ball IDs
                        handleIfStringUnknown({
                            name: ball.id,
                            namesList: ballIDs,
                            errorMessage: `Unknown ball ID "${ball.id}" in juggling phrases of juggler ${jugglerName}.`,
                            errorLogger: errorLogger
                        });

                        // Uniqueness of ball IDs.
                        handleIfStringDuplicate({
                            name: ball.id,
                            namesList: foundBallIDs,
                            errorMessage: `Duplicate ball ID: "${ball.id}".`,
                            errorLogger: errorLogger
                        });
                        foundBallIDs.add(ball.id);
                    }
                }
            }

            for (const ball of setupHands?.placeBalls ?? []) {
                if (ball.type === "byName") {
                    // All ball templates refer to existing template names.
                    handleIfStringUnknown({
                        name: ball.name,
                        namesList: ballTemplates,
                        errorMessage: `Unknown ball template name "${ball.name}" in juggling phrases of juggler "${jugglerName}".`,
                        errorLogger: errorLogger
                    });
                    if (ball.toSpot !== undefined) {
                        if (table === undefined) {
                            errorLogger.logError({
                                severity: "CriticalError",
                                message: `Juggler "${jugglerName}" has no table, so can't use the toSpot attribute.`
                            });
                        } else {
                            // All spot names refer to existing spot names.
                            handleIfStringUnknown({
                                name: ball.toSpot,
                                namesList: new Set(table.spots.map((spot) => spot.name)),
                                errorMessage: `Unknown spot name "${ball.toSpot}" in juggler's "${jugglerName}" juggling phrases.`,
                                errorLogger: errorLogger
                            });
                        }
                    }
                } else {
                    // Held balls refer to existing ball IDs
                    handleIfStringUnknown({
                        name: ball.id,
                        namesList: ballIDs,
                        errorMessage: `Unknown ball ID "${ball.id}" in juggling phrases of juggler ${jugglerName}.`,
                        errorLogger: errorLogger
                    });

                    // Uniqueness of ball IDs.
                    handleIfStringDuplicate({
                        name: ball.id,
                        namesList: foundBallIDs,
                        errorMessage: `Duplicate ball ID: "${ball.id}".`,
                        errorLogger: errorLogger
                    });
                    foundBallIDs.add(ball.id);
                }
            }
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
            text += `\nDo you mean "${matchingWords[0]}" ?`;
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
