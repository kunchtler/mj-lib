import Fraction from "fraction.js";
import { Hand } from "./Hand";
import { Juggler } from "./Juggler";
import { Simulator } from "./Simulator";
import { Table } from "./Table";
import { FracSortedList, SimulatorEvent, Hands } from "../inference/Scheduler";
import { MusicBeatConverter, MusicTempo } from "../inference/MusicBeatConverter";
import {
    CatchEvent,
    EventSound,
    TablePutEvent,
    TableTakeEvent,
    ThrowEvent
} from "./Timeline";
import { Ball } from "./Ball";
import { OrderedSet } from "js-sdsl";

//TODO : In balls, rename "name" to "ID".
//TODO : Rename MusicBeatConverter to MusicConverter ?

// function computeRealTime(
//     events: FracSortedList<SimulatorEvent<Fraction>>,
//     musicConverter: MusicBeatConverter
// ): FracSortedList<SimulatorEvent<Fraction>> {
//     const newEvents: FracSortedList<SimulatorEvent<Fraction>> = [];
//     for (const [beat, ev] of events) {
//         const newTosses: SimulatorToss<Fraction>[] = [];
//         for (const toss of ev.tosses) {
//             newTosses.push({
//                 from: { ...toss.from, beat: musicConverter.convertBeatToRealTime(toss.from.beat) },
//                 to: { ...toss.to, beat: musicConverter.convertBeatToRealTime(toss.to.beat) },
//                 ball: toss.ball
//             });
//         }
//         newEvents.push([
//             musicConverter.convertBeatToRealTime(beat),
//             { tempo: ev.tempo, tosses: newTosses }
//         ]);
//     }
//     return [];
// }

export function eventsBeatList(
    jugglers: Map<string, { events: FracSortedList<SimulatorEvent<Fraction>> }>
): Map<string, Fraction[]> {
    const beatsMap = new Map<string, Fraction[]>();
    for (const name of jugglers.keys()) {
        beatsMap.set(name, []);
    }
    for (const [name, { events }] of jugglers) {
        for (const [evBeat, { hands, tosses }] of events) {
            for (const toss of tosses) {
                beatsMap.get(toss.from.juggler)!.push(toss.from.beat);
                beatsMap.get(toss.to.juggler)!.push(toss.to.beat);
            }
            if (hands !== undefined) {
                beatsMap.get(name)!.push(evBeat);
            }
        }
    }
    const sortedBeatsMap = new Map<string, Fraction[]>();
    for (const [name, beats] of beatsMap) {
        const sortedBeats: Fraction[] = [];
        for (const beat of new OrderedSet(beats, (a, b) => a.compare(b))) {
            sortedBeats.push(beat);
        }
        sortedBeatsMap.set(name, sortedBeats);
    }
    return sortedBeatsMap;
}

//TODO : Fuse with timePerMeasure ?
function jugglerUnitTime(jugglerTempo: Fraction, musicTempo: MusicTempo): Fraction {
    return jugglerTempo.mul(new Fraction(60).div(musicTempo.bpm)).div(musicTempo.note);
}

export type SimulateParams = {
    simulator: Simulator;
    jugglers: Map<
        string,
        {
            events: FracSortedList<SimulatorEvent<Fraction>>;
        }
    >;
    musicConverter: MusicBeatConverter;
    ballIDSounds: Map<
        string,
        {
            onToss?: string | EventSound;
            onCatch?: string | EventSound;
        }
    >;
};

