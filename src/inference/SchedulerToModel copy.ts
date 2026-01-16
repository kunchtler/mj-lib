import Fraction from "fraction.js";
import { Hands, JugglerState, PartialHeldState, SymbolicEvent } from "./Scheduler";
import { ScoreConverter, MusicTempo } from "./ScoreConverter";
import {
    CatchEvent,
    EventSound,
    TablePutEvent,
    TableTakeEvent,
    TossEvent
} from "../model/timelines/TimelineEvents";
import { OrderedSet } from "js-sdsl";
import { PerformanceModel } from "../model/PerformanceModel";
import { JugglerModel } from "../model/JugglerModel";
import { HandModel } from "../model/HandModel";
import { BallModel } from "../model/BallModel";
import { TableModel } from "../model/TableModel";
import { HandTimeline } from "../model/timelines/HandTimeline";
import { BallTimeline, HeldBallEvent } from "../model/timelines/BallTimeline";

//TODO : Rename this file to SchedulerToTimeline.
//TODO : Rework MusicScoreConverter...

export const MAX_TABLE_UNIT_TRANSITION_TIME = 0.5;
export const MAX_TIME_SS_HEIGHT_1 = 0.25;

export type PostSchedulerParams = {
    jugglers: Map<
        string,
        {
            table?: string;
            initialHeldState: [string[], string[]];
            events: SymbolicEvent<Fraction>[];
        }
    >;
    musicConverter: ScoreConverter;
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

export type PerformanceTimelines = {
    jugglers: Map<string, [HandTimeline, HandTimeline]>;
    balls: Map<string, BallTimeline>;
};

export function createModelTimelines({
    jugglers,
    ballIDs,
    scoreConverter
}: {
    ballIDs: Set<string>;
    jugglers: Map<string, { timeline: SymbolicEvent<Fraction>[]; tableID?: string }>;
    scoreConverter: ScoreConverter;
}): PerformanceTimelines {
    // Create blank timelines for balls and jugglers.
    const jugglerTimelines = new Map<string, [HandTimeline, HandTimeline]>();
    const ballTimelines = new Map<string, BallTimeline>();
    for (const jugglerName of jugglers.keys()) {
        jugglerTimelines.set(jugglerName, [new HandTimeline(), new HandTimeline()]);
    }
    for (const ballID of ballIDs.keys()) {
        ballTimelines.set(ballID, new BallTimeline());
    }

    // Handle the initial state ball's location.
    // The initial state is the state of the first event.
    for (const [jugglerName, { timeline: symbolicTimeline, tableID }] of jugglers) {
        if (symbolicTimeline.length === 0) {
            continue;
        }
        const initialState = symbolicTimeline[0].state;
        const initialTime = scoreConverter
            .convertBeatToRealTime(symbolicTimeline[0].beat)
            .valueOf();
        for (let handIdx = 0; handIdx < 2; handIdx++) {
            for (let ballIdx = 0; ballIdx < initialState.held[handIdx].length; ballIdx++) {
                const ballID = initialState.held[handIdx][ballIdx];
                ballTimelines.get(ballID)!.addEvent(initialTime, {
                    type: "held",
                    jugglerName,
                    handPosIdx: ballIdx,
                    rightHand: handIdx === 1
                });
            }
        }
        if (initialState.table !== undefined && tableID !== undefined) {
            for (let [spotName, ballID] of initialState.table.namedSpot) {
                ballTimelines
                    .get(ballID)!
                    .addEvent(initialTime, { type: "table", tableID, tableSpot: spotName });
            }
            for (let [spotName, ballID] of initialState.table.unknown) {
                ballTimelines
                    .get(ballID)!
                    .addEvent(initialTime, { type: "table", tableID, tableSpot: undefined });
            }
        }
    }

    // Populate each timeline.
    for (const [jugglerName, { timeline: symbolicTimeline, tableID }] of jugglers) {
        for (let evIdx = 0; evIdx < symbolicTimeline.length; evIdx++) {
            const ev = symbolicTimeline[evIdx];
            console.log(evIdx);
            const evTime = scoreConverter.convertBeatToRealTime(ev.beat).valueOf();
            const jugglerTimeline = jugglerTimelines.get(jugglerName)!
            let lastHeldState: PartialHeldState | undefined = undefined;
            let lastTime: number;

            if (ev.setupHands !== undefined) {
                // First, identify exactly what the target hand is. TODO.
                // 
            }

            // Search for the true hand position we should take so as to not have un-needed
            // hand ball spot movements.
            for (let evIdx2 = evIdx; evIdx2 < symbolicTimeline.length; evIdx2++) {
                if (evIdx2 !== evIdx && symbolicTimeline[evIdx2].setupHands !== undefined) {
                    lastHeldState = //Setup hands
                    break;
                }
                if (symbolicTimeline[evIdx2].catches !== undefined) {
                    lastHeldState = symbolicTimeline[evIdx2].catches!.preHandState;
                    break;
                }
                if (symbolicTimeline[evIdx2].tosses !== undefined) {
                    lastHeldState = symbolicTimeline[evIdx2].tosses!.preHandState;
                    break;
                }
            }


            // Order of events after a previous toss :
            // - the post toss (if needed)
            // - the hands setup part (take balls, exchange).
            // - 
            // - the pre catch (if needed)
            // - some time to move to the catch spot.
            // - during the dwell time, the post catch -> pre toss
            //

            // TODO : In converting real time, NEED TO USE SCORE CONVERTER
            // TODO : Change this to truly have hand exchanges, ... by adding events ?
            // FOR NOW, if we exchange a ball hands, we put it on random table spot and retrieve it later.
            // Have somthing ebetter later with proper exchange.
            // TODO : Handle hand subposition.
            // TODO : Rework OnNamed/Unamed spot for loc, and instead have the spot be null or undefined ?
            // 1. Identify the different moves n0eeded by hand.

            const ballsToPutOnTable: [
                { ballID: string; spotName?: string }[],
                { ballID: string; spotName?: string }[]
            ] = [[], []];
            const ballsToTakeFromTable: [{ ballID: string; spotName?: string }[], { ballID: string; spotName?: string }[]] = [[], []];
            const ballsToMoveInHand: [{ballID: string; spotIdx: number}[], {ballID: string; spotIdx: number}[]] = [[], []];
            const ballsToSwapHands: [{ballID: string; spotIdx: number}[], {ballID: string; spotIdx: number}[]] = [[], []];
            for (const ball of ev.setupHands ?? []) {
                if (ball.from.type === "held") {
                    if (ball.to.type === "held") {
                        if (ball.from.handIdx !== ball.to.handIdx) {
                            ballsToPutOnTable[ball.from.handIdx].push({
                                ballID: ball.id,
                                spot: undefined
                            });
                            ballsToTakeFromTable[ball.to.handIdx].push({ ballID: ball.id });
                        }
                    } else if (ball.to.type === "onTableSpot") {
                        ballsToPutOnTable[ball.from.handIdx].push({
                            ballID: ball.id,
                            spot: ball.to.spotName
                        });
                    } else {
                        ballsToPutOnTable[ball.from.handIdx].push({
                            ballID: ball.id,
                            spot: undefined
                        });
                    }
                } else if (ball.from.type === "onTableSpot") {
                    if (ball.to.type === "held") {
                        ballsToTakeFromTable[ball.to.handIdx].push({ ballID: ball.id });
                    } else {
                        console.warn("Hand setup not supported.");
                    }
                } else {
                    if (ball.to.type === "held") {
                        ballsToTakeFromTable[ball.to.handIdx].push({ ballID: ball.id });
                    } else {
                        console.warn("Hand setup not supported.");
                    }
                }
            }

            // 2. Simulate the moves.
            const nbMovesPutOrTake = Math.max(ballsToPutOnTable[0].length + ballsToTakeFromTable[0].length, ballsToPutOnTable[1].length + ballsToTakeFromTable[1].length);
            const nbMovesExchange = ballsToSwapHands[0].length + ballsToSwapHands[1].length;
            const nbMovesChangeHandSpot = ballsToSwapHands[0].length > 0 || ballsToSwapHands[1].length > 0 ? 1 : 0;
            const nbMoveToCatchOrToss = ev.tosses !== undefined || ev.catches !== undefined ? 1 : 0;

            const nbTotalMoves = 1 + nbMovesPutOrTake + nbMovesExchange + nbMovesChangeHandSpot + nbMoveToCatchOrToss
            const totalTime = evTime - lastTime;

            const timePerMove = Math.min(totalTime / (nbTotalMoves - 1), MAX_TABLE_UNIT_TRANSITION_TIME);
            
            let moveIdx: number;
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                // And simulate the moves.
                moveIdx = 1;
                for (const {ballID, spotName} of ballsToPutOnTable[handIdx]) {
                    const moveTime = evTime + moveIdx * timePerMove
                    ballTimelines.get(ballID)!.addEvent(moveTime, {type: "table", tableID, tableSpot: spotName});
                    jugglerTimeline[handIdx].addEvent(moveTime, {type: "table", ballID, handSpotIdx, tableID, tableSpot: spotName});
                    moveIdx++;
                }
                for (const {ballID, spotName} of ballsToTakeFromTable[handIdx]) {
                    const moveTime = evTime + moveIdx * timePerMove
                    ballTimelines.get(ballID)!.addEvent(moveTime, {type: "held", jugglerName, handPosIdx: posIdx, rightHand: handIdx === 1});
                    jugglerTimeline[handIdx].addEvent(moveTime, {type: "table", ballID, handSpotIdx, tableID, tableSpot: spotName});
                    moveIdx++;
                }
                for (const {} of ballsToSwapHands[handIdx]) {
                    
                }
            }
            
            moveIdx = 1 + nbMovesPutOrTake; // To sync both hands for what follows.
            for (let handIdx = 0; handIdx < 2; handIdx++) {
                for (const {ballID, spotIdx} of ballsToSwapHands[handIdx]) {
                    const moveTime = evTime + moveIdx * timePerMove
                    ballTimelines.get(ballID)!.addEvent(moveTime, {type: "held", jugglerName, handPosIdx: spotIdx, rightHand: !(handIdx === 1)});
                    
                    moveIdx++;
                }
            }

            // Simulate toss.
            if (ev.tosses !== undefined) {
                for (const {ballID, handIdx, posIdx} of ballChangesInHands(lastHeldState, ev.tosses.preHandState)) {
                    
                }
                ev.tosses.postHandState;
                for (const toss of ev.tosses.info) {
                    //TODO : Sounds ????
                    ballTimelines.get(toss.ballID)!.addEvent(evTime, {
                        type: "airborne",
                        siteswapHeight: toss.mode.type === "Height" ? toss.mode.height : undefined
                    });
                    jugglerTimelines.get(toss.to.juggler)![toss.from.handIdx].addEvent(evTime, {
                        type: "toss",
                        ballID: toss.ballID,
                        handSpotIdx: toss.from.ballIdx
                    });
                }
            }

            if (ev.catches !== undefined) {
                if (!areHeldStateEqual(lastHeldState, ev.catches.preHandState)) {
                }
                ev.catches.preHandState;
                for (const toss of ev.catches.info) {
                    //TODO : Sounds ????
                    ballTimelines.get(toss.ballID)!.addEvent(evTime, {
                        type: "held",
                        jugglerName: toss.to.juggler,
                        handPosIdx: toss.to.ballIdx,
                        rightHand: toss.to.handIdx === 1
                    });
                    jugglerTimelines.get(toss.to.juggler)![toss.to.handIdx].addEvent(evTime, {
                        type: "catch",
                        ballID: toss.ballID,
                        handSpotIdx: toss.to.ballIdx
                    });
                }

                lastHeldState = ev.catches.postHandState;
            }

            for (const toss of ev.tosses) {
                // Compute dwell times for a toss.
                // x----DwellToss----x-----------Airtime-----------x----DwellCatch----x
                // ^                 ^                             ^                  ^
                // theoretic toss    real toss            real catch    theoretic catch
                let dwellTimeBeforeToss: number;
                // The toss happens on beat.
                const dwellTimeAfterCatch = 0;
                if (toss.mode.type === "Height") {
                    if (toss.mode.height === 1) {
                        dwellTimeBeforeToss = Math.min(
                            ev.tempo.valueOf() * 0.5,
                            MAX_TIME_SS_HEIGHT_1
                        );
                    } else {
                        dwellTimeBeforeToss = Math.min(ev.tempo.valueOf() * 0.7);
                    }
                } else {
                    dwellTimeBeforeToss = Math.min(ev.tempo.valueOf() * 0.7);
                }

                // Create and add toss / catch events.
                const tossEv = new TossEvent({
                    time: toss.from.beat.valueOf() + dwellTimeBeforeToss,
                    ballID: toss.ballID,
                    jugglerName: toss.from.juggler,
                    isRightHand: toss.from.handIdx === 1,
                    handSubIdx: toss.from.ballIdx,
                    siteswapHeight: toss.mode.type === "Height" ? toss.mode.height : undefined,
                    sound: undefined //TODO
                    // TODO Add dwell field. Organised as "info" and READONLY??
                });
                const catchEv = new CatchEvent({
                    time: toss.to.beat.valueOf() - dwellTimeAfterCatch,
                    ballID: toss.ballID,
                    jugglerName: toss.to.juggler,
                    isRightHand: toss.to.handIdx === 1,
                    handSubIdx: toss.to.ballIdx,
                    siteswapHeight: toss.mode.type === "Height" ? toss.mode.height : undefined, //TODO : Remove this field.
                    //TODO : Add dwell field or useless ???
                    sound: undefined //TODO
                });
                const ballTimeline = ballTimelines.get(toss.ballID)!;
                const tossHandTimeline = jugglerTimelines.get(toss.from.juggler)![
                    toss.from.handIdx
                ];
                const catchHandTimeline = jugglerTimelines.get(toss.to.juggler)![toss.to.handIdx];
                ballTimeline.addEvent(tossEv);
                ballTimeline.addEvent(catchEv);
                tossHandTimeline.addEvent(tossEv);
                catchHandTimeline.addEvent(catchEv);
            }
        }
    }

    return { jugglers: jugglerTimelines, balls: ballTimelines };
}

