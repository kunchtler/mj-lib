// console.log(JSON.stringify(0xffffff));

// Create two independent EventTarget instances
// const emitter = new EventTarget();
// const listener = new EventTarget();

// // Listener registers an event handler
// listener.addEventListener("customEvent", (event: Event) => {
//     console.log("Received event with data:", event);
// });

// // Manually relay the event from emitter to listener
// emitter.addEventListener("customEvent", (e) => listener.dispatchEvent(e));

// // Trigger the event
// emitter.dispatchEvent(new CustomEvent("customEvent", { detail: { message: "Hello!" } }));

// setInterval(() => console.log(2), 10);

// // function binarySearch(sortedArray: number[], seekElement: number): number {
// //     let startIndex = 0;
// //     let endIndex: number = sortedArray.length - 1;
// //     while (startIndex <= endIndex) {
// //         const mid = startIndex + ((endIndex - startIndex) >> 1);
// //         // const mid = startIndex + Math.floor((endIndex - startIndex) / 2);
// //         const guess = sortedArray[mid];
// //         if (guess === seekElement) {
// //             return mid;
// //         } else if (guess > seekElement) {
// //             endIndex = mid - 1;
// //         } else {
// //             startIndex = mid + 1;
// //         }
// //     }

// //     return -1;
// // }

// const indexOfSearch = function (arr: number[], element: number) {
//     return arr.indexOf(element);
// };

// // const len = 1000;
// // const testArray = [...Array(len).keys()].map((x) => x + 1);
// // const testTree = new OrderedSet<number>(testArray);

// // const N = 100000;
// // const seekElements = [...Array(N)].map((k) => Math.floor(Math.random() * len * 1.1));

// // let start: number, end: number;

// // start = performance.now();
// // for (let el of seekElements) {
// //     binarySearch(testArray, el);
// // }
// // end = performance.now();
// // console.log(`binarySearch ${end - start} ms`);

// // start = performance.now();
// // for (let el of seekElements) {
// //     indexOfSearch(testArray, el);
// // }
// // end = performance.now();
// // console.log(`indexOfSearch ${end - start} ms`);

// // start = performance.now();
// // for (let el of seekElements) {
// //     testTree.find(el);
// // }
// // end = performance.now();
// // console.log(`orderedset ${end - start} ms`);

// function binarySearchCmp<T, S>(
//     sortedArray: T[],
//     seekElement: S,
//     cmpFunc: (val1: T, val2: S) => number
// ): number {
//     let startIndex = 0;
//     let endIndex: number = sortedArray.length - 1;
//     while (startIndex <= endIndex) {
//         const mid = startIndex + ((endIndex - startIndex) >> 1);
//         const comparison = cmpFunc(sortedArray[mid], seekElement);
//         if (comparison === 0) {
//             return mid;
//         } else if (comparison > 0) {
//             endIndex = mid - 1;
//         } else {
//             startIndex = mid + 1;
//         }
//     }

//     return -1;
// }

// // function indexOfSearchCmp<T, S>(arr: T[], element: S, cmpFunc: (val1: T, val2: S) => number) {
// //     return indexOf(element);
// // }

// const len = 2000;
// const testArray = [...Array(len).keys()].map((x) => x + 1);
// const testTree = new OrderedSet<number>(testArray);

// const N = 100000;
// const seekElements = [...Array(N)].map((k) => Math.floor(Math.random() * len * 1.1));

// const cmpFunc = (val1: number, val2: number) => val1 - val2;

// let start: number, end: number;

// start = performance.now();
// for (let el of seekElements) {
//     binarySearchCmp(testArray, el, cmpFunc);
// }
// end = performance.now();
// console.log(`binarySearch ${end - start} ms`);

// start = performance.now();
// for (let el of seekElements) {
//     indexOfSearch(testArray, el);
// }
// end = performance.now();
// console.log(`indexOfSearch ${end - start} ms`);

// start = performance.now();
// for (let el of seekElements) {
//     testTree.find(el);
// }
// end = performance.now();
// console.log(`orderedset ${end - start} ms`);

// import { Deque, OrderedMap } from "js-sdsl";

// const a = new Deque<number>([]);
// console.log(a.popBack());
// // const b = a.eraseElementByValue(3);
// console.log(a);
// console.log(b);