export function simulateEvents({
    simulator,
    jugglers,
    musicConverter,
    ballIDSounds
}: SimulateParams): void {
    const sortedEventsBeatsPerJuggler = eventsBeatList(jugglers);
    for (const [jugglerName, { events }] of jugglers) {
        const sortedEventsBeats = sortedEventsBeatsPerJuggler.get(jugglerName)!;
        const fromJuggler = simulator.jugglers.get(jugglerName)!;
        const fromTable = fromJuggler.defaultTable!;
        for (let evIdx = 0; evIdx < events.length; evIdx++) {
            const [beat, { tempo: tempoFrom, tosses, hands }] = events[evIdx];
            const fromMusicTempo = musicConverter.getTempo(beat);
            const fromUnitTime = jugglerUnitTime(tempoFrom, fromMusicTempo);
            const fromTime = musicConverter.convertBeatToRealTime(beat);
            // We simulate each toss...
            for (const toss of tosses) {
                const toMusicTempo = musicConverter.getTempo(toss.to.beat);
                const ballSounds = ballIDSounds.get(toss.ball.id)!;
                const toJuggler = jugglers.get(toss.to.juggler)!;
                let evIdx = toJuggler.events.findIndex((value) => value[0].gte(toss.to.beat));
                if (evIdx === -1) {
                    evIdx = toJuggler.events.length - 1;
                }
                const toTempo = toJuggler.events[evIdx][1].tempo;
                simulateToss({
                    ball: simulator.balls.get(toss.ball.id)!,
                    tossInfo: {
                        time: fromTime,
                        hand: fromJuggler.hands[toss.from.rightHand ? 1 : 0],
                        sound: ballSounds.onToss,
                        unitTime: fromUnitTime
                    },
                    catchInfo: {
                        time: musicConverter.convertBeatToRealTime(toss.to.beat),
                        hand: simulator.jugglers.get(toss.to.juggler)!.hands[
                            toss.to.rightHand ? 1 : 0
                        ],
                        sound: ballSounds.onCatch,
                        unitTime: jugglerUnitTime(toTempo, toMusicTempo)
                    }
                });
            }
            // And we simulate each hand change.
            // Except if it is the first event, as balls will already be in hands.
            if (hands !== undefined && evIdx !== 0) {
                //TODO : startTime could technicaly be move earlier is prevEvent only has tempo.
                // Note that indexOf won't return -1.
                const prevEvIdx = sortedEventsBeats.indexOf(beat) - 1;
                const startTime = prevEvIdx === -1 ? beat.sub(999) : sortedEventsBeats[prevEvIdx];
                const oldHands: Hands<Ball> = [[], []];
                const newHands: Hands<Ball> = [[], []];
                for (let i = 0; i < 2; i++) {
                    for (const ball of hands.old[i]) {
                        oldHands[i].push(simulator.balls.get(ball.id)!);
                    }
                    for (const ball of hands.new[i]) {
                        newHands[i].push(simulator.balls.get(ball.id)!);
                    }
                }
                changeHandsContents({
                    startTime: startTime,
                    endTime: beat,
                    oldHands: oldHands,
                    newHands: newHands,
                    juggler: fromJuggler,
                    table: fromTable,
                    unitTime: fromUnitTime
                });
            }
        }
    }
}

function simulateToss({
    ball,
    tossInfo,
    catchInfo
}: {
    ball: Ball;
    tossInfo: { time: Fraction; hand: Hand; unitTime: Fraction; sound?: string | EventSound };
    catchInfo: { time: Fraction; hand: Hand; unitTime: Fraction; sound?: string | EventSound };
    // ss_height: number,
}): void {
    // const time_offset = ss_height <= 1 ? unit_time / 3 : (unit_time * 7) / 10;
    const timeOffset = tossInfo.unitTime.mul("7/10"); //TODO
    const tossEv = new ThrowEvent({
        time: tossInfo.time.add(timeOffset).valueOf(),
        unitTime: tossInfo.unitTime.valueOf(),
        sound: tossInfo.sound,
        ball: ball,
        hand: tossInfo.hand
    });
    const catchEv = new CatchEvent({
        time: catchInfo.time.valueOf(),
        unitTime: catchInfo.unitTime.valueOf(),
        sound: catchInfo.sound,
        ball: ball,
        hand: catchInfo.hand
    });
    ball.timeline.addEvent(tossEv);
    ball.timeline.addEvent(catchEv);
    tossInfo.hand.timeline.addEvent(tossEv);
    catchInfo.hand.timeline.addEvent(catchEv);
}

