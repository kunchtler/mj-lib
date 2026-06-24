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

export const patternACDLL: PerformanceDescriptionHelper = {
    version: "0.1",
    ballTemplates,
    jugglers: [
        {
            name: "Laurent",
            ballsHeldAtStart: [[{ name: "Re" }], [{ name: "Mi" }, { name: "Do" }]],
            handBuilder: { visible: false },
            jugglingPhrases: [
                {
                    startTime: { type: "byGlobalBeat", beat: 0 },
                    pattern: "R5 0 0 5 5 1 1 6 3 5 0 4 0 4 0 1 0"
                }
            ]
        }
    ],
    globalBeat: { type: "constant", beatsPerMinute: 200 }
};

export const patternPermuLoop: PerformanceDescriptionHelper = {
    version: "0.1",
    ballTemplates,
    jugglers: [
        {
            name: "Vincent", // TODO : Make name optional
            ballsHeldAtStart: [
                [{ name: "Si" }, { name: "Mi" }],
                [{ name: "Sol" }, { name: "Do" }]
            ],
            handBuilder: { visible: false },
            jugglingPhrases: [
                {
                    startTime: { type: "byGlobalBeat", beat: 0 },
                    pattern: "R4444 0000 0000 (5344 0000 0000 4534 0000 0000)^3"
                }
            ]
        }
    ],
    globalBeat: { type: "constant", beatsPerMinute: 200 }
};

export const patternRhythm: PerformanceDescriptionHelper = {
    version: "0.1",
    ballTemplates,
    jugglers: [
        {
            name: "Laurent",
            ballsHeldAtStart: [[{ name: "Mi" }, { name: "Do" }], [{ name: "Re" }]],
            jugglingPhrases: [
                {
                    startTime: { type: "byGlobalBeat", beat: -3 },
                    localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 1 },
                    // pattern: "(([35], 1)!R0413300)"
                    pattern: "L333333"
                },
                {
                    startTime: { type: "byGlobalBeat", beat: 3 },
                    localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 2 }
                    // pattern: "(([35], 1)!R0413300)"
                }
                // {
                //     startTime: { type: "byGlobalBeat", beat: 3 },
                //     localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 2 },
                //     pattern: "333"
                // }
                // {
                //     startTime: { type: "byLocalBeat", beat: 4 },
                //     localTempoMultiplier: 1
                // }
            ]
        }
    ],
    globalBeat: { type: "constant", beatsPerMinute: 200 }
};

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
                    pattern: "L33333"
                }
            ]
        }
    ],
    globalBeat: { type: "constant", beatsPerMinute: 180 }
};
export const pattern2: PerformanceDescriptionHelper = {
    version: "0.1",
    ballTemplates,
    jugglers: [
        {
            name: "Kylian",
            position: [-1, 0, 0],
            handBuilder: {
                visible: false,
                spotsBuild: { catchTossDistance: 0.4, distanceToMirroringLine: 0.3 }
            },
            body: { width: 0.5 },
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
                    pattern: "00"
                },
                {
                    startTime: { type: "byGlobalBeat", beat: 4 },
                    setup: {
                        hands: [
                            [
                                { from: { type: "table", spot: "Sol2" } },
                                { ball: { type: "template", template: "Mi" } }
                            ],
                            []
                        ]
                    },
                    pattern: "00"
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
                {
                    acceptedBallName: "Sol",
                    ballAtStart: "Sol?1",
                    position: [0.15, 0.7, 0.5],
                    name: "Sol2"
                }
            ]
        }
    ],
    globalBeat: { type: "constant", beatsPerMinute: 180 }
};

