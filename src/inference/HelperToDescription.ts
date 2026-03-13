import Fraction from "fraction.js";
import { TimedErrorLogger } from "../utils";
import { createJugglingScoreFromHelper } from "./HelperToJugglingScore";
import {
    JugglingScore,
    PerformanceDescription,
    PerformanceLayout,
    PerformanceMeshesDescription
} from "./PerformanceDescription";
import { PerformanceDescriptionHelper } from "./PerformanceDescriptionHelpers";
import { createLayoutAndMeshesDescriptionFromHelper } from "./HelperToLayoutAndMeshes";
import { deepFuse } from "../utils/fuse";

export function descriptionFromHelper(
    helper: PerformanceDescriptionHelper,
    errorLogger: TimedErrorLogger<Fraction>
): PerformanceDescription {
    const { score, ballGeneratedIDs, ballUserIDs, tableSpotNames } = createJugglingScoreFromHelper(
        helper,
        errorLogger
    );
    const { layout, meshesDescription } = createLayoutAndMeshesDescriptionFromHelper(
        helper,
        new Map<string, string>([...ballGeneratedIDs, ...ballUserIDs]),
        tableSpotNames
    );
    return constructPerformanceFromParts(score, layout, meshesDescription, errorLogger);
}

export function constructPerformanceFromParts(
    score: JugglingScore,
    layout: PerformanceLayout,
    meshesDescription: PerformanceMeshesDescription,
    errorLogger: TimedErrorLogger<Fraction>
): PerformanceDescription {
    const description: PerformanceDescription = {
        balls: [],
        jugglers: [],
        tables: [],
        globalBeat: score.globalBeat
    };
    for (const ball1 of score.balls) {
        const ball2 = layout.balls.find((ball) => ball.id === ball1.id);
        const ball3 = meshesDescription.balls.find((ball) => ball.id === ball1.id);
        if (ball2 === undefined || ball3 === undefined) {
            errorLogger.logError({
                severity: "CriticalError",
                message: "Error in performance reconstruction. This is a bug."
            });
            continue;
        }
        description.balls.push(deepFuse(deepFuse(ball1, ball2), ball3));
    }
    for (const juggler1 of score.jugglers) {
        const juggler2 = layout.jugglers.find((juggler) => juggler.name === juggler1.name);
        const juggler3 = meshesDescription.jugglers.find(
            (juggler) => juggler.name === juggler1.name
        );
        if (juggler2 === undefined || juggler3 === undefined) {
            errorLogger.logError({
                severity: "CriticalError",
                message: "Error in performance reconstruction. This is a bug."
            });
            continue;
        }
        description.jugglers.push(deepFuse(deepFuse(juggler1, juggler2), juggler3));
    }
    for (const table1 of score.tables) {
        const table2 = layout.tables.find((table) => table.id === table1.id);
        const table3 = meshesDescription.tables.find((table) => table.id === table1.id);
        if (table2 === undefined || table3 === undefined) {
            errorLogger.logError({
                severity: "CriticalError",
                message: "Error in performance reconstruction. This is a bug."
            });
            continue;
        }
        description.tables.push(deepFuse(deepFuse(table1, table2), table3));
    }
    return description;
}