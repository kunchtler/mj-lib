import Fraction from "fraction.js";
import { SymbolicEvent } from "./Scheduler";
import { HandEvent, HandTimeline } from "../model/timelines/HandTimeline";
import { BallEvent, BallTimeline } from "../model/timelines/BallTimeline";
import { BallSoundDescription } from "./PerformanceDescription";
import { GlobalBeatConverter } from "./GlobalBeatConverter";
import { LocalBeatConverter } from "./LocalBeatConverter";
import { HAND_MAX_TIME_FOR_ACTION } from "../model";

//TODO : Rename this file to SchedulerToTimeline.
//TODO : Rework MusicScoreConverter...

// export const MAX_TABLE_UNIT_TRANSITION_TIME = 0.5;
export const MAX_FLY_TIME_SS_HEIGHT_1 = 0.1;
export const MAX_UFO_TIME = 0.5;
export const MAX_BALL_SLIDE_IN_HAND_TIME = 0.3;
export const EPSILON = 0.000000000001;

export type PerformanceTimelines = {
    jugglers: Map<string, [HandTimeline, HandTimeline]>;
    balls: Map<string, BallTimeline>;
};

export function convertSpot(ballSpotIdx: number, handSize: number) {
    // Given the number of elements defined in the hand, in what spots the balls should go.
    // For instance, if one ball is held, it is held on spot 0.
    // But if there are two balls in hand, the soon-to-be-tossed in on spot 0, and the other on spot 2.
    // The way we see it is that the spot numbers on the right hand are positioned as so :
    //   _______
    //   |      |
    //   | 0    |  _
    //   |   1  | | |  and 3 on top of the three other balls.
    //   | 2    |_| |
    //   |___    ___|
    //       |   |
    //
    let handIdxToSpotIdx: number[];
    // In case the number of balls exceeds the number of spots defined (which is the case with > 4 balls),
    // We assign them all to the spot Idx of the variable below.
    const overflowSpotIdx = 3;
    if (handSize === 0) {
        return 0;
    } else if (handSize === 1) {
        handIdxToSpotIdx = [0];
    } else if (handSize === 2) {
        handIdxToSpotIdx = [2, 0];
    } else if (handSize === 3) {
        handIdxToSpotIdx = [2, 1, 0];
    } else {
        handIdxToSpotIdx = [2, 1, 0, 3];
    }

    return ballSpotIdx < handIdxToSpotIdx.length ? handIdxToSpotIdx[ballSpotIdx] : overflowSpotIdx;
}

// TODO : make it customizable with custom layouts, on a per juggler basis (should be added to juggler's definition)
export function tossOrderToTrueSpots(hand: (string | undefined)[]): string[][] {
    const newHand: string[][] = [];
    // Match each ball in hands to its spot number.
    for (let handIdx = 0; handIdx < hand.length; handIdx++) {
        const ball = hand[handIdx];
        if (ball === undefined) {
            continue;
        }
        const newSpot = convertSpot(handIdx, hand.length);
        // If the spot doesn't exist yet in the hand, create it.
        if (newSpot >= newHand.length) {
            for (let i = newHand.length; i <= newSpot; i++) {
                newHand.push([]);
            }
        }
        newHand[newSpot].push(ball);
    }
    return newHand;
}

function findBallIdx(trueHand: string[][], ballName: string): number | undefined {
    for (let spotIdx = 0; spotIdx < trueHand.length; spotIdx++) {
        for (const ball of trueHand[spotIdx]) {
            if (ball === ballName) {
                return spotIdx;
            }
        }
    }
    return undefined;
}

