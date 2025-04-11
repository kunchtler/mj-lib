import { Juggler } from "../simulator/Juggler";
import { Simulator } from "../simulator/Simulator";
import * as THREE from "three";
import * as Tone from "tone";
import { Table, TableConstructorParameters } from "../simulator/Table";
import { Ball } from "../simulator/Ball";
import { Hand } from "../simulator/Hand";
import {
    CatchEvent,
    HandMultiEvent,
    TablePutEvent,
    TableTakeEvent,
    ThrowEvent
} from "../simulator/Timeline";
import abcjs from "abcjs";

const abcNotation = `
X:1
L:1/4
Q:1/4=160
M:3/4
K:G
V:1
 C'' | D ^E F |
 [M:7/8][L:1/8][Q:1/8=160] z2G AB cd |]
    `;

// const accidentals;

// Parse the ABC notation
const tuneObject = abcjs.renderAbc("*", abcNotation);

const simulator = new Simulator("#simulator_canvas");

const balls_info: [string, string, [number, number], string][] = [
    // Big props - notes
    ["la", "cyan", [1, 1], "A4"],
    ["sib", "cyan", [1.5, 2], "A#4"],
    ["si", "gray", [2, 1], "B4"],
    ["do", "red", [3, 1], "C4"],
    ["reb", "red", [3.5, 2], "C4#"],
    ["re", "orange", [4, 1], "D4"],
    ["mib", "orange", [4.5, 2], "D4#"],
    ["mi", "yellow", [5, 1], "E4"],
    ["fa", "green", [6, 1], "F4"],
    ["solb", "green", [6.5, 2], "F4#"],
    ["sol", "white", [7, 1], "G4"],
    ["lab2", "white", [7.5, 2], "G4#"],
    ["la2", "cyan", [8, 1], "A5"],
    ["sib2", "cyan", [8.5, 2], "A5#"],
    ["si2", "gray", [9, 1], "B5"],
    ["do2", "red", [10, 1], "C5"],
    ["reb2", "red", [10.5, 2], "C5#"],
    ["re2", "orange", [11, 1], "D5"],
    ["mib2", "orange", [11.5, 2], "D5#"],
    ["mi2", "yellow", [12, 1], "E5"],
    // Big props - silent
    ["silent1", "white", [1, 4], ""],
    ["silent2", "white", [3, 4], ""],
    // Small props - notes
    ["sdo", "red", [5.5, 4], "C6"],
    ["sre", "orange", [6, 4], "D6"],
    ["smi", "yellow", [6.5, 4], "E6"],
    ["sfa", "green", [7, 4], "F6"],
    ["ssol", "white", [7.5, 4], "G6"],
    ["sla", "cyan", [8, 4], "A7"],
    ["ssi", "gray", [8.5, 4], "B7"],
    ["sdo2", "red", [9, 4], "C7"],
    // Small props - rhythmic
    ["grelot", "brown", [10, 4], "grelot"]
];

const balls_placement: Record<string, THREE.Vector2> = {};
for (const [note, , [x, y]] of balls_info) {
    balls_placement[note] = new THREE.Vector2(x, y);
}

const table_options: TableConstructorParameters = {
    ballsPlacement: balls_placement,
    surfaceRealDimensions: [2.5, 1],
    surfaceInternalSize: [13, 5]
};
const martin_table = new Table(table_options);
const vincent_table = new Table(table_options);
const nina_table = new Table(table_options);
const laurent_table = new Table(table_options);
simulator.tables = [martin_table, vincent_table, nina_table, laurent_table];
const martin = new Juggler({ default_table: martin_table });
const vincent = new Juggler({ default_table: vincent_table });
const nina = new Juggler({ default_table: nina_table });
const laurent = new Juggler({ default_table: laurent_table });
simulator.jugglers = [martin, vincent, nina, laurent];

const mute_simulator = false;
const sfx_gain = new Tone.Gain(mute_simulator ? 0 : 1).toDestination();

for (const [note, color, , sound] of balls_info) {
    for (const juggler of simulator.jugglers) {
        const buffer = new Tone.ToneAudioBuffer(`notes/${sound}.mp3`, () => {
            console.log("loadde");
        });
        const player = new Tone.Player(buffer);
        const panner = new Tone.Panner3D({ panningModel: "HRTF", rolloffFactor: 1 });
        player.connect(panner);
        panner.connect(sfx_gain);
        simulator.balls.push(
            new Ball({
                color: color,
                radius: 0.06,
                id: note,
                sound: player,
                panner3D: panner,
                default_juggler: juggler
            })
        );
    }
}

