import { JSONJugglingScore } from "../inference/PerformanceDescription";
import { JSONJugglingScoreToModel } from "../model";
import { FracTimedErrorLogger, TimedErrorLogger } from "../utils";

// Simple test with two phrases.
// Test L / R modifier.
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

// More complicated test.
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
            ballsHeldAtStart: [[{ name: "Re" }], [{ name: "Mi" }, { name: "Do" }]],
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

// Test ID
export const score3: JSONJugglingScore = {
    ballTemplates: [
        {
            name: "Do"
        },
        {
            name: "Re"
        }
    ],
    scoreConverter: [{ bar: 0, tempo: { bpm: 180, note: 1 }, timeSignature: "4/4" }],
    jugglers: [
        {
            name: "Vincent",
            ballsHeldAtStart: [
                [
                    { name: "Re", id: "Re_a" },
                    { name: "Do", id: "Do_a" },
                    { name: "Do", id: "Do_b" },
                    { name: "Re", id: "Re_b" }
                ],
                []
            ],
            jugglingPhrases: [
                {
                    startTime: 0,
                    pattern: "L Do_a1 0 Re1",
                    withTempo: 1
                }
            ]
        }
    ]
};

// Empty jugglers
export const score4: JSONJugglingScore = {
    ballTemplates: [
        {
            name: "Do"
        },
        {
            name: "Re"
        }
    ],
    tableTemplates: [],
    jugglers: [
        {
            name: "Vincent",
            ballsHeldAtStart: [[{ name: "Re", id: "Re_b" }], [{ name: "Do", id: "Do_c" }]],
            jugglingPhrases: [{ startTime: 0 }]
        },
        {
            name: "Nicolas"
        }
    ]
};

// Test Table
//TODO : Make spot name optional ???
export const score5: JSONJugglingScore = {
    ballTemplates: [
        {
            name: "Do"
        },
        {
            name: "Re"
        }
    ],
    tableTemplates: [
        {
            name: "Piano",
            spots: [
                { name: "DoSpot1", acceptedBallName: "Do" },
                { name: "DoSpot2", acceptedBallName: "Do" },
                { name: "DoSpot3", acceptedBallName: "Do" },
                { name: "ReSpot1", acceptedBallName: "Re" }
            ]
        }
    ],
    scoreConverter: [{ bar: 0, tempo: { bpm: 180, note: 1 }, timeSignature: "4/4" }],
    jugglers: [
        {
            name: "Vincent",
            ballsHeldAtStart: [
                [
                    { name: "Re", id: "Re_b" },
                    { name: "Re", id: "Re_c" }
                ],
                [
                    { name: "Do", id: "Do_c" },
                    { name: "Do", id: "Do_d" }
                ]
            ],
            table: {
                template: "Piano",
                ballsOnTableAtStart: [
                    { name: "Do", id: "Do_a", spot: "DoSpot1" },
                    { name: "Do", id: "Do_b", spot: undefined },
                    { name: "Re", id: "Re_a", spot: "ReSpot1" }
                ]
            },
            jugglingPhrases: [
                {
                    startTime: 0,
                    setupHands: { have: [[], []] }
                },
                {
                    startTime: 1,
                    setupHands: { have: [[{ name: "Do" }], [{ name: "Re" }]] }
                },
                {
                    startTime: 2,
                    setupHands: {
                        have: [
                            [{ id: "Do_b" }, { id: "Do_a" }],
                            [{ id: "Re_a" }, { id: "Re_b" }]
                        ]
                    }
                },
                {
                    startTime: 3,
                    setupHands: {
                        place: [
                            { id: "Do_a", toSpot: "DoSpot1" },
                            { id: "Do_b", toSpot: "DoSpot2" },
                            { name: "Re" },
                            { name: "Re" }
                        ]
                    }
                },
                {
                    startTime: 4,
                    setupHands: {
                        have: [[{ name: "Do", fromSpot: "DoSpot1" }], []]
                    }
                }
            ]
        }
    ]
};

// const rawPattern = "L";
// const rawPattern = "R3 (1x {12} e)^3 (4,[82x]) (1, 0)! L5x 7";
// const rawPattern = "{M1B1/4}303{Do B5}{B6/1}{+B2 x}";
// const rawPattern = "LBo3"; //Should Fail

// Musical Siteswap feature (TODO : Document)
export const score6: JSONJugglingScore = {
    ballTemplates: [{ name: "Do" }, { name: "Re" }, { name: "Mi" }],
    scoreConverter: [{ bar: 0, tempo: { bpm: 180, note: 1 }, timeSignature: "4/4" }],
    jugglers: [
        {
            name: "Vincent",
            ballsHeldAtStart: [
                [
                    { name: "Do", id: "Do_a" },
                    { name: "Re", id: "Re_a" }
                ],
                [
                    { name: "Mi", id: "Mi_a" },
                    { name: "Do", id: "Do_b" }
                ]
            ],
            jugglingPhrases: [
                {
                    startTime: 0,
                    pattern: "L[Do1 Re2x]3"
                },
                {
                    startTime: 5,
                    pattern: "{10} e"
                },
                {
                    startTime: 25,
                    setupHands: {
                        have: [
                            [{ name: "Do" }, { name: "Do" }],
                            [{ name: "Re" }, { name: "Mi" }]
                        ]
                    },
                    pattern: "4(51)^3"
                },
                {
                    startTime: 40,
                    setupHands: {
                        have: [
                            [{ name: "Do" }, { name: "Do" }],
                            [{ name: "Re" }, { name: "Mi" }]
                        ]
                    },
                    pattern: "(2, 2) (4, [24x]) (1, 0)! 1"
                }
            ]
        }
    ]
};

