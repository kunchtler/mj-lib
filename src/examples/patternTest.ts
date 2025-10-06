import { JSONJugglingScore } from "../inference/PerformanceDescription";

export const score: JSONJugglingScore = {
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
    tableTemplates: [
        {
            name: "Piano",
            spots: [
                {
                    name: "DoSpot1",
                    acceptedBallName: "Do"
                },
                {
                    name: "DoSpot2",
                    acceptedBallName: "Do"
                },
                {
                    name: "ReSpot",
                    acceptedBallName: "Re"
                },
                {
                    name: "MiSpot",
                    acceptedBallName: "Mi"
                }
            ]
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
