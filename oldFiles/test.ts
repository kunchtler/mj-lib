import { MusicBeatConverter } from "./music_beat_converter";
import { Ball as PatternBall } from "./tocategorize/mj_parser";
import { RawPreParserEvent } from "./the_whole_thing";

const rawBallsVincent = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si", "Do'"];
const IDSuffixVincent = "?V";
const rawBallsFlorent = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si", "Do'", "Mi'", "Fa#"];
const IDSuffixFlorent = "?F";
//prettier-ignore
const rawEventsVincent: [string, RawPreParserEvent][] = [
    ["-1, 1/4", { tempo: "1/4", hands: [["Mi", "Do"], ["Sol"]], pattern: "L40441001" }],
    ["3, 1/4", { hands: [["Mi", "Do"], ["Sol"]], pattern: "L40441001" }],
    ["7, 1/4", { hands: [["Fa", "Re"], ["La"]], pattern: "L44441001" }],
    ["11, 1/4", { hands: [["Fa", "Re"], ["La"]], pattern: "L40441001" }],
    ["15, 1/4", { hands: [["Mi", "Do"], ["Do'", "Sol"]], pattern: "L404[Sol4Do'5]" }],
    ["19, 1/4", { hands: [["Mi", "Do"], ["Do'", "Sol"]], pattern: "L404[Sol4Do'5]" }],
    ["23, 1/4", { hands: [["Fa", "Re"], ["La"]], pattern: "L40441001" }],
    ["28, 2/4", { hands: [["Re"], ["Do'"]], pattern: "R2201" }],
    ["31, 2/4", { hands: [["Do"], []], pattern: "L1" }],
    ["32, 0", { tempo: "1/8", pattern: "11" }],
    ["32, 1/4", { tempo: "1/4", pattern: "1"}],
]
//prettier-ignore
const rawEventsFlorent: [
    string,
    { tempo?: string; hands?: [string[], string[]]; pattern?: string }
][] = [
    ["1, 2/4", { tempo: "1/4", hands: [["Mi"], ["Sol"]], pattern: "R3501001" }],
    ["5, 2/4", { hands: [["Fa"], ["Sol"]], pattern: "R3501001" }],
    ["9, 2/4", { hands: [["Fa"], ["La"]], pattern: "R3501001" }],
    ["13, 2/4", { hands: [["Mi"], ["La"]], pattern: "R3501001" }],
    ["17, 2/4", { hands: [["Sol"], ["Do'"]], pattern: "R3501001" }],
    ["21, 2/4", { hands: [["La"], ["Do'"]], pattern: "R3501001" }],
    ["26, 1/4", { hands: [["Mi'", "Fa#"], ["Sol"]], pattern: "L3(3^2)" }],
    ["29, 1/4", { hands: [["Do", "La"], ["Sol", "Re"]], pattern: "R445x5x" }],
];

const musicInfo = { signature: [[0, "3/4"]], tempo: [[0, { note: "1/4", bpm: 160 }]] };
const ballsVincent = formatRawBalls(rawBallsVincent, IDSuffixVincent);
const ballsFlorent = formatRawBalls(rawBallsFlorent, IDSuffixFlorent);

function formatRawBalls(rawBalls: string[], IDSuffix: string): PatternBall[] {
    const balls: PatternBall[] = [];
    for (const name of rawBalls) {
        balls.push({ name: name, id: name + IDSuffix });
    }
    return balls;
}

const obj = {
    musicInfo: musicInfo,
    jugglers: [
        ["Vincent", { events: rawEventsVincent, balls: ballsVincent }],
        ["Florent", { events: rawEventsFlorent, balls: ballsFlorent }]
    ]
};

console.log(JSON.stringify(obj));
