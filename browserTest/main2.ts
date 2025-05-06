import { JugglingAppParams, Simulator, jugglingApp } from "../src/MusicalJuggling";
import { VRButton } from "three/examples/jsm/Addons.js";

// const params: JugglingAppParams = {
//     jugglers: [
//         [
//             "Nicolas",
//             {
//                 balls: [
//                     { id: "Do?N", name: "Do", sound: "Do", color: "red" },
//                     { id: "Re?N", name: "Re", sound: "Re", color: "orange" },
//                     { id: "Mi?N", name: "Mi", sound: "Mi", color: "yellow" }
//                 ],
//                 events: [
//                     [
//                         "0",
//                         {
//                             tempo: "1",
//                             hands: [["Do"], ["Re"]],
//                             pattern: "L20R2300R1x"
//                         }
//                     ]
//                 ]
//             }
//         ]
//     ],
//     musicConverter: [[0, { signature: "1", tempo: { note: "1", bpm: 240 } }]]
// };
const params: JugglingAppParams = {
    jugglers: [
        [
            "Nicolas",
            {
                balls: [{ id: "Fa#?N", name: "Fa#", sound: "Fa#", color: "white" }],
                events: [
                    [
                        "0",
                        {
                            tempo: "1",
                            hands: [["Fa#"], []],
                            pattern: "L13"
                        }
                    ]
                ]
            }
        ]
    ],
    musicConverter: [[0, { signature: "1", tempo: { note: "1", bpm: 240 } }]]
};
const { jugglers: rawJugglers, musicConverter: rawMusicConverter } = params;

const canvas = document.createElement("canvas");
// canvas.classList.add("simulator_canvas");
canvas.id = "simulator_canvas";
const root = document.getElementById("root");
root?.appendChild(canvas);
const simulator = new Simulator({ canvas: canvas, enableAudio: true });
// document.body.append(canvas);
root?.appendChild(VRButton.createButton(simulator.renderer));

jugglingApp(canvas, params);
//TODO : Separate in own function.
//TODO : Sanitize here too ! (different juggler names, etc)
//TODO : In MusicBeatConverter (and here before), Sort tempo and signature changes !!
// 1. Create parser parameters.

// 1a. rawMusicConverter
// const signatureChanges: [number, Fraction][] = [];
// const tempoChanges: [number, MusicTempo][] = [];
// for (const [number, { signature, tempo }] of rawMusicConverter) {
//     if (signature !== undefined) {
//         signatureChanges.push([number, new Fraction(signature)]);
//     }
//     if (tempo !== undefined) {
//         tempoChanges.push([number, { note: new Fraction(tempo.note), bpm: tempo.bpm }]);
//     }
// }
// const musicConverter = new MusicBeatConverter(signatureChanges, tempoChanges);

// // 1b. rawJugglers
// const preParserJugglers = new Map<
//     string,
//     { balls: { id: string; name: string }[]; events: FracSortedList<PreParserEvent> }
// >();
// for (const [jugglerName, { balls, events: rawEvents }] of rawJugglers) {
//     preParserJugglers.set(jugglerName, {
//         balls: balls,
//         events: formatRawEventInput(rawEvents, musicConverter)
//     });
// }
// if (preParserJugglers.size !== rawJugglers.length) {
//     throw Error("TODO : Duplicate juggler name");
// }

// 1c. Gather ball info from jugglers.
//TODO : Fuse ballIDs and BallIDSounds ?
//TODO : Sound on toss / catch.
// const ballIDs = new Map<
//     string,
//     { name: string; sound?: string; juggler: string; color?: string | number }
// >();
// const ballNames = new Set<string>();
// const ballSounds = new Set<string>();
// for (const [jugglerName, { balls }] of rawJugglers) {
//     for (const ball of balls) {
//         if (ballIDs.has(ball.id)) {
//             throw Error("TODO : Duplicate ball ID");
//         }
//         ballIDs.set(ball.id, {
//             name: ball.name,
//             sound: ball.sound,
//             juggler: jugglerName,
//             color: ball.color
//         });
//         ballNames.add(ball.name);
//         if (ball.sound !== undefined) {
//             ballSounds.add(ball.sound);
//         }
//     }
// }

// // 1d. Compile the parameters for the parser.
// const parserParams: ParserToSchedulerParams = {
//     ballNames: ballNames,
//     ballIDs: ballIDs,
//     jugglers: preParserJugglers,
//     musicConverter: musicConverter
// };

// //TODO : Rename to parser only ? Name of method a bit convoluted.
// const schedulerParams = transformParserParamsToSchedulerParams(parserParams);
// console.log(stringifyEvents(schedulerParams.jugglers.get("Nicolas")!.events));
// const postSchedulerParams = new Scheduler(schedulerParams).validatePattern();
// console.log(stringifyEvents(postSchedulerParams.get("Nicolas")!.events));