// const a = new OrderedMap<number, number>([[1, 1]] as [number, number][]);
// const it = a.begin();
// console.log(it.isAccessible());
// const it2 = it.copy();
// console.log(it2.next().isAccessible());
// // console.log(it2.isAccessible());
// a.setElement(2, 2);
// console.log(it2.isAccessible());
// console.log(it.isAccessible());
// console.log(it.next().isAccessible());
// console.log(it.pointer[0]);
// console.log(it2.pre().isAccessible());
// console.log(it2.pointer[0]);

// const a = new OrderedMap<number, number>();
// const it = a.begin();
// a.setElement(1, 1);
// a.setElement(2, 2);
// console.log(it.copy().pre().isAccessible());
// console.log(it.copy().pre().isAccessible());
// console.log(`A \
//     B`);

// import Fraction from "fraction.js";
// const a = new Fraction("3/2");
// const b = new Fraction("4/5");
// const c = new Fraction("7/2");
// console.log(a.add(b));
// console.log(a.add(b).add(c));

// import { OrderedMap } from "js-sdsl";

// const a = new OrderedMap<number, number>();
// a.setElement(0, 0);
// const it = a.begin();
// a.setElement(1, 1);
// console.log(it.pointer[0]);
// it.next();
// console.log(it.pointer[0]);
// a.setElement(0.5, 0.5);
// it.pre();
// console.log(it.pointer[0]);
// import abcjs from "abcjs";
// const abcNotation = `
// X:1
// T:Untitled score
// C:Composer / arranger
// L:1/4
// Q:1/4=80
// M:4/4
// K:C
// V:1
// a ^a b _b | [K:B] a =a b =b |]
// `;
// const abcNotation = `X:1
// T:Untitled score
// C:Composer / arranger
// L:1/4
// Q:1/4=80
// M:4/4
// K:G
// %%stretchlast true
// V:1 treble nm="Flute" snm="Fl."
// %%MIDI program 73
// V:1
//  f z d z |[K:Bb] f z[Q:1/2=190] e z |[M:2/4] A d |]
// `;
// import abcNotation from "./examples/danube.txt";
// const tuneObject = abcjs.parseOnly(abcNotation)[0];
// const seq = abcjs.synth.sequence(tuneObject, {});
// console.log(seq);

// const b = abcjs.synth.flatten(seq);
// console.log(b);

// const c = abcjs.synth.getMidiFile(seq);
// console.log(c);
// // const accidentals;

// // Parse the ABC notation
// const tuneObject = abcjs.parseOnly(abcNotation)[0].deline()[0];

// // Extract music notes from the parsed object
// const notes: string[] = [];
// tuneObject.staff?.forEach((staff) => {
//     staff.voices?.forEach((voice) => {
//         voice.forEach((note) => {
//             if (note.el_type === "note") {
//                 notes.push(note.pitches?.map((p) => p.name + (p.accidental || "")));
//             }
//         });
//     });
// });
// // Flatten and print all notes in order
// const flattenedNotes = notes.flat().join(", ");
// console.log("All notes in order: ", flattenedNotes);

// import { TuneLine, TuneObject, VoiceItem } from "abcjs";
// import abcjs from "abcjs";

// import { readFileSync } from "fs";

// // Specify the path to the file
// const filePath = "./src/examples/danube.abc"; // Change this to your file path
// let danube: string;

