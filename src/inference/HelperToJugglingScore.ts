/// Conversion functions

import Fraction from "fraction.js";
import { TimedErrorLogger, ElementOf } from "../utils";
import { JugglingScore } from "./PerformanceDescription";
import { JugglingScoreHelper } from "./PerformanceDescriptionHelpers";
import { handleIfStringDuplicate, handleIfStringUnknown } from "./DescriptionToModel";

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
            beatReference: { beat: 0, barBeat: { bar: 0, beat: 0 }, timeInSeconds: 0 },
            // Count the seconds.
            changes: [{ startTime: { type: "byBeat", beat: 0 }, beatsPerMinute: 60 }]
        };
    } else if (score.globalBeat.type === "constant") {
        newGlobalBeat = {
            beatReference: {
                beat: score.globalBeat.beatReference?.beat ?? 0,
                barBeat: score.globalBeat.beatReference?.barBeat ?? { bar: 0, beat: 0 },
                timeInSeconds: score.globalBeat.beatReference?.timeInSeconds ?? 0
            },
            // Count the beats.
            changes: [
                {
                    startTime: { type: "byBeat", beat: 0 },
                    beatsInBar: score.globalBeat.beatsInBar,
                    beatsPerMinute: score.globalBeat.beatsPerMinute ?? 60
                }
            ]
        };
    } else {
        newGlobalBeat = {
            beatReference: {
                beat: score.globalBeat.beatReference?.beat ?? 0,
                barBeat: score.globalBeat.beatReference?.barBeat ?? { bar: 0, beat: 0 },
                timeInSeconds: score.globalBeat.beatReference?.timeInSeconds ?? 0
            },
            changes: score.globalBeat.changes ?? []
        };
    }

    const newScore: JugglingScore = {
        balls: [],
        jugglers: [],
        tables: [],
        globalBeat: newGlobalBeat
    };
    const ballUserIDs = new Map<string, string>();
    const ballGeneratedIDs = new Map<string, string>();
    const ballTemplateNames = new Set<string>();

    // Gather template names and check is they are unique.
    for (const { name } of score.ballTemplates) {
        handleIfStringDuplicate({
            name: name,
            namesList: ballTemplateNames,
            errorMessage: `Duplicate ball template name: "${name}".`,
            errorLogger: errorLogger
        });
        ballTemplateNames.add(name);
    }

    // 1. Gather all UserBallIDs.
    for (const juggler of score.jugglers) {
        for (const hand of juggler.ballsHeldAtStart ?? []) {
            for (const ball of hand) {
                if (ball?.id !== undefined) {
                    ballUserIDs.set(ball.id, ball.name);
                }
            }
        }
    }
    for (const table of score.tables ?? []) {
        for (const spot of table.spots) {
            if (typeof spot.ball === "object" && spot.ball.id !== undefined) {
                ballUserIDs.set(spot.ball.id, spot.ball.name);
            }
        }
        for (const ball of table.unknownSpot?.balls ?? []) {
            if (ball.id !== undefined) {
                ballUserIDs.set(ball.id, ball.name);
            }
        }
    }

    // 2. Iterate over jugglers to generate missing IDs
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
            defaultTableID: juggler.defaultTableID
        };

        // Add ball IDs if held in hand.
        if (juggler.ballsHeldAtStart !== undefined) {
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                for (const ball of juggler.ballsHeldAtStart[handIdx]) {
                    let ballID: string | undefined;
                    if (ball === undefined) {
                        ballID = undefined;
                    } else if (ball.id !== undefined) {
                        ballID = ball.id;
                    } else {
                        ballID = createBallID(
                            ball.name,
                            juggler.name,
                            ballTemplateNames,
                            ballUserIDs,
                            ballGeneratedIDs
                        );
                        ballGeneratedIDs.set(ballID, ball.name);
                    }
                    newJuggler.ballsHeldAtStart[handIdx].push(ballID);
                }
            }
        }

        // Add to jugglers list.
        newScore.jugglers.push(newJuggler);
    }

    // 3. Iterate over tables to generate missing IDs.
    for (const table of score.tables ?? []) {
        const newTable: ElementOf<JugglingScore["tables"]> = {
            id: table.id,
            spots: [],
            unknownSpot: { ballIDs: [] }
        };
        for (const { ball, acceptedBallName, name } of table.spots) {
            // Handle the ball on the spot (can be undefined, or boolean, or {name: string; id?: string})
            let ballTemplate: string;
            let ballID: string | undefined = undefined;
            if (ball === undefined) {
                continue;
            } else if (typeof ball === "boolean") {
                if (ball) {
                    ballTemplate = acceptedBallName;
                } else {
                    continue;
                }
            } else {
                ballTemplate = ball.name;
                if (ball.id !== undefined) {
                    ballID = ball.id;
                }
            }
            // If the ball had no ID, create one and register it.
            if (ballID === undefined) {
                ballID = createBallID(
                    ballTemplate,
                    table.id,
                    ballTemplateNames,
                    ballUserIDs,
                    ballGeneratedIDs
                );
                ballGeneratedIDs.set(ballID, ballTemplate);
            }
            newTable.spots.push({ name, acceptedBallName, ballID });
        }
        for (const ball of table.unknownSpot?.balls ?? []) {
            let ballID: string;
            if (ball.id === undefined) {
                ballID = createBallID(
                    ball.name,
                    table.id,
                    ballTemplateNames,
                    ballUserIDs,
                    ballGeneratedIDs
                );
                ballGeneratedIDs.set(ballID, ball.name);
            } else {
                ballID = ball.id;
            }
            newTable.unknownSpot.ballIDs.push(ballID);
        }
        newScore.tables.push(newTable);
    }

    // 4. Add all balls informations.
    for (const ballMap of [ballUserIDs, ballGeneratedIDs]) {
        for (const [ballID, ballTemplate] of ballMap) {
            const template = score.ballTemplates.find((ball) => ball.name === ballTemplate);
            if (template === undefined) {
                handleIfStringUnknown({
                    name: ballTemplate,
                    namesList: ballTemplateNames,
                    errorLogger: errorLogger,
                    errorMessage: `Can't find ball name ${ballTemplate}.`
                });
                continue;
            }
            newScore.balls.push({
                id: ballID,
                templateName: ballTemplate,
                soundOnCatch: template.soundOnCatch,
                soundOnToss: template.soundOnToss
            });
        }
    }

    return { score: newScore, ballUserIDs: ballUserIDs, ballGeneratedIDs: ballGeneratedIDs };
}

