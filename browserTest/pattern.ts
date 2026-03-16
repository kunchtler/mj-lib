import { PerformanceDescriptionHelper } from "../src/inference/PerformanceDescriptionHelpers";

export const pattern: PerformanceDescriptionHelper = {
    version: "0.1",
    ballTemplates: [
        { name: "Do", color: "red", soundOnCatch: { name: "Do" } },
        { name: "Re", color: "orange", soundOnCatch: { name: "Re" } },
        { name: "Mi", color: "yellow", soundOnCatch: { name: "Mi" } },
        { name: "Fa", color: "green", soundOnCatch: { name: "Fa" } },
        { name: "Sol", color: "deepskyblue", soundOnCatch: { name: "Sol" } },
        { name: "La", color: "darkblue", soundOnCatch: { name: "La" } },
        { name: "Si", color: "white", soundOnCatch: { name: "Si" } },
        { name: "Do'", color: "red", soundOnCatch: { name: "Do'" } }
    ],
    jugglers: [
        {
            name: "Kylian",
            // defaultTableID: "KylianT",
            position: [-1, 0, 0],
            ballsHeldAtStart: [[], []],
            // ballsHeldAtStart: [[{ name: "Do" }], [{ name: "Re" }, { name: "Mi" }, { name: "Fa" }]],
            defaultTableID: "KylianT",
            jugglingPhrases: [
                {
                    startTime: { type: "byGlobalBeat", beat: 0 },
                    setupHands: { haveBalls: [[{ type: "byName", name: "Do" }], []] },
                    pattern: "L1"
                    // pattern: "R35003 35003 35003 42334 05003 35003 35003 42334 0300"
                }
            ]
        }
    ],
    tables: [
        {
            id: "KylianT",
            height: 0.7,
            depth: 0.5,
            width: 1.5,
            spots: [
                { acceptedBallName: "Do", ballAtStart: true, position: [0, 0.7, -0.5] },
                { acceptedBallName: "Re", ballAtStart: true, position: [0, 0.7, -0.25] },
                { acceptedBallName: "Mi", ballAtStart: true, position: [0, 0.7, 0] },
                { acceptedBallName: "Fa", ballAtStart: true, position: [0, 0.7, 0.25] },
                { acceptedBallName: "Sol", ballAtStart: true, position: [0, 0.7, 0.5] }
            ]
        }
    ],
    globalBeat: { type: "constant", beatsPerMinute: 180 }
};