export const patternLune: PerformanceDescriptionHelper = {
    version: "0.1",
    ballTemplates,
    jugglers: [
        {
            name: "Florent",
            handBuilder: { visible: false },
            position: [-1, 0, 0],
            ballsHeldAtStart: [[{ name: "Mi" }], [{ name: "Re" }, { name: "Do" }]],
            jugglingPhrases: [
                {
                    startTime: { type: "byGlobalBeat", beat: 0 },
                    pattern: "R1 (1, 3x)! (3, 1)! 0 3 0 L3 0 R2x 2x 3x R1"
                }
            ]
        }
    ],
    globalBeat: { type: "constant", beatsPerMinute: 100 }
};

export const patternConcerto2: PerformanceDescriptionHelper = {
    version: "0.1",
    ballTemplates: [
        { name: "La,", color: "deepskyblue", radius: 0.05, soundOnCatch: { name: "La3" } },
        { name: "La#,", color: "deepskyblue", radius: 0.05, soundOnCatch: { name: "Sib3" } },
        { name: "Si,", color: "gray", radius: 0.05, soundOnCatch: { name: "Si3" } },
        { name: "Do", color: "red", radius: 0.05, soundOnCatch: { name: "Do4" } },
        { name: "Do#", color: "red", radius: 0.05, soundOnCatch: { name: "Reb4" } },
        { name: "Re", color: "orange", radius: 0.05, soundOnCatch: { name: "Re4" } },
        { name: "Re#", color: "orange", radius: 0.05, soundOnCatch: { name: "Mib4" } },
        { name: "Mi", color: "yellow", radius: 0.05, soundOnCatch: { name: "Mi4" } },
        { name: "Fa", color: "forestgreen", radius: 0.05, soundOnCatch: { name: "Fa4" } },
        { name: "Fa#", color: "forestgreen", radius: 0.05, soundOnCatch: { name: "Solb4" } },
        { name: "Sol", color: "white", radius: 0.05, soundOnCatch: { name: "Sol4" } },
        { name: "Sol#", color: "white", radius: 0.05, soundOnCatch: { name: "Lab4" } },
        { name: "La", color: "deepskyblue", radius: 0.05, soundOnCatch: { name: "La4" } },
        { name: "La#", color: "deepskyblue", radius: 0.05, soundOnCatch: { name: "Sib4" } },
        { name: "Si", color: "gray", radius: 0.05, soundOnCatch: { name: "Si4" } },
        { name: "Do'", color: "red", radius: 0.05, soundOnCatch: { name: "Do5" } },
        { name: "Do#'", color: "red", radius: 0.05, soundOnCatch: { name: "Reb5" } },
        { name: "Re'", color: "orange", radius: 0.05, soundOnCatch: { name: "Re5" } },
        { name: "Re#'", color: "orange", radius: 0.05, soundOnCatch: { name: "Mib5" } },
        { name: "Mi'", color: "yellow", radius: 0.05, soundOnCatch: { name: "Mi5" } }
        // { name: "Shake", color: "brown", radius: 0.1, soundOnCatch: { name: "shake" } }
    ],
    globalBeat: {
        type: "variable",
        beatReference: { barBeat: { bar: 1 }, beat: 0, timeInSeconds: 0 },
        changes: [
            { startTime: { type: "byBarBeat", bar: 1 }, beatsInBar: 8, beatsPerMinute: 126 },
            { startTime: { type: "byBarBeat", bar: 2 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 3 }, beatsInBar: 1.5 },
            { startTime: { type: "byBarBeat", bar: 4 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 5 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 7 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 8 }, beatsInBar: 1.5 },
            { startTime: { type: "byBarBeat", bar: 9 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 10 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 11 }, beatsInBar: 8 },
            { startTime: { type: "byBarBeat", bar: 13 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 16 }, beatsInBar: 10 },
            { startTime: { type: "byBarBeat", bar: 18 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 19 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 20 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 23 }, beatsInBar: 1.5 },
            { startTime: { type: "byBarBeat", bar: 24 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 25 }, beatsInBar: 2.5 },
            { startTime: { type: "byBarBeat", bar: 26 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 27 }, beatsInBar: 1.5 },
            { startTime: { type: "byBarBeat", bar: 28 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 30 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 32 }, beatsInBar: 5 },
            { startTime: { type: "byBarBeat", bar: 35 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 36 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 37 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 38 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 39 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 40 }, beatsInBar: 1.5 },
            { startTime: { type: "byBarBeat", bar: 41 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 42 }, beatsInBar: 1.5 },
            { startTime: { type: "byBarBeat", bar: 43 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 44 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 45 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 47 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 48 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 51 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 54 }, beatsInBar: 5 },
            { startTime: { type: "byBarBeat", bar: 57 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 58 }, beatsInBar: 1.5 },
            { startTime: { type: "byBarBeat", bar: 59 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 61 }, beatsInBar: 2.5 },
            { startTime: { type: "byBarBeat", bar: 62 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 64 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 66 }, beatsInBar: 5 },
            { startTime: { type: "byBarBeat", bar: 69 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 70 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 71 }, beatsInBar: 5 },
            { startTime: { type: "byBarBeat", bar: 77 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 78 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 80 }, beatsInBar: 5 },
            { startTime: { type: "byBarBeat", bar: 84 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 85 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 87 }, beatsInBar: 1.5 },
            { startTime: { type: "byBarBeat", bar: 88 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 89 }, beatsInBar: 5 },
            { startTime: { type: "byBarBeat", bar: 95 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 96 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 97 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 100 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 101 }, beatsInBar: 5 },
            { startTime: { type: "byBarBeat", bar: 103 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 104 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 105 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 109 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 111 }, beatsInBar: 2 },
            { startTime: { type: "byBarBeat", bar: 114 }, beatsInBar: 5 },
            { startTime: { type: "byBarBeat", bar: 118 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 119 }, beatsInBar: 5 },
            { startTime: { type: "byBarBeat", bar: 127 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 150 }, beatsInBar: 4, beatsPerMinute: 120 },
            { startTime: { type: "byBarBeat", bar: 152 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 153 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 154 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 155 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 160 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 161 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 164 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 165 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 167 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 168 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 170 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 171 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 172 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 173 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 174 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 175 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 176 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 178 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 179 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 180 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 182 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 183 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 184 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 185 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 186 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 187 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 188 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 190 }, beatsInBar: 8 },
            { startTime: { type: "byBarBeat", bar: 191 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 195 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 196 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 197 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 198 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 199 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 200 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 201 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 202 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 203 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 204 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 205 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 206 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 207 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 208 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 210 }, beatsInBar: 8 },
            { startTime: { type: "byBarBeat", bar: 211 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 212 }, beatsInBar: 8 },
            { startTime: { type: "byBarBeat", bar: 213 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 214 }, beatsInBar: 8 },
            { startTime: { type: "byBarBeat", bar: 215 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 218 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 219 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 220 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 222 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 223 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 224 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 226 }, beatsInBar: 6 },
            { startTime: { type: "byBarBeat", bar: 228 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 232 }, beatsInBar: 3, beatsPerMinute: 144 },
            { startTime: { type: "byBarBeat", bar: 233 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 234 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 235 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 236 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 237 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 238 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 239 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 240 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 241 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 242 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 243 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 244 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 245 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 246 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 247 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 252 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 253 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 254 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 255 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 256 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 257 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 258 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 259 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 260 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 261 }, beatsInBar: 4 },
            { startTime: { type: "byBarBeat", bar: 262 }, beatsInBar: 3 },
            { startTime: { type: "byBarBeat", bar: 263 }, beatsInBar: 4 }
        ]
    },
    tables: [
        {
            id: "TableVincent",
            width: 1.5,
            height: 0.7,
            depth: 0.5,
            position: [0, 0, -1],
            spots: [
                { acceptedBallName: "La,", ballAtStart: true, position: [-0.1, 0.7, -0.61] },
                { acceptedBallName: "La#,", ballAtStart: true, position: [0.1, 0.7, -0.555] },
                { acceptedBallName: "Si,", ballAtStart: true, position: [-0.1, 0.7, -0.5] },
                { acceptedBallName: "Do", ballAtStart: true, position: [-0.1, 0.7, -0.39] },
                { acceptedBallName: "Do#", ballAtStart: true, position: [0.1, 0.7, -0.335] },
                { acceptedBallName: "Re", ballAtStart: true, position: [-0.1, 0.7, -0.28] },
                { acceptedBallName: "Re#", ballAtStart: true, position: [0.1, 0.7, -0.225] },
                { acceptedBallName: "Mi", ballAtStart: true, position: [-0.1, 0.7, -0.17] },
                { acceptedBallName: "Fa", ballAtStart: true, position: [-0.1, 0.7, -0.06] },
                { acceptedBallName: "Fa#", ballAtStart: true, position: [0.1, 0.7, 0] },
                { acceptedBallName: "Sol", ballAtStart: true, position: [-0.1, 0.7, 0.06] },
                { acceptedBallName: "Sol#", ballAtStart: true, position: [0.1, 0.7, 0.115] },
                { acceptedBallName: "La", ballAtStart: true, position: [-0.1, 0.7, 0.17] },
                { acceptedBallName: "La#", ballAtStart: true, position: [0.1, 0.7, 0.225] },
                { acceptedBallName: "Si", ballAtStart: true, position: [-0.1, 0.7, 0.28] },
                { acceptedBallName: "Do'", ballAtStart: true, position: [-0.1, 0.7, 0.39] },
                { acceptedBallName: "Do#'", ballAtStart: true, position: [0.1, 0.7, 0.445] },
                { acceptedBallName: "Re'", ballAtStart: true, position: [-0.1, 0.7, 0.5] },
                { acceptedBallName: "Re#'", ballAtStart: true, position: [0.1, 0.7, 0.555] },
                { acceptedBallName: "Mi'", ballAtStart: true, position: [-0.1, 0.7, 0.61] }
            ]
        },
        {
            id: "TableLaurent",
            width: 1.5,
            height: 0.7,
            depth: 0.5,
            position: [0, 0, 1],
            spots: [
                { acceptedBallName: "La,", ballAtStart: true, position: [-0.1, 0.7, -0.61] },
                { acceptedBallName: "La#,", ballAtStart: true, position: [0.1, 0.7, -0.555] },
                { acceptedBallName: "Si,", ballAtStart: true, position: [-0.1, 0.7, -0.5] },
                { acceptedBallName: "Do", ballAtStart: true, position: [-0.1, 0.7, -0.39] },
                { acceptedBallName: "Do#", ballAtStart: true, position: [0.1, 0.7, -0.335] },
                { acceptedBallName: "Re", ballAtStart: true, position: [-0.1, 0.7, -0.28] },
                { acceptedBallName: "Re#", ballAtStart: true, position: [0.1, 0.7, -0.225] },
                { acceptedBallName: "Mi", ballAtStart: true, position: [-0.1, 0.7, -0.17] },
                { acceptedBallName: "Fa", ballAtStart: true, position: [-0.1, 0.7, -0.06] },
                { acceptedBallName: "Fa#", ballAtStart: true, position: [0.1, 0.7, 0] },
                { acceptedBallName: "Sol", ballAtStart: true, position: [-0.1, 0.7, 0.06] },
                { acceptedBallName: "Sol#", ballAtStart: true, position: [0.1, 0.7, 0.115] },
                { acceptedBallName: "La", ballAtStart: true, position: [-0.1, 0.7, 0.17] },
                { acceptedBallName: "La#", ballAtStart: true, position: [0.1, 0.7, 0.225] },
                { acceptedBallName: "Si", ballAtStart: true, position: [-0.1, 0.7, 0.28] },
                { acceptedBallName: "Do'", ballAtStart: true, position: [-0.1, 0.7, 0.39] },
                { acceptedBallName: "Do#'", ballAtStart: true, position: [0.1, 0.7, 0.445] },
                { acceptedBallName: "Re'", ballAtStart: true, position: [-0.1, 0.7, 0.5] },
                { acceptedBallName: "Re#'", ballAtStart: true, position: [0.1, 0.7, 0.555] },
                { acceptedBallName: "Mi'", ballAtStart: true, position: [-0.1, 0.7, 0.61] }
            ]
        }
    ],
    jugglers: [
        {
            name: "Vincent",
            position: [-1, 0, -1],
            defaultTableID: "TableVincent",
            ballsHeldAtStart: [[], []],
            jugglingPhrases: [
                {
                    startTime: { type: "byGlobalBarBeat", bar: 0, beatInBar: 7 },
                    localBaseTempo: { type: "perGlobalBeat", beatsPerGlobalBeat: 1 },
                    setup: {
                        hands: [
                            [
                                { ball: { type: "template", template: "Fa" } },
                                { ball: { type: "template", template: "Re#" } },
                                { ball: { type: "template", template: "Do" } }
                            ],
                            []
                        ]
                    },
                    pattern: "LDo1 0 Re#1 0 Fa1 0 RRe#1 0 Do1 0"
                },
                {
                    startTime: { type: "byGlobalBarBeat", bar: 4, beatInBar: 2 },
                    setup: {
                        hands: [
                            [
                                { ball: { type: "template", template: "La" } },
                                { ball: { type: "template", template: "Fa" } },
                                { ball: { type: "template", template: "Re#" } },
                                { ball: { type: "template", template: "Do" } }
                            ],
                            []
                        ]
                    },
                    pattern: "LDo1 0 Re#1 0 Fa1 0 La1 0 RFa1 0 Re#1 0 Do1 0"
                },
                {
                    startTime: { type: "byGlobalBarBeat", bar: 10, beatInBar: 1 },
                    setup: {
                        hands: [
                            [
                                { ball: { type: "template", template: "Si" } },
                                { ball: { type: "template", template: "La" } },
                                { ball: { type: "template", template: "Fa" } },
                                { ball: { type: "template", template: "Re#" } },
                                { ball: { type: "template", template: "Do" } }
                            ],
                            []
                        ]
                    },
                    pattern: "LDo1 0 Re#1 0 Fa1 0 La1 0 Si1 0 RLa1 0 Fa1 0 Re#1 0 Do1 0"
                },
                {
                    startTime: { type: "byGlobalBarBeat", bar: 15, beatInBar: 1 },
                    setup: {
                        hands: [
                            [
                                { ball: { type: "template", template: "Re'" } },
                                { ball: { type: "template", template: "Si" } },
                                { ball: { type: "template", template: "La" } },
                                { ball: { type: "template", template: "Fa" } },
                                { ball: { type: "template", template: "Re#" } },
                                { ball: { type: "template", template: "Do" } }
                            ],
                            []
                        ]
                    },
                    pattern:
                        "LDo1 0 Re#1 0 Fa1 0 La1 0 Si1 0 Re'1 0 RSi1 0 La1 0 Fa1 0 Re#1 0 Do1 0"
                },
                {
                    startTime: { type: "byGlobalBarBeat", bar: 31, beatInBar: 0 },
                    setup: {
                        hands: [
                            [
                                { ball: { type: "template", template: "Fa" } },
                                { ball: { type: "template", template: "Do" } }
                            ],
                            [{ ball: { type: "template", template: "Re#" } }]
                        ]
                    },
                    pattern: "L3 3 3 3 4 2 4 0 3 3 3 3"
                },
                {
                    startTime: { type: "followPrevious" },
                    localTempoMultiplier: 2,
                    pattern: "3 3 3 3"
                }
            ]
        },
        {
            name: "Laurent",
            position: [-1, 0, 1],
            defaultTableID: "TableLaurent",
            ballsHeldAtStart: [[], []]
        }
    ]
};