function lance(
    ball: Ball,
    throw_time: number,
    ss_height: number,
    source: Hand,
    target: Hand,
    unit_time: number,
    play_sound = true
): void {
    const time_offset = ss_height <= 1 ? unit_time / 3 : (unit_time * 7) / 10;
    const ev1 = new ThrowEvent({
        time: throw_time + time_offset,
        unit_time: unit_time,
        sound_name: null,
        ball: ball,
        hand: source
    });
    const ev2 = new CatchEvent({
        time: throw_time + ss_height * unit_time,
        unit_time: unit_time,
        sound_name: play_sound ? "" : null, //TODO : Fix sound handling, this is dirty. Have events play sound. Have hands not have this attribute.
        ball: ball,
        hand: target
    });
    console.log(ev1);
    console.log(ev2);
    ball.timeline.setElement(ev1.time, ev1);
    ball.timeline.setElement(ev2.time, ev2);
    const source_it = source.timeline.find(ev1.time);
    if (source_it.isAccessible() && source_it.pointer[1] instanceof HandMultiEvent) {
        source_it.pointer[1].events.push(ev1);
    } else {
        const source_ev = new HandMultiEvent<CatchEvent | ThrowEvent>({
            time: ev1.time,
            unit_time: ev1.unitTime,
            hand: ev1.hand,
            events: [ev1]
        });
        source.timeline.setElement(source_ev.time, source_ev);
    }
    const target_it = target.timeline.find(ev1.time);
    if (target_it.isAccessible() && target_it.pointer[1] instanceof HandMultiEvent) {
        target_it.pointer[1].events.push(ev1);
    } else {
        const target_ev = new HandMultiEvent<CatchEvent | ThrowEvent>({
            time: ev2.time,
            unit_time: ev2.unitTime,
            hand: ev2.hand,
            events: [ev2]
        });
        target.timeline.setElement(target_ev.time, target_ev);
    }
}

function lance_rev(
    ball: Ball,
    catch_time: number,
    ss_height: number,
    source: Hand,
    target: Hand,
    unit_time: number,
    play_sound = true
): void {
    const time_offset = ss_height <= 1 ? unit_time / 3 : (unit_time * 7) / 10;
    const ev1 = new ThrowEvent({
        time: catch_time - ss_height * unit_time + time_offset,
        unit_time: unit_time,
        sound_name: null,
        ball: ball,
        hand: source
    });
    const ev2 = new CatchEvent({
        time: catch_time,
        unit_time: unit_time,
        sound_name: play_sound ? "" : null, //TODO : Fix sound handling, this is dirty. Have events play sound. Have hands not have this attribute.
        ball: ball,
        hand: target
    });
    // console.log(ev1);
    // console.log(ev2);
    ball.timeline.setElement(ev1.time, ev1);
    ball.timeline.setElement(ev2.time, ev2);
    const source_it = source.timeline.find(ev1.time);
    if (source_it.isAccessible() && source_it.pointer[1] instanceof HandMultiEvent) {
        console.log("1");
        source_it.pointer[1].events.push(ev1);
    } else {
        console.log("2");
        const source_ev = new HandMultiEvent<CatchEvent | ThrowEvent>({
            time: ev1.time,
            unit_time: ev1.unitTime,
            hand: ev1.hand,
            events: [ev1]
        });
        source.timeline.setElement(source_ev.time, source_ev);
    }
    const target_it = target.timeline.find(ev2.time);
    if (target_it.isAccessible() && target_it.pointer[1] instanceof HandMultiEvent) {
        target_it.pointer[1].events.push(ev2);
    } else {
        const target_ev = new HandMultiEvent<CatchEvent | ThrowEvent>({
            time: ev2.time,
            unit_time: ev2.unitTime,
            hand: ev2.hand,
            events: [ev2]
        });
        target.timeline.setElement(target_ev.time, target_ev);
    }
}

//TODO : Forbid in timeline a ball to "teleport from hand to hand" ?
//TODO : Instead of having rest depend unit time, make it depend on some constant (time independent from unit_time)
//TODO : timeline.add_event(event) so as not to pass event.time ?
//TODO : Function to add things to the timeline and handle collision ?
function put_on_table(ball: Ball, time: number, hand: Hand, table: Table, unit_time: number): void {
    const time_offset = unit_time / 3; //TODO : Pb if next event too close :/
    const ev = new TablePutEvent({
        time: time + time_offset,
        unit_time: unit_time,
        ball: ball,
        hand: hand,
        table: table
    });
    ball.timeline.setElement(ev.time, ev);
    hand.timeline.setElement(ev.time, ev);
}
function take_from_table(
    ball: Ball,
    time: number,
    hand: Hand,
    table: Table,
    unit_time: number
): void {
    const time_offset = unit_time / 3; //TODO : Pb if next event too close :/
    const ev = new TableTakeEvent({
        time: time + time_offset,
        unit_time: unit_time,
        ball: ball,
        hand: hand,
        table: table
    });
    ball.timeline.setElement(ev.time, ev);
    hand.timeline.setElement(ev.time, ev);
}

function exchange(ball: Ball, time: number, source: Hand, target: Hand, unit_time: number): void {
    lance(ball, time, 1, source, target, unit_time, false);
}