// The generated IDs are of the form : name?juggler?number. Ex : Do?Vincent?0
function createBallID(
    ballTemplate: string,
    holderName: string,
    ballTemplateNames: Set<string>,
    ballUserIDs: Map<string, string>,
    ballGeneratedIDs: Map<string, string>
): string {
    const ballIDRoot = `${ballTemplate}?${holderName}?`;
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


        // type HelperBallsOnTable = NonNullable<
//     NonNullable<ElementOf<JugglingScoreHelper["jugglers"]>["table"]>["ballsOnTableAtStart"]
// >;

// In the helper, a ball having no spot means we didn't to specify where it should go.
// In the true score, a ball having no spot means it goes on the "unknown" spot.
// So while converting from helper to true score, we need to compute each ball's spot.
// function assignUndefinedSpotsToFreeTableSpots(
//     jugglerName: string,
//     ballsOnTableAtStart: HelperBallsOnTable,
//     tableSpots: {
//         name: string;
//         acceptedBallName: string;
//     }[],
//     ballTemplateNames: Set<string>,
//     errorLogger: TimedErrorLogger<Fraction>
// ): HelperBallsOnTable {
//     const newBallsOnTable: HelperBallsOnTable = [];

//     // Make a Map of all free spots.
//     const freeSpotsByAcceptedTemplateName = new Map<string, Set<string>>();
//     for (const name of ballTemplateNames) {
//         freeSpotsByAcceptedTemplateName.set(name, new Set());
//     }
//     for (const spot of tableSpots) {
//         freeSpotsByAcceptedTemplateName.get(spot.acceptedBallName)!.add(spot.name);
//     }
//     // Then remove the balls that are in designated spots.
//     for (const ball of ballsOnTableAtStart) {
//         if (ball.spot !== undefined) {
//             freeSpotsByAcceptedTemplateName.get(ball.name)?.delete(ball.spot);
//         }
//     }

//     for (const ball of ballsOnTableAtStart) {
//         // Figure out the ball spot.
//         let spotName: string | undefined;
//         if (ball.spot !== undefined) {
//             spotName = ball.spot;
//         } else {
//             // Find a free spot.
//             const spots = freeSpotsByAcceptedTemplateName.get(ball.name)!;
//             spotName = getFirstInsertedKey(spots);
//             if (spotName === undefined) {
//                 errorLogger.logError({
//                     severity: "Warn",
//                     message: `Ball ${stringifyBall(ball)} of juggler ${jugglerName} has no available spot to be put on the table.\nContinue by putting it on a default position.`
//                 });
//             } else {
//                 spots.delete(spotName);
//             }
//         }

//         // Add the ball to the table state.
//         newBallsOnTable.push({ name: ball.name, id: ball.id, spot: spotName });
//     }
//     return newBallsOnTable;
// }

// The generated ID is of the form : "table"?juggler, as for now, tables belong
// to at most one juggler.
// function createTableID(jugglerName: string): string {
//     return `table?${jugglerName}`;
// }

