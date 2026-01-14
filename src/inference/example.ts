import { JSONPerformanceDescription } from "./PerformanceDescription";

const example: JSONPerformanceDescription = {
    ballTemplates: [
        { name: "Do", color: "red", soundOnCatch: "Do4" },
        { name: "Re", color: "orange", soundOnCatch: "Re4" },
        { name: "Mi", color: "yellow", soundOnCatch: "Mi4" }
    ],
    jugglers: [
        {
            name: "Leo",
            ballsHeldAtStart: [[{ name: "Mi" }, { name: "Do" }], [{ name: "Re" }]],
            body: { height: 1.8, width: 0.5, depth: 0.2, color: "brown" },
            position: [-1, 0, 0],
            rightHand: {},
            leftHand: {},
            jugglingPhrases: [
                {
                    startTime: 0,
                    pattern: "[L]35003 35003 [silent catch]3500[silent toss]3 42334 05003 35003 35003 42334 [tempo=300]0300",
                    withTempo: 1
                }
            ]
        }
    ],
    scoreConverter: [{}],
    tableTemplates: 
};
