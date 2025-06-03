import { JugglingPatternRaw } from "../src/model/PatternToModel";

export const pattern: JugglingPatternRaw = {
    jugglers: [
        {
            name: "Kylian",
            table: "KylianT",
            balls: [
                { id: "Do?K", name: "Do", sound: "Do" },
                { id: "Re?K", name: "Re", sound: "Re" },
                { id: "Mi?K", name: "Mi", sound: "Mi" }
            ],
            events: [
                [
                    "0",
                    {
                        tempo: "1",
                        hands: [["Do"], ["Re", "Mi"]],
                        pattern: "R35003 35003 35003 42334 05003 35003 35003 42334 0300"
                    }
                ]
            ]
        }
    ],
    musicConverter: [[0, { signature: "1", tempo: { note: "1", bpm: 200 } }]]
};

// const model = patternToModel(pattern);
// console.log(model);
