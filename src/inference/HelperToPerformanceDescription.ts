/// Conversion functions

import Fraction from "fraction.js";
import { TimedErrorLogger, ElementOf, stringifyBall } from "../utils";
import { getFirstInsertedKey } from "../utils/Operations";
import { JugglingScore, BallDescription } from "./PerformanceDescription";
import { JugglingScoreHelper } from "./PerformanceDescriptionHelpers";
import { handleIfStringUnknown } from "./DescriptionToScheduler";

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
                    beatsPerMinute: score.globalBeat.beatsPerMinute ?? 60
                }
            ]
        };
    } else {
        newGlobalBeat = {
            beatOffsetInSeconds: score.globalBeat.beatOffsetInSeconds ?? 0,
            changes: score.globalBeat.changes ?? []
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

// The generated ID is of the form : "table"?juggler, as for now, tables belong
// to at most one juggler.
function createTableID(jugglerName: string): string {
    return `table?${jugglerName}`;
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
