import Fraction from "fraction.js";
import { Ball, BallsInHands, FracSortedList, SchedulerEvent } from "./mj_parser";
import { Deque } from "js-sdsl";
import { MusicBeatConverter, MusicTime } from "./music_beat_converter";
import { parseMusicalSiteswap, ParserJugglingEvent } from "../parser/siteswap_mj/MusicalSiteswap";
import { parserToSchedulerEvents } from "./parser_to_scheduler";
import { closestWordsTo } from "./levenshtein_distance";

//TODO : namespaces ?
//TODO : Move all custom functions from this file.
//TODO : In partial Event, tosses may be undefined






//TODO : Rename
//Danube

const commonBallNames = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si", "Do'"];

const specificBallNames = [
    { name: "Vincent", ballNames: [] },
    { name: "Florent", ballNames: ["Fa#, Mi'"] }
];

const jugglers = formatJugglerBalls(commonBallNames, specificBallNames);

//TODO const musicMeasures

/* eslint-disable */
// prettier-ignore
const patternVincent: [
    string,
    { tempo?: string; hands?: [string[], string[]]; pattern?: string }
][] = [
    ["-1, 2", { tempo: "1/4", hands: [["Do", "Mi"], ["Sol"]], pattern: "L40441001" }],
    ["3, 2", { hands: [["Do", "Mi"], ["Sol"]], pattern: "L40441001" }],
    ["7, 2", { hands: [["Re", "Fa"], ["La"]], pattern: "L40441001" }],
    ["11, 2", { hands: [["Re", "Fa"], ["La"]], pattern: "L40441001" }],
    ["15, 2", { hands: [["Do", "Mi"], ["Sol", "Do'"]], pattern: "L404[Sol4Do'R]" }],
    ["19, 2", { hands: [["Do", "Mi"], ["Sol", "Do'"]], pattern: "L404[Sol4Do'R]" }],
    ["23, 2", { hands: [["Re", "Fa"], ["La"]], pattern: "L40441001" }],
    ["28, 3", { hands: [["Re"], ["Do'"]], pattern: "R2201" }],
    ["31, 3", { hands: [["Do"], []], pattern: "L1" }],
    ["32, 1", { tempo: "1/8", pattern: "11" }],
    ["32, 2", { tempo: "1/4", pattern: "1"}],
]

// prettier-ignore
const patternFlorent: [
    string,
    { tempo?: string; hands?: [string[], string[]]; pattern?: string }
][] = [
    ["1, 3", { tempo: "1/4", hands: [["Mi"], ["Sol"]], pattern: "R3501001" }],
    ["5, 3", { hands: [["Fa"], ["Sol"]], pattern: "R3501001" }],
    ["9, 3", { hands: [["Fa"], ["La"]], pattern: "R3501001" }],
    ["13, 3", { hands: [["Mi"], ["La"]], pattern: "R3501001" }],
    ["17, 3", { hands: [["Sol"], ["Do'"]], pattern: "R3501001" }],
    ["21, 3", { hands: [["La"], ["Do'"]], pattern: "R3501001" }],
    ["26, 2", { hands: [["Fa#", "Mi'"], ["Sol"]], pattern: "L(3^3)" }],
    ["29, 2", { hands: [["La", "Do"], ["Re", "Sol"]], pattern: "R445x5x" }],
]
/* eslint-enable */

function simulate();