//TODO : Differentiaite the Ball from scheduler and from simulator;
//TODO : Remove exchange hands ? Put / Take from table instead ?
function changeHandsContents({
    startTime,
    endTime,
    oldHands,
    newHands,
    juggler,
    table,
    unitTime
}: {
    startTime: Fraction;
    endTime: Fraction;
    oldHands: Hands<Ball>;
    newHands: Hands<Ball>;
    juggler: Juggler;
    table: Table;
    unitTime: Fraction;
}) {
    // 1. Identify the different moves needed.
    const ballstoPutOnTable: Hands<Ball> = [[], []];
    const ballstoTakeFromTable: Hands<Ball> = [[], []];
    // const ballstoSwapHands: Hands<Ball> = [[], []];
    for (let i = 0; i < 2; i++) {
        for (const ball of oldHands[i]) {
            if (!newHands[i].includes(ball)) {
                ballstoPutOnTable[i].push(ball);
            }
        }
        for (const ball of newHands[i]) {
            if (!oldHands[i].includes(ball)) {
                ballstoTakeFromTable[i].push(ball);
            }
        }
    }
    // 2. Simulate the moves.
    for (let i = 0; i < 2; i++) {
        // Compute the available time to perform those operations.
        const nbMoves = ballstoPutOnTable[i].length + ballstoTakeFromTable[i].length;
        let timePerMove = endTime.sub(startTime).div(nbMoves + 1);
        const maxTimePerMove = new Fraction("1/2");
        if (timePerMove.gt(maxTimePerMove)) {
            timePerMove = maxTimePerMove;
        }
        // And simulate the moves.
        let time = endTime.sub(timePerMove.mul(nbMoves));
        for (const ball of ballstoPutOnTable[i]) {
            putOnTable({
                ball: ball,
                time: time,
                hand: juggler.hands[i],
                table: table,
                unitTime: unitTime
            });
            time = time.add(timePerMove);
        }
        for (const ball of ballstoTakeFromTable[i]) {
            takeFromTable({
                ball: ball,
                time: time,
                hand: juggler.hands[i],
                table: table,
                unitTime: unitTime
            });
            time = time.add(timePerMove);
        }
    }
}

function putOnTable({
    ball,
    time,
    hand,
    table,
    unitTime
}: {
    ball: Ball;
    time: Fraction;
    hand: Hand;
    table: Table;
    unitTime: Fraction;
}): void {
    const timeOffset = unitTime.div(3); //TODO : Pb if next event too close :/
    const ev = new TablePutEvent({
        time: time.add(timeOffset).valueOf(),
        unitTime: unitTime.valueOf(),
        ball: ball,
        hand: hand,
        table: table
    });
    ball.timeline.addEvent(ev);
    hand.timeline.addEvent(ev);
}

function takeFromTable({
    ball,
    time,
    hand,
    table,
    unitTime
}: {
    ball: Ball;
    time: Fraction;
    hand: Hand;
    table: Table;
    unitTime: Fraction;
}): void {
    const timeOffset = unitTime.div(3); //TODO : Pb if next event too close :/
    const ev = new TableTakeEvent({
        time: time.add(timeOffset).valueOf(),
        unitTime: unitTime.valueOf(),
        ball: ball,
        hand: hand,
        table: table
    });
    ball.timeline.addEvent(ev);
    hand.timeline.addEvent(ev);
}

// function exchangeBallHands({
//     ball,
//     throwTime,
//     catchTime,
//     sourceHand,
//     targetHand,
//     unitTime
// }: {
//     ball: Ball;
//     throwTime: Fraction;
//     catchTime: Fraction;
//     sourceHand: Hand;
//     targetHand: Hand;
//     unitTime: Fraction;
// }): void {
//     toss({
//         ball,
//         throwTime,
//         catchTime,
//         sourceHand,
//         targetHand,
//         unitTime
//     });
// }
