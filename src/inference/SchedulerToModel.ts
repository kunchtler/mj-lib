import Fraction from "fraction.js";
import { FracSortedList, SimulatorEvent, Hands } from "./Scheduler";
import { MusicBeatConverter, MusicTempo } from "./MusicBeatConverter";
import {
    CatchEvent,
    EventSound,
    TablePutEvent,
    TableTakeEvent,
    TossEvent
} from "../model/ModelTimelines";
import { OrderedSet } from "js-sdsl";
import { PerformanceModel } from "../model/PerformanceModel";
import { JugglerModel } from "../model/JugglerModel";
import { HandModel } from "../model/HandModel";
import { BallModel } from "../model/BallModel";
import { TableModel } from "../model/TableModel";

//TODO : In balls, rename "name" to "ID".
//TODO : Rename MusicBeatConverter to MusicConverter ?

export type PostSchedulerParams = {
    jugglers: Map<
        string,
        {
            table?: string;
            events: FracSortedList<SimulatorEvent<Fraction>>;
        }
    >;
    musicConverter: MusicBeatConverter;
    ballIDSounds: Map<
        string,
        {
            sound?: string;
            name: string;
            id: string;
            juggler: string;
        }
    >;
};

//TODO : Properly add support for sounds on balls, presence or absence of table, world info ?
export function schedulerToModel({
    jugglers,
    ballIDSounds,
    musicConverter
}: PostSchedulerParams): PerformanceModel {
    // 1. Create the differents elements of the model.
    const model = new PerformanceModel();
    for (const [jugglerName, { table }] of jugglers) {
        let tableModel: TableModel | undefined = undefined;
        if (table !== undefined) {
            tableModel = new TableModel({ name: table });
            model.tables.set(table, tableModel); //TODO : Customize.
        }
        model.jugglers.set(
            jugglerName,
            new JugglerModel({ defaultTable: tableModel, name: jugglerName })
        );
    }
    for (const [ballName, { name, id, juggler }] of ballIDSounds) {
        model.balls.set(
            ballName,
            new BallModel({ defaultJuggler: model.jugglers.get(juggler)!, id: id, name: name }) //TODO : Ajouter "sounds" ?
        ); //TODO : Params ?
    }

    // 2. Populate the model's timelines.
    const sortedEventsBeatsPerJuggler = eventsBeatList(jugglers);
    for (const [jugglerName, { events }] of jugglers) {
        const sortedEventsBeats = sortedEventsBeatsPerJuggler.get(jugglerName)!;
        const fromJuggler = model.jugglers.get(jugglerName)!;
        const fromTable = fromJuggler.defaultTable!;
        for (let evIdx = 0; evIdx < events.length; evIdx++) {
            const [beat, { tempo: tempoFrom, tosses, hands }] = events[evIdx];
            const fromMusicTempo = musicConverter.getTempo(beat);
            const fromUnitTime = jugglerUnitTime(tempoFrom, fromMusicTempo);
            const fromTime = musicConverter.convertBeatToRealTime(beat);
            // We simulate each toss.
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
                    ball: model.balls.get(toss.ball.id)!,
                    tossInfo: {
                        time: fromTime,
                        hand: fromJuggler.hands[toss.from.rightHand ? 1 : 0],
                        // sound: ballSounds.onToss,
                        unitTime: fromUnitTime
                    },
                    catchInfo: {
                        time: musicConverter.convertBeatToRealTime(toss.to.beat),
                        hand: model.jugglers.get(toss.to.juggler)!.hands[toss.to.rightHand ? 1 : 0],
                        // sound: ballSounds.onCatch,
                        sound: ballSounds,
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
                const oldHands: Hands<BallModel> = [[], []];
                const newHands: Hands<BallModel> = [[], []];
                for (let i = 0; i < 2; i++) {
                    for (const ball of hands.old[i]) {
                        oldHands[i].push(model.balls.get(ball.id)!);
                    }
                    for (const ball of hands.new[i]) {
                        newHands[i].push(model.balls.get(ball.id)!);
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
    return model;
}

function simulateToss({
    ball,
    tossInfo,
    catchInfo
}: {
    ball: BallModel;
    tossInfo: { time: Fraction; hand: HandModel; unitTime: Fraction; sound?: string | EventSound };
    catchInfo: { time: Fraction; hand: HandModel; unitTime: Fraction; sound?: string | EventSound };
    // ss_height: number,
}): void {
    // const time_offset = ss_height <= 1 ? unit_time / 3 : (unit_time * 7) / 10;
    const timeOffset = tossInfo.unitTime.mul("7/10"); //TODO
    const tossEv = new TossEvent({
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

//TODO : Differentiate the Ball from scheduler and from simulator;
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
    oldHands: Hands<BallModel>;
    newHands: Hands<BallModel>;
    juggler: JugglerModel;
    table: TableModel;
    unitTime: Fraction;
}) {
    // 1. Identify the different moves needed.
    const ballstoPutOnTable: Hands<BallModel> = [[], []];
    const ballstoTakeFromTable: Hands<BallModel> = [[], []];
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
    ball: BallModel;
    time: Fraction;
    hand: HandModel;
    table: TableModel;
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
    ball: BallModel;
    time: Fraction;
    hand: HandModel;
    table: TableModel;
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

//TODO : Document : returns a flatten event list for each juggler with only the times.
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