// Note : this function should ONLY be used for endTime >= startTime >= the last
// ball event.
// Modifies the balls timelines directly.
// TODO : Rework the timings ??? 
function addEventsToCreateHeldState(
    startTime: number,
    endTime: number,
    trueSpots: [string[][], string[][]],
    ballTimelines: Map<string, BallTimeline>
): void {
    // NOTE : THE FOLLOWING COMMENT IS NOT VALID ANYMORE.
    // Choose t1 and t2 such that
    // - transition starts some time after t1.
    // - leaves some time before t2.
    // - doesn't take more than 0.3 to perform ball movements in hand.
    // const t1 = startTime + Math.min(0.2, (1 / 5) * (endTime - startTime));
    // const t2 = t1 + Math.min(0.3, (3 / 5) * (endTime - startTime));
    const t1 = Math.max(endTime - 0.3, startTime);
    const t2 = endTime;
    for (let handIdx = 0; handIdx < 2; handIdx++) {
        for (let spotIdx = 0; spotIdx < trueSpots[handIdx].length; spotIdx++) {
            for (const ball of trueSpots[handIdx][spotIdx]) {
                const ballTimeline = ballTimelines.get(ball)!;
                const prevBallEv = ballTimeline.rBegin().pointer[1];
                // Sanity check
                if (prevBallEv.location.type !== "held") {
                    console.error("Shouldn't happen");
                    throw Error("Shouldn't happen.");
                    continue;
                }
                // The ball is already in the right place, and is not moving.
                if (
                    prevBallEv.location.spotIdx === spotIdx &&
                    prevBallEv.transition.type === "keep"
                ) {
                    continue;
                }
                // Have the ball start sliding from its old spot.
                ballTimeline.addEvent(t1, {
                    location: prevBallEv.location,
                    transition: { type: "slideInHand" }
                });
                // Have the ball arrive in its new spot and remain there.
                ballTimeline.addEvent(t2, {
                    location: { ...prevBallEv.location, spotIdx: spotIdx },
                    transition: { type: "keep" }
                });
            }
        }
    }
}

export type CreateModelTimelinesParams = {
    ballIDToSound: Map<
        string,
        { soundOnCatch?: BallSoundDescription; soundOnToss?: BallSoundDescription } | undefined
    >;
    jugglers: Map<
        string,
        {
            events: SymbolicEvent<Fraction>[];
            tableID?: string;
            localBeatConverter: LocalBeatConverter;
        }
    >;
    globalBeatConverter: GlobalBeatConverter;
};

