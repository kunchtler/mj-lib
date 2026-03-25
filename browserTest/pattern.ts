import { PerformanceDescriptionHelper } from "../src/inference/PerformanceDescriptionHelpers";

// TODO : What to do about the "version" field ?

const ballTemplates: PerformanceDescriptionHelper["ballTemplates"] = [
    { name: "Do", color: "red", soundOnCatch: { name: "Do" } },
    { name: "Re", color: "orange", soundOnCatch: { name: "Re" } },
    { name: "Mi", color: "yellow", soundOnCatch: { name: "Mi" } },
    { name: "Fa", color: "green", soundOnCatch: { name: "Fa" } },
    { name: "Sol", color: "deepskyblue", soundOnCatch: { name: "Sol" } },
    { name: "La", color: "darkblue", soundOnCatch: { name: "La" } },
    { name: "Si", color: "white", soundOnCatch: { name: "Si" } },
    { name: "Do'", color: "red", soundOnCatch: { name: "Do'" } }
];

export const pattern1: PerformanceDescriptionHelper = {
    version: "0.1",
    ballTemplates,
    jugglers: [
        {
            name: "Kylian",
            position: [-1, 0, 0],
            ballsHeldAtStart: [
                [
                    { name: "Re", id: "Re?0" },
                    { name: "Do", id: "Do?0" }
                ],
                [{ name: "Mi", id: "Mi?0" }]
            ],
            jugglingPhrases: [
                {
                    startTime: { type: "byGlobalBeat", beat: 0 },
                    pattern: "L1"
                }
            ]
        }
    ],
    // tables: [
    //     {
    //         id: "table",
    //         height: 0.7,
    //         depth: 0.5,
    //         width: 1.5,
    //         spots: [{ acceptedBallName: "Do", ballAtStart: "Do?1", position: [0, 0.7, -0.5] }]
    //     }
    // ],
    globalBeat: { type: "constant", beatsPerMinute: 180 }
};
export const pattern2: PerformanceDescriptionHelper = {
    version: "0.1",
    ballTemplates,
    jugglers: [
        {
            name: "Kylian",
            position: [-1, 0, 0],
            ballsHeldAtStart: [
                [
                    { name: "Re", id: "Re?0" },
                    { name: "Do", id: "Do?0" }
                ],
                [{ name: "Mi", id: "Mi?0" }]
            ],
            jugglingPhrases: [
                {
                    startTime: { type: "byGlobalBeat", beat: 0 },
                    setup: {
                        hands: [
                            [{ ball: undefined }, { ball: { type: "ID", id: "Mi?0" } }],
                            [{ ball: { type: "template", template: "Do" } }]
                        ]
                    },
                    pattern: "L35003 35003 35003 42334 05003 35003 35003 42334 0300"
                }
            ]
        }
    ],
    globalBeat: { type: "constant", beatsPerMinute: 180 }
};

export const pattern3: PerformanceDescriptionHelper = {
    version: "0.1",
    ballTemplates,
    jugglers: [
        {
            name: "Kylian",
            position: [-1, 0, 0],
            ballsHeldAtStart: [[], []],
            // ballsHeldAtStart: [[{ name: "Do" }], [{ name: "Re" }, { name: "Mi" }, { name: "Fa" }]],
            defaultTableID: "table",
            jugglingPhrases: [
                {
                    startTime: { type: "byGlobalBeat", beat: 0 },
                    setup: {
                        hands: [
                            [{ ball: undefined }, { ball: { type: "ID", id: "Mi?0" } }],
                            [{ ball: { type: "template", template: "Do" } }]
                        ]
                    },
                    pattern: "L35003 35003 35003 42334 05003 35003 35003 42334 0300"
                }
            ]
        }
    ],
    tables: [
        {
            id: "table",
            height: 0.7,
            depth: 0.7,
            width: 1.5,
            spots: [
                { acceptedBallName: "Do", ballAtStart: "Do?0", position: [-0.15, 0.7, -0.5] },
                { acceptedBallName: "Do", ballAtStart: "Do?1", position: [0.15, 0.7, -0.5] },
                { acceptedBallName: "Re", ballAtStart: "Re?0", position: [-0.15, 0.7, -0.25] },
                { acceptedBallName: "Re", ballAtStart: "Re?1", position: [0.15, 0.7, -0.25] },
                { acceptedBallName: "Mi", ballAtStart: "Mi?0", position: [-0.15, 0.7, 0] },
                { acceptedBallName: "Mi", ballAtStart: "Mi?1", position: [0.15, 0.7, 0] },
                { acceptedBallName: "Fa", ballAtStart: "Fa?0", position: [-0.15, 0.7, 0.25] },
                { acceptedBallName: "Fa", ballAtStart: "Fa?1", position: [0.15, 0.7, 0.25] },
                { acceptedBallName: "Sol", ballAtStart: "Sol?0", position: [-0.15, 0.7, 0.5] },
                { acceptedBallName: "Sol", ballAtStart: "Sol?1", position: [0.15, 0.7, 0.5] }
            ]
        }
    ],
    globalBeat: { type: "constant", beatsPerMinute: 180 }
};