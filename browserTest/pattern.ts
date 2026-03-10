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
            ballsHeldAtStart: [[{ name: "Do" }], [{ name: "Re" }, { name: "Mi" }]],
            jugglingPhrases: [
                {
                    startTime: { type: "byGlobalBeat", beat: 0 },
                    pattern: "L3"
                    // pattern: "R35003 35003 35003 42334 05003 35003 35003 42334 0300"
                }
            ]
        }
    ],
    globalBeat: { type: "constant", beatsPerMinute: 180 }
};