export function createModelTimelines({
    jugglers,
    ballIDToSound,
    globalBeatConverter
}: CreateModelTimelinesParams): PerformanceTimelines {
    // TODO WHEN COMING BACK :
    // 1. Setup hands. Look what ball are swapped, remain in hand, go on table, are taken from table.
    // Compute the number of moves, and make them happen between the last time there ws an action.
    // And this beat.
    // Need to look for the true spotIdx in hand.
    // 2. Catch what need to be caught. ACTUALISER position des autres balles.
    // 3. Lancer les balles qu'il faut lancer. ACTUALISER position des autres balles.

    // 1st pass : compute the tosses and catches
    // Juggler : all times a ball is caught / received
    // 2nd pass : complete with in between time (compute )

    // Create blank timelines for balls and jugglers.
    const jugglerTimelines = new Map<string, [HandTimeline, HandTimeline]>();
    const ballTimelines = new Map<string, BallTimeline>();
    for (const jugglerName of jugglers.keys()) {
        jugglerTimelines.set(jugglerName, [new HandTimeline(), new HandTimeline()]);
    }
    for (const ballID of ballIDToSound.keys()) {
        ballTimelines.set(ballID, new BallTimeline());
    }

    // Handle the initial state ball's location.
    // The initial state is the state of the first event.
    // TODO : Give more time to setup hands at the beginning if needed.
    for (const [jugglerName, { events, tableID }] of jugglers) {
        if (events.length === 0) {
            continue;
        }
        const initialState = events[0].state;
        const initialTime = globalBeatConverter
            .convertAbsoluteBeatToSeconds(events[0].globalBeat)
            .valueOf();
        for (let handIdx = 0; handIdx < 2; handIdx++) {
            for (let ballIdx = 0; ballIdx < initialState.held[handIdx].length; ballIdx++) {
                const ballID = initialState.held[handIdx][ballIdx];
                // The ball is held, and should remain in its subspot.
                ballTimelines.get(ballID)!.addEvent(initialTime, {
                    location: {
                        type: "held",
                        jugglerName,
                        spotIdx: ballIdx,
                        rightHand: handIdx === 1
                    },
                    transition: { type: "keep" }
                });
            }
        }
        if (initialState.table !== undefined && tableID !== undefined) {
            for (const [spotName, ballID] of initialState.table.namedSpot) {
                // The ball is on the table (on a known spot)0 and shouldn't move.
                ballTimelines.get(ballID)!.addEvent(initialTime, {
                    location: { type: "onTable", tableID, spot: spotName },
                    transition: { type: "keep" }
                });
            }
            for (const ballID of initialState.table.unknown.keys()) {
                // The ball is on the table (on an unknown spot) and shouldn't move.
                ballTimelines.get(ballID)!.addEvent(initialTime, {
                    location: { type: "onTable", tableID, spot: null },
                    transition: { type: "keep" }
                });
            }
        }
    }

    // Populate each timeline.
    for (const [jugglerName, { events, tableID, localBeatConverter }] of jugglers) {
        for (let evIdx = 0; evIdx < events.length; evIdx++) {
            const ev = events[evIdx];
            const evTime = globalBeatConverter
                .convertAbsoluteBeatToSeconds(ev.globalBeat)
                .valueOf();
            const jugglerTimeline = jugglerTimelines.get(jugglerName)!;

            function getPrevHandTime(): number | null {
                const timelineLeftEnd = jugglerTimeline[0].rBegin();
                const timelineRightEnd = jugglerTimeline[1].rBegin();
                const prevTimelineTime = Math.max(
                    timelineLeftEnd.isAccessible() ? timelineLeftEnd.pointer[0] : -Infinity,
                    timelineRightEnd.isAccessible() ? timelineRightEnd.pointer[0] : -Infinity
                );
                return prevTimelineTime === -Infinity ? null : prevTimelineTime;
            }

            // if (ev.setupHands !== undefined) {
            //     // First, identify exactly what the target hand is. TODO.
            //     //
            // }

            // Search for the true hand position we should take so as to not have un-needed
            // hand ball spot movements.
            // for (let evIdx2 = evIdx; evIdx2 < symbolicTimeline.length; evIdx2++) {
            //     if (evIdx2 !== evIdx && symbolicTimeline[evIdx2].setupHands !== undefined) {
            //         lastHeldState = //Setup hands
            //         break;
            //     }
            //     if (symbolicTimeline[evIdx2].catches !== undefined) {
            //         lastHeldState = symbolicTimeline[evIdx2].catches!.preHandState;
            //         break;
            //     }
            //     if (symbolicTimeline[evIdx2].tosses !== undefined) {
            //         lastHeldState = symbolicTimeline[evIdx2].tosses!.preHandState;
            //         break;
            //     }
            // }

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

            if (ev.setupHands !== undefined) {
                const ballsToPutOnTable: [number[], number[]] = [[], []];
                const ballsToTakeFromTable: [number[], number[]] = [[], []];
                const ballsToMoveInHand: [number[], number[]] = [[], []];
                const ballsToSwapHands: [number[], number[]] = [[], []];

                // TODO : Better code structure / variable names to separate :
                // - the ball idx stored in a hand's state (from oldest to newest in hand)
                // - the spot idx in which the ball is, which depends on the amount of balls in the hand.
                const truePreHandSpots: [string[][], string[][]] = [
                    tossOrderToTrueSpots(ev.setupHands.preHandState[0]),
                    tossOrderToTrueSpots(ev.setupHands.preHandState[1])
                ];
                const truePostHandSpots: [string[][], string[][]] = [
                    tossOrderToTrueSpots(ev.setupHands.postHandState[0]),
                    tossOrderToTrueSpots(ev.setupHands.postHandState[1])
                ];

                for (let moveIdx = 0; moveIdx < ev.setupHands.moves.length; moveIdx++) {
                    const ball = ev.setupHands.moves[moveIdx];
                    if (ball.from.type === "held") {
                        if (ball.to.type === "held") {
                            if (ball.from.handIdx !== ball.to.handIdx) {
                                ballsToSwapHands[ball.from.handIdx].push(moveIdx);
                            } else if (
                                findBallIdx(truePreHandSpots[ball.from.handIdx], ball.id) !==
                                findBallIdx(truePostHandSpots[ball.to.handIdx], ball.id)
                            ) {
                                ballsToMoveInHand[ball.from.handIdx].push(moveIdx);
                            }
                        } else {
                            ballsToPutOnTable[ball.from.handIdx].push(moveIdx);
                        }
                    } else {
                        if (ball.to.type === "held") {
                            ballsToTakeFromTable[ball.to.handIdx].push(moveIdx);
                        } else {
                            console.warn("Hand setup not supported.");
                        }
                    }
                }

                // 2. Add hand movements to the timeline.
                // For now, I opted for a minimal approach : make hands go to a "ufo" spot.
                // Make balls ascend and then descend.
                const ballMovesIdx = [
                    ...ballsToPutOnTable[0],
                    ...ballsToPutOnTable[1],
                    ...ballsToTakeFromTable[0],
                    ...ballsToTakeFromTable[1],
                    ...ballsToMoveInHand[0],
                    ...ballsToMoveInHand[1],
                    ...ballsToSwapHands[0],
                    ...ballsToSwapHands[1]
                ];

                // Note : How many moves we have :
                // - 1 to have hands go to the swap spot.
                //   + during that time, we swap ball spots in hand to recreate correct hand setup.
                // - 1 to have hands pause.
                // - ballMovesIdx.length ufos.
                // - 1 to have hands pause.
                // - 1 to have hands go do what they should do.
                //   + for the next catch or toss, we swap ball spots to recreate prestate.
                const nbMoves = ballMovesIdx.length + 4;

                const prevTimelineTime = getPrevHandTime() ?? evTime - nbMoves * MAX_UFO_TIME;
                const availableTime = evTime - prevTimelineTime;
                const timePerMove = Math.min(availableTime / nbMoves, MAX_UFO_TIME);

                // Create the hands movements so they go on the spot.
                for (let handIdx = 0; handIdx < 2; handIdx++) {
                    // TODO : here or handle in sim ?
                    // The hand takes 1 move to go to the swap spot, and remains there.
                    jugglerTimeline[handIdx].addEvent(prevTimelineTime + timePerMove, {
                        type: "swap"
                    });
                    // Handle this one here :)
                    // TODO : USELESS ?
                    // jugglerTimeline[handIdx].addEvent(
                    //     prevTimelineTime + (nbMoves - 2) * timePerMove,
                    //     { type: "swap" }
                    // );
                    // TODO : here or handle in sim ?
                    // The hand remains on its swap spot until all balls have been moved,
                    // with a 1 move padding at the end.
                    jugglerTimeline[handIdx].addEvent(
                        prevTimelineTime + (nbMoves - 1) * timePerMove,
                        { type: "swap" }
                    );
                }

                // During that time, make sure the balls are in the correct spots.
                // Wait for some time after last event to move the ball.
                addEventsToCreateHeldState(
                    prevTimelineTime,
                    prevTimelineTime + timePerMove,
                    truePreHandSpots,
                    ballTimelines
                );

                // TODO : 1st transition for the hands.
                // TODO : Make sure we don't cut a ball transition (of postToss)

                //TODO : During the time where hands leave spot to go to next action, prepare balls for precatch.

                const startTime = prevTimelineTime + 2 * timePerMove;
                for (let i = 0; i < ballMovesIdx.length; i++) {
                    const moveStartTime = startTime + i * timePerMove;
                    const moveEndTime = startTime + (i + 1) * timePerMove;
                    const ball = ev.setupHands.moves[ballMovesIdx[i]];

                    // Add to ball timeline the beginning of the transition.
                    let ballStartEv: BallEvent;
                    if (ball.from.type === "held") {
                        ballStartEv = {
                            location: {
                                type: "held",
                                jugglerName: jugglerName,
                                rightHand: ball.from.handIdx === 1,
                                spotIdx: findBallIdx(truePreHandSpots[ball.from.handIdx], ball.id)!
                            },
                            transition: { type: "ufo" }
                        };
                    } else {
                        // Sanity check
                        if (tableID === undefined) {
                            console.error("Shouldn't happen");
                            throw Error("Shouldn't happen.");
                            continue;
                        }
                        ballStartEv = {
                            location: {
                                type: "onTable",
                                spot:
                                    ball.from.type === "onTableUnknownSpot"
                                        ? null
                                        : ball.from.spotName,
                                tableID: tableID
                            },
                            transition: { type: "ufo" }
                        };
                    }
                    // TODO : Document
                    ballTimelines.get(ball.id)!.addEvent(moveStartTime, ballStartEv);

                    // Add to ball timeline the end of the transition.
                    let ballEndEv: BallEvent;
                    if (ball.to.type === "held") {
                        ballEndEv = {
                            location: {
                                type: "held",
                                jugglerName: jugglerName,
                                rightHand: ball.to.handIdx === 1,
                                spotIdx: findBallIdx(truePostHandSpots[ball.to.handIdx], ball.id)!
                            },
                            transition: { type: "ufo" }
                        };
                    } else {
                        // Sanity check
                        if (tableID === undefined) {
                            console.error("Shouldn't happen");
                            throw Error("Shouldn't happen.");
                            continue;
                        }
                        ballEndEv = {
                            location: {
                                type: "onTable",
                                spot:
                                    ball.to.type === "onTableUnknownSpot" ? null : ball.to.spotName,
                                tableID: tableID
                            },
                            transition: { type: "keep" }
                        };
                    }
                    // TODO : Document
                    ballTimelines.get(ball.id)!.addEvent(moveEndTime, ballEndEv);

                    // Add to juggler timeline its position for the transition.
                    // TODO : Useless ?
                    // jugglerTimeline[0].addEvent(moveStartTime, { type: "swap" });
                    // jugglerTimeline[1].addEvent(moveStartTime, { type: "swap" });
                    // Sanity check
                    // let handIdx: number;
                    // if (ball.from.type === "held") {
                    //     handIdx = ball.from.handIdx;
                    // } else if (ball.to.type === "held") {
                    //     handIdx = ball.to.handIdx;
                    // } else {
                    //     console.error("Shouldn't happen");
                    //     continue;
                    // }
                    // jugglerTimeline[handIdx].addEvent(moveStartTime, {
                    //     type: "swap"
                    // });
                }
            }

            if (ev.catches !== undefined) {
                // Make sure balls are in the correct hand pos to perform catches.
                const truePreCatchHandSpots: [string[][], string[][]] = [
                    tossOrderToTrueSpots(ev.catches.preHandState[0]),
                    tossOrderToTrueSpots(ev.catches.preHandState[1])
                ];
                addEventsToCreateHeldState(
                    getPrevHandTime() ?? evTime - HAND_MAX_TIME_FOR_ACTION,
                    evTime,
                    truePreCatchHandSpots,
                    ballTimelines
                );

                // Add the catches to the timeline.
                for (const cat of ev.catches.info) {
                    // Catches happen exactly on beat.
                    // Sanity check
                    const ballSpot = convertSpot(
                        cat.to.spotIdx,
                        ev.catches.preHandState[cat.to.handIdx].length
                    );
                    if (
                        findBallIdx(
                            tossOrderToTrueSpots(ev.catches.postHandState[cat.to.handIdx]),
                            cat.ballID
                        ) !== ballSpot
                    ) {
                        console.error("Shouldn't happen.");
                        throw Error("Shouldn't happen.");
                    }
                    // The ball is caught in its new hand, and should remain there.
                    ballTimelines.get(cat.ballID)?.addEvent(evTime, {
                        location: {
                            type: "held",
                            jugglerName: cat.to.juggler,
                            rightHand: cat.to.handIdx === 1,
                            spotIdx: ballSpot
                        },
                        transition: { type: "keep" },
                        sound: soundDescriptionToInstance(
                            ballIDToSound.get(cat.ballID)?.soundOnCatch
                        )
                    });
                    // The juggler's hand moves to the catch spot. TODO : time for the hand to move.
                    // TODO : Document
                    jugglerTimelines.get(cat.to.juggler)![cat.to.handIdx].addEvent(evTime, {
                        type: "catch",
                        ballID: cat.ballID
                    });
                }
            }

            if (ev.tosses !== undefined) {
                // Tosses are delayed by some dwell time.
                // Take the first toss to determine by how much.
                let dwellTimeBeforeToss!: number;
                for (const toss of ev.tosses.info) {
                    const localBeat = localBeatConverter.convertGlobalBeatToLocalBeat(
                        ev.globalBeat
                    );
                    const unitTimeSeconds = localBeatConverter
                        .convertLocalBeatToSeconds(localBeat.add(1))
                        .sub(localBeatConverter.convertLocalBeatToSeconds(localBeat))
                        .valueOf();
                    if (toss.mode.type === "Height" && toss.mode.height === 1) {
                        const flyTime = Math.min(unitTimeSeconds * 0.3, MAX_FLY_TIME_SS_HEIGHT_1);
                        dwellTimeBeforeToss = unitTimeSeconds - flyTime;
                    } else {
                        dwellTimeBeforeToss = unitTimeSeconds * 0.7;
                    }
                    break;
                }
                const tossTime = evTime + dwellTimeBeforeToss;

                // Make sure balls are in the correct hand pos to perform catches.
                const truePreTossHandSpots: [string[][], string[][]] = [
                    tossOrderToTrueSpots(ev.tosses.preHandState[0]),
                    tossOrderToTrueSpots(ev.tosses.preHandState[1])
                ];
                addEventsToCreateHeldState(evTime, tossTime, truePreTossHandSpots, ballTimelines);

                // Compute dwell times for a toss.
                // x----DwellToss----x-----------Airtime-----------x----DwellCatch----x
                // ^                 ^                             ^                  ^
                // theoretic toss    real toss            real catch    theoretic catch
                // Reason for catches happening before tosses on a beat : if we do 11111...
                // We need to catche the ball to be able to toss it.
                // Note : the fly time constraints on SS 1 height tosses are computed here,
                // but the other time constraints (no hand movement too slow) are currently
                // computed at simulation time. Maybe this should be moved here, in a pre-computation
                // step ? TODO ? Or everything at simulation time ?
                // Add the catches to the timeline.
                for (const toss of ev.tosses.info) {
                    const ballSpot = convertSpot(
                        toss.from.spotIdx,
                        ev.tosses.preHandState[toss.from.handIdx].length
                    );
                    if (
                        findBallIdx(truePreTossHandSpots[toss.from.handIdx], toss.ballID) !==
                        ballSpot
                    ) {
                        console.error("Shouldn't happen.");
                        throw Error("Shouldn't happen.");
                    }
                    // The ball is tossed to its new hand, and should remain there.
                    ballTimelines.get(toss.ballID)?.addEvent(tossTime, {
                        location: {
                            type: "held",
                            jugglerName: toss.from.juggler,
                            rightHand: toss.from.handIdx === 1,
                            spotIdx: ballSpot
                        },
                        transition: {
                            type: "airborne",
                            siteswapHeight:
                                toss.mode.type === "Height" ? toss.mode.height : undefined
                        },
                        sound: soundDescriptionToInstance(
                            ballIDToSound.get(toss.ballID)?.soundOnToss
                        )
                    });
                    // TODO : Document.
                    jugglerTimelines.get(toss.from.juggler)![toss.from.handIdx].addEvent(tossTime, {
                        type: "toss",
                        ballID: toss.ballID
                    });
                }
            }
        }
    }

    // Add rest state to jugglers if needed at the beginning / end.
    for (const [, handTimelines] of jugglerTimelines) {
        for (const handTimeline of handTimelines) {
            if (handTimeline.size() === 0) {
                // Add a single rest state.
                // TODO
            } else {
                // Check there is a rest event at the begninning and end of the timelines.
                const [startTime, startEv] = handTimeline.begin().pointer;
                if (!isHandEventValidRest(startEv)) {
                    handTimeline.addEvent(startTime - HAND_MAX_TIME_FOR_ACTION, { type: "rest" });
                }
                const [endTime, endEv] = handTimeline.rBegin().pointer;
                if (!isHandEventValidRest(endEv)) {
                    handTimeline.addEvent(endTime + HAND_MAX_TIME_FOR_ACTION, { type: "rest" });
                }
            }
        }
    }

    // Go again through the timelines to handle transitions that would be too long.
    // For balls :
    // - if it slides for too long.
    // For jugglers :
    // - if there is too much time between two consecutive moves, go to the rest spot.
    for (const [, handTimelines] of jugglerTimelines) {
        for (const handTimeline of handTimelines) {
            if (handTimeline.size() < 2) {
                // Return early.
                break;
            }
            // We iterate on a copy of the timeline to add to it without affecting the iterator.
            const itCopy = new HandTimeline({ container: [...handTimeline] }).begin().next();
            while (itCopy.isAccessible()) {
                const [prevTime, prevEv] = itCopy.pre().pointer;
                const [nextTime, nextEv] = itCopy.next().pointer;
                if (
                    nextTime - prevTime > HAND_MAX_TIME_FOR_ACTION &&
                    !(isHandEventValidRest(prevEv) && isHandEventValidRest(nextEv)) &&
                    !(isHandEventValidSwap(prevEv) && isHandEventValidSwap(nextEv))
                ) {
                    // If the difference between the prev and next time, is really short,
                    // we don't want the hand go the rest spot and immediately leave.
                    // Hence, we divide nextTime - prevTime by 3 and not by 2.
                    const moveTime = Math.min((nextTime - prevTime) / 3, HAND_MAX_TIME_FOR_ACTION);
                    handTimeline.addEvent(prevTime + moveTime, { type: "rest" });
                    handTimeline.addEvent(nextTime - moveTime, { type: "rest" });
                }
                // Move the iterator one step forward.
                itCopy.next();
            }
        }
    }

    // Repass through the timelines, and filter any time there are three "rest"s or "swap"s in a row.
    for (const [, handTimelines] of jugglerTimelines) {
        for (const handTimeline of handTimelines) {
            if (handTimeline.size() < 3) {
                // No need to keep going.
                break;
            }
            // We iterate on a copy of the timeline to add to it without affecting the iterator.
            const itCopy = new HandTimeline({ container: [...handTimeline] }).begin().next().next();
            while (itCopy.isAccessible()) {
                const ev1 = itCopy.pre().pre().pointer[1];
                const [time2, ev2] = itCopy.next().pointer;
                const ev3 = itCopy.next().pointer[1];
                if (
                    (isHandEventValidRest(ev1) &&
                        isHandEventValidRest(ev2) &&
                        isHandEventValidRest(ev3)) ||
                    (isHandEventValidSwap(ev1) &&
                        isHandEventValidSwap(ev2) &&
                        isHandEventValidSwap(ev3))
                ) {
                    // Three events follow each other with rest or swap. Delete the middle one.
                    handTimeline.deleteEvent(time2);
                }
                // Move the iterator one step forward.
                itCopy.next();
            }
        }
    }

    // TODO : Handle intial state for balls only at the end.
    // TODO : Handle final state for balls only at the end.
    // TODO : Filter useless ball events.
    // TODO : Set time limits on ball transitions on ball events.

    ballTimelines.forEach((timeline, ballID) => {
        console.log(`${ballID} :\n${timeline.stringify(undefined, JSON.stringify)}`);
    });
    jugglerTimelines.forEach((timeline, name) => {
        console.log(
            `${name} Left :\n${timeline[0].stringify(undefined, JSON.stringify)}\n${name} Right :\n${timeline[1].stringify(undefined, JSON.stringify)}`
        );
    });

    return { jugglers: jugglerTimelines, balls: ballTimelines };
}

export function isHandEventValid(ev: HandEvent[]): boolean {
    // The only valid events are :
    // - the multi event is made only of 1 swap event.
    // - the multi event is made only of 1 rest event.
    // - the multi event is made only of catches and tosses.
    return isHandEventValidTossCatch(ev) || isHandEventValidRest(ev) || isHandEventValidSwap(ev);
}

export function isHandEventValidRest(ev: HandEvent[]) {
    return ev.length === 1 && ev[0].type === "rest";
}

export function isHandEventValidSwap(ev: HandEvent[]) {
    return ev.length === 1 && ev[0].type === "swap";
}

export function isHandEventValidTossCatch(ev: HandEvent[]) {
    if (ev.length === 0) {
        return false;
    }
    for (const singleEv of ev) {
        if (singleEv.type !== "catch" && singleEv.type !== "toss") {
            return false;
        }
    }
    return true;
}

function soundDescriptionToInstance(soundDescription: BallSoundDescription | undefined) {
    if (soundDescription === undefined) {
        return undefined;
    }
    return {
        name:
            typeof soundDescription.name === "string"
                ? soundDescription.name
                : soundDescription.name[Math.floor(Math.random() * soundDescription.name.length)],
        loop: soundDescription.loop ?? false
    };
}