// Musical timing features
export const score7: JSONJugglingScore = {
    ballTemplates: [{ name: "Do" }, { name: "Re" }, { name: "Mi" }],
    scoreConverter: [
        { bar: 0, tempo: { bpm: 180, note: 1 }, timeSignature: "4/1" },
        { bar: 3 },
        { bar: 6, tempo: { bpm: 200, note: 2 } }
    ],
    jugglers: [
        {
            name: "Vincent",
            ballsHeldAtStart: [
                [
                    { name: "Do", id: "Do_a" },
                    { name: "Re", id: "Re_a" }
                ],
                [
                    { name: "Mi", id: "Mi_a" },
                    { name: "Do", id: "Do_b" }
                ]
            ],
            jugglingPhrases: [
                {
                    startTime: 0,
                    pattern: "{M0B1}303{Do B5}{+B2 x}"
                }
            ]
        }
    ]
};

// Tempo changes
export const score8: JSONJugglingScore = {
    ballTemplates: [{ name: "Do" }, { name: "Re" }, { name: "Mi" }],
    scoreConverter: [{ bar: 0, tempo: { bpm: 180, note: 1 }, timeSignature: "1/1" }],
    jugglers: [
        {
            name: "Vincent",
            ballsHeldAtStart: [
                [
                    { name: "Do", id: "Do_a" },
                    { name: "Re", id: "Re_a" }
                ],
                [{ name: "Mi", id: "Mi_a" }]
            ],
            jugglingPhrases: [
                {
                    startTime: 0,
                    withTempo: 1,
                    pattern: "L333"
                },
                {
                    startTime: 3,
                    withTempo: 1 / 2,
                    pattern: "333"
                },
                {
                    startTime: 4.5,
                    withTempo: 2,
                    pattern: "333"
                }
            ]
        }
    ]
};

// Multiple jugglers crossed tosses.
export const score9: JSONJugglingScore = {
    ballTemplates: [{ name: "Do" }, { name: "Re" }, { name: "Mi" }],
    jugglers: [
        {
            name: "Vincent",
            ballsHeldAtStart: [
                [
                    { name: "Re", id: "Re_a" },
                    { name: "Do", id: "Do_a" }
                ],
                [{ name: "Mi", id: "Mi_a" }]
            ],
            jugglingPhrases: [
                {
                    startTime: 0,
                    pattern: "L{3 Nicolas}{3 Nicolas}^2"
                }
            ]
        },
        {
            name: "Nicolas",
            ballsHeldAtStart: [
                [{ name: "Mi", id: "Mi_b" }],
                [
                    { name: "Re", id: "Re_b" },
                    { name: "Do", id: "Do_b" }
                ]
            ],
            jugglingPhrases: [
                {
                    startTime: 0,
                    pattern: "R{3 Vincent}{3 Vincent}^2"
                }
            ]
        }
    ]
};

// Multiple jugglers (passing and destination hand modifiers)
export const score10: JSONJugglingScore = {
    ballTemplates: [{ name: "Do" }, { name: "Re" }, { name: "Mi" }],
    jugglers: [
        {
            name: "Vincent",
            ballsHeldAtStart: [[{ name: "Mi", id: "Ball_V" }], []],
            jugglingPhrases: [
                {
                    startTime: 0,
                    pattern: "L{1 Nicolas L}"
                }
            ]
        },
        {
            name: "Nicolas",
            ballsHeldAtStart: [[{ name: "Do", id: "Ball_N" }], []],
            jugglingPhrases: [
                {
                    startTime: 0,
                    pattern: "L{3 Vincent}L{1 Vincent x}"
                }
            ]
        }
    ]
};

//Multiple jugglers (tempo changes)
export const score11: JSONJugglingScore = {
    ballTemplates: [{ name: "Do" }, { name: "Re" }, { name: "Mi" }],
    jugglers: [
        {
            name: "Vincent",
            ballsHeldAtStart: [[{ name: "Do", id: "Do_V" }], [{ name: "Re", id: "Re_V" }]],
            jugglingPhrases: [
                {
                    startTime: 0,
                    withTempo: 1,
                    pattern: "L3{3 Nicolas}"
                }
            ]
        },
        {
            name: "Nicolas",
            ballsHeldAtStart: [[{ name: "Do", id: "Do_N" }], [{ name: "Re", id: "Re_N" }]],
            jugglingPhrases: [
                {
                    startTime: 0,
                    withTempo: 2,
                    pattern: "L33{1 Vincent}"
                }
            ]
        }
    ]
};

const errorLogger = new FracTimedErrorLogger();
JSONJugglingScoreToModel(score2, errorLogger);

//TODO : Passing notation IF there are only 2 jugglers ?
//TODO : Unintuitive ordering of balls when specifying ? (would we want for the first we write to be the first tossed) ?