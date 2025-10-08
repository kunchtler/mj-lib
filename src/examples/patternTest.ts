import { JSONJugglingScore } from "../inference/PerformanceDescription";

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

// Tests left :
// - Synch
// - Measure and beat
// - Multiplex (with hand specifier and without)
// - Sync pattern + exclamation mark
// - Tempo changes
// - Table changes (new hands, with unknown spot, tospot, fromspot, with id, with name)
// - Two jugglers (no crosstoss, crosstoss, crosstoss to specific hand, offtempo one another)