export function createModels({}: { timelines: PerformanceTimelines }) {}

export function areHeldStateEqual(state1: PartialHeldState, state2: PartialHeldState): boolean {
    if (state1[0].length !== state2[0].length || state1[1].length !== state2[1].length) {
        return false;
    }
    for (let handIdx = 0; handIdx < 2; handIdx++) {
        for (let ballIdx = 0; ballIdx < state1[handIdx].length; ballIdx++) {
            if (state1[handIdx][ballIdx] !== state2[handIdx][ballIdx]) {
                return false;
            }
        }
    }
    return true;
}

// Returns only the balls that changed hand subspot
// Parameter constraint : they must have exactly the same balls, but in different positions.
export function ballChangesInHands(
    oldState: PartialHeldState,
    newState: PartialHeldState
): {ballID: string; handIdx: number; posIdx: number}[] {
    const ballChanges: {ballID: string; handIdx: number; posIdx: number}[] = [];
    for (let handIdx = 0; handIdx < 2; handIdx++) {
        for (let posIdx = 0; posIdx < oldState[handIdx].length; posIdx++) {
            const ballID = oldState[handIdx][posIdx];
            if ((oldState[handIdx].length !== newState[handIdx].length || oldState[handIdx][posIdx] !== newState[handIdx][posIdx]) && ballID !== undefined) {
                // If hand size has changed, or if the ball is different, record the change.
                ballChanges.push({ballID, handIdx, posIdx});
            }
        }
    }
    return ballChanges;
}

//TODO : Properly add support for sounds on balls, presence or absence of table, world info ?
export function simulateEvents({
    jugglers,
    ballIDSounds,
    musicConverter
}: PostSchedulerParams): PerformanceModel {
    // 1. Create the differents elements of the model.
    const model = new PerformanceModel();
    for (const [jugglerName, { table }] of jugglers) {
        let tableModel: TableModel | undefined = undefined;
        if (table !== undefined) {
            tableModel = new TableModel({ id: table });
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

function computeDwellTime() {}
function simulateToss(): void {}

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

function putOnTable() {}
function takeFromTable() {}

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
    return jugglerTempo.mul(new Fraction(60).div(musicTempo.notesPerMinute)).div(musicTempo.noteDuration);
}