//TODO : Make it work with many balls of same sound ?
//TODO : Throw errors when ambiguous ?
function swap(
    start_time: number,
    end_time: number,
    balls_in: [Ball[], Ball[]],
    balls_out: [Ball[], Ball[]],
    juggler: Juggler,
    unit_time: number
) {
    const to_place: [Ball[], Ball[]] = [[], []];
    const to_take: [Ball[], Ball[]] = [[], []];
    const to_exchange: [Ball[], Ball[]] = [[], []];
    for (let i = 0; i < 2; i++) {
        for (const ball of balls_in[i]) {
            if (balls_out[i].includes(ball)) {
                continue;
            } else if (balls_out[(i + 1) % 2].includes(ball)) {
                to_exchange[i].push(ball);
            } else {
                to_place[i].push(ball);
            }
        }
        for (const ball of balls_out[i]) {
            if (balls_in[i].includes(ball)) {
                continue;
            } else if (balls_out[(i + 1) % 2].includes(ball)) {
                continue;
            } else {
                to_take[i].push(ball);
            }
        }
    }
    const nb_moves =
        to_exchange[0].length +
        to_exchange[1].length +
        to_place[0].length +
        to_place[1].length +
        to_take[0].length +
        to_take[1].length;
    const trans_time = Math.min((end_time - start_time) / (nb_moves + 1), 0.5);
    let i = 1;
    for (const ball of to_place[0]) {
        //TODO Offset time of put / take ?
        //TODO : Make it so both hands place at same time ?
        const time = start_time + (i + 1) * trans_time;
        put_on_table(ball, time, juggler.rightHand, juggler.defaultTable!, unit_time);
        i++;
    }
    for (const ball of to_place[1]) {
        //TODO Offset time of put / take ?
        const time = start_time + (i + 1) * trans_time;
        put_on_table(ball, time, juggler.leftHand, juggler.defaultTable!, unit_time);
        i++;
    }
    for (const ball of to_exchange[0]) {
        //TODO Offset time of put / take ?
        const time = start_time + (i + 1) * trans_time;
        exchange(ball, time, juggler.rightHand, juggler.leftHand, unit_time);
        i++;
    }
    for (const ball of to_exchange[1]) {
        //TODO Offset time of put / take ?
        const time = start_time + (i + 1) * trans_time;
        exchange(ball, time, juggler.leftHand, juggler.rightHand, unit_time);
        i++;
    }
    for (const ball of to_take[0]) {
        //TODO Offset time of put / take ?
        //TODO : Make it so both hands place at same time ?
        const time = start_time + (i + 1) * trans_time;
        take_from_table(ball, time, juggler.rightHand, juggler.defaultTable!, unit_time);
        i++;
    }
    for (const ball of to_take[1]) {
        //TODO Offset time of put / take ?
        const time = start_time + (i + 1) * trans_time;
        take_from_table(ball, time, juggler.leftHand, juggler.defaultTable!, unit_time);
        i++;
    }
}

// interface MagicCatch {
//     time: number;
//     to_juggler: Juggler;
//     notes: (Ball | string)[];
//     from_juggler?: Juggler;
//     to_hand?: "R" | "L";
//     // from_hand?: "R" | "L";
// }
// interface MagicNewInfo {
//     time: number;
//     juggler: Juggler;
//     hands?: [(Ball | string)[], (Ball | string)[]];
//     start_from?: "R" | "L"
// }
// // interface MagicNewHand {

// // }
// interface JugglerStatus {hands: [Ball[], Ball[]], last_time: number, last_hand_right: boolean}

// function isCatch(elem: MagicCatch | MagicNewInfo): elem is MagicCatch {
//     return elem.hasOwnProperty("notes");
// }

// function magic(music: (MagicCatch | MagicNewInfo)[], simulator: Simulator, starting_hand : "R" | "L"): void {
//     music.sort((a, b) => a.time - b.time);
//     const juggler_map = new Map<Juggler, JugglerStatus>();
//     for (const juggler of simulator.jugglers) {
//         juggler_map.set(juggler, {hands: [[], []], last_time: 0, last_hand_right: false});
//     }
//     for (const info of music) {
//         if (isCatch(info)) {
//             const time = info.time;
//             const to_juggler = info.to_juggler;
//             const from_juggler = info.from_juggler === undefined ? info.to_juggler : info.from_juggler;
//             let to_right_hand;
//             if (info.to_hand !== undefined) {
//                 to_right_hand = info.to_hand === "R";
//             } else {
//                 to_right_hand = juggler_map.get(to_juggler)?.last_hand_right
//                 if ((info.time - juggler_map.get(to_juggler)?.last_time) % 2 === 1) {
//                     to_right_hand = !to_right_hand;
//                 }
//             }
//             const notes: Ball[] = [];
//             for (const note of info.notes) {
//                 let ball: Ball;
//                 if (typeof note === "string") {

//                 } else {

//                 }
//             }
//         } else {
//             juggler_map.set(info.juggler, {hands: })
//         }
//     }
// }