// try {
//     danube = readFileSync(filePath, "utf8");
//     // console.log("File content (synchronous):");
//     // console.log(data);
// } catch (err) {
//     console.error("Error reading the file synchronously:", err.message);
// }
// console.log(danube);
// const music: string[] = [];
// const b = abcjs.parseOnly(danube)[0];
// console.log(`b.getBarLength = ${b.getBarLength()}`);
// console.log(`b.getBeatLength = ${b.getBeatLength()}`);
// console.log(`b.getBeatsPerMeasure = ${b.getBeatsPerMeasure()}`);
// console.log(`b.getBpm = ${b.getBpm()}`);
// console.log(`b.getElementFromChar = ${b.getElementFromChar(1)}`);
// console.log(
//     `b.getKeySignature = ${b.getKeySignature().acc} + ${b.getKeySignature().accidentals}+ ${b.getKeySignature().mode} + ${b.getKeySignature().root}`
// );
// // console.log(`b.getMeter = ${b.getMeter()}`);
// console.log(`b.getMeterFraction = ${b.getMeterFraction().num} + ${b.getMeterFraction().den}`);
// console.log(`b.getPickupLength = ${b.getPickupLength()}`);
// console.log(`b.getSelectableArray = ${b.getSelectableArray()}`);
// console.log(`b.getTotalBeats = ${b.getTotalBeats()}`);
// console.log(`b.getTotalTime = ${b.getTotalTime()}`);
// console.log(`b.lineBreaks = ${b.lineBreaks}`);
// console.log(`b.lines = ${b.lines}`);
// // console.log(`b.makeVoicesArray = ${b.makeVoicesArray()}`);
// console.log(`b.media = ${b.media}`);
// console.log(`b.metaText = ${b.metaText}`);
// console.log(`b.metaTextInfo = ${b.metaTextInfo}`);
// console.log(`b.millisecondsPerMeasure = ${b.millisecondsPerMeasure()}`);
// console.log(`b.version = ${b.version}`);
// console.log(`b.visualTranspose = ${b.visualTranspose}`);
// console.log(`b.warnings = ${b.warnings}`);
// const a = abcjs.parseOnly(danube)[0].deline();
// // a[0].staff[0].meter
// const c = abcjs.parseOnly(`X:1
// L:1/4
// Q:1/4=160
// M:3/4
// K:G
// V:1
//  C | C E F | [M:7/8][L:1/8] z2C DC EG |]`);

// console.log(a);

// //TODO : Account for signature + meter changes (and other things ? Points d'orgues ?)
// function walker(tune: TuneObject) {
//     // tune.getMeter
// }

// function get_beats(part: VoiceItem[]): string[] {
//     const notes: string[] = [];
//     part.forEach((voice_item) => {
//         if (voice_item.el_type === "note") {
//             const duration = voice_item.duration;
//             voice_item.pitches?.forEach((pitch) => {
//                 notes.push(pitch.note);
//             });
//         }
//     });

//     return notes;
// }

// import { log } from "tone/build/esm/core/util/Debug";
// import { Hand } from "./Hand";

// interface Tree<T> {
//     value: T;
//     children: Tree<T>[];
// }

// const a: Tree<number> = {
//     value: 0,
//     children: [
//         {
//             value: 1,
//             children: [
//                 { value: 1, children: [] },
//                 { value: 1, children: [] }
//             ]
//         },
//         { value: 1, children: [] }
//     ]
// };

// type TreeNode = {
//     children?: TreeNode[];
// } & object;

// type Tree2 = {
//     children: Tree2[];
// };

// console.log(a);

// class A {
//     time: number;
//     constructor(time: number) {
//         this.time = time;
//     }
// }

// class B {
//     time: number;
//     b = "a";
//     constructor(time: number) {
//         this.time = time;
//     }
// }

// function isB(x: A | B): x is B {
//     return (x as B).b !== undefined;
// }

// type test = A | B;

// type Chaining = [A, B] | [A, A] | [B, B];

// function bar([x, y]: Chaining) {
//     if (isB(x)) {
//         y;
//     }
// }

// function foo(x: test) {
//     console.log(x.time);
// }

// // type Base = { next(): HandEvent };

// // type SingleThrow = { name: "st" };
// // type SingleCatch = { name: "sc" };
// // type TablePut = Base & { name: "tp" };
// // type TableTake = Base & { name: "tt" };
// // type MultTC = Base & { ev: (SingleThrow | SingleCatch)[] };

// // type HandEvent = (MultTC | TablePut | TableTake) | null;

// // const b: HandEvent = {
// //     name: "tp",
// //     next: () => {
// //         return { ev: [{ name: "st" }, { name: "st" }, { name: "sc" }], next: () => null };
// //     }
// // };

// // interface Base { next(): HandEvent };

// // interface SingleThrow { name: "st" };
// // interface SingleCatch { name: "sc" };
// // interface TablePut Base & { name: "tp" };
// // interface TableTake = Base & { name: "tt" };
// // interface MultTC = Base & { ev: (SingleThrow | SingleCatch)[] };

// // type HandEvent = (MultTC | TablePut | TableTake) | null;

// // const b: HandEvent = {
// //     name: "tp",
// //     next: () => {
// //         return { ev: [{ name: "st" }, { name: "st" }, { name: "sc" }], next: () => null };
// //     }
// // };

// // console.log(Infinity < Infinity);

// const a = `${1}`;
// const b = `a${a}`;
// throw Error("Test");
// console.log(b);
