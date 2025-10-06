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
            jugglingPhrases: [{ startTime: 0, pattern: "L33", withTempo: 1 }]
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
            jugglingPhrases: [{ startTime: 0, pattern: "L33", withTempo: 1 }]
        }
    ]
};