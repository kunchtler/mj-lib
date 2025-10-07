import { JSONJugglingScore } from "../inference/PerformanceDescription";

export const score1: JSONJugglingScore = {
    ballTemplates: [
        {
            name: "Do"
        },
        {
            name: "Re"
        },
        {
            name: "Mi"
        }
    ],
    scoreConverter: [{ bar: 0, tempo: { bpm: 180, note: 1 }, timeSignature: "4/4" }],
    jugglers: [
        {
            name: "Vincent",
            ballsHeldAtStart: [[{ name: "Mi" }, { name: "Do" }], [{ name: "Re" }]],
            jugglingPhrases: [
                { startTime: 0, pattern: "R3", withTempo: 1 },
                { startTime: 2, pattern: "L3L3" }
            ]
        }
    ]
};

export const score2: JSONJugglingScore = {
    ballTemplates: [
        {
            name: "Do"
        },
        {
            name: "Re"
        },
        {
            name: "Mi"
        }
    ],
    scoreConverter: [{ bar: 0, tempo: { bpm: 180, note: 1 }, timeSignature: "4/4" }],
    jugglers: [
        {
            name: "Vincent",
            ballsHeldAtStart: [[{ name: "Mi" }, { name: "Do" }], [{ name: "Re" }]],
            jugglingPhrases: [
                {
                    startTime: 0,
                    pattern: "R35003 35003 35003 42334 05003 35003 35003 42334 0300",
                    withTempo: 1
                }
            ]
        }
    ]
};

export const score3: JSONJugglingScore = {
    ballTemplates: [
        {
            name: "Do"
        },
        {
            name: "Re"
        },
        {
            name: "Mi"
        }
    ],
    scoreConverter: [{ bar: 0, tempo: { bpm: 180, note: 1 }, timeSignature: "4/4" }],
    jugglers: [
        {
            name: "Vincent",
            ballsHeldAtStart: [[{ name: "Mi" }, { name: "Do" }], [{ name: "Re" }]],
            jugglingPhrases: [
                {
                    startTime: 0,
                    pattern: "R35003 35003 35003 42334 05003 35003 35003 42334 0300",
                    withTempo: 1
                }
            ]
        }
    ]
};