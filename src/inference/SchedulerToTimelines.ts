import Fraction from "fraction.js";
import { SymbolicEvent } from "./Scheduler";
import { HandTimeline } from "../model/timelines/HandTimeline";
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
export function convertHandToSpotIndices(hand: (string | undefined)[]): Map<string, number> {
    const ballsSpotIdxMap = new Map<string, number>();
    // Match each ball in hands to its spot number.
    for (let handIdx = 0; handIdx < hand.length; handIdx++) {
        const ball = hand[handIdx];
        if (ball === undefined) {
            continue;
        }
        ballsSpotIdxMap.set(ball, convertSpot(handIdx, hand.length));
    }
    return ballsSpotIdxMap;
}

// Note : this function should ONLY be used for endTime >= startTime >= the last
// ball event.
// Modifies the balls timelines directly.
function addEventsToCreateHeldState(
    startTime: number,
    endTime: number,
    trueSpots: [Map<string, number>, Map<string, number>],
    ballTimelines: Map<string, BallTimeline>
): void {
    // Choose t1 and t2 such that
    // - transition starts some time after t1.
    // - leaves some time before t2.
    // - doesn't take more than 0.3 to perform ball movements in hand.
    const t1 = startTime + Math.min(0.2, (1 / 5) * (endTime - startTime));
    const t2 = t1 + Math.min(0.3, (3 / 5) * (endTime - startTime));
    for (let handIdx = 0; handIdx < 2; handIdx++) {
        for (const [ball, spot] of trueSpots[handIdx]) {
            const ballTimeline = ballTimelines.get(ball)!;
            const prevBallEv = ballTimeline.rBegin().pointer[1];
            // Sanity check
            if (prevBallEv.location.type !== "held") {
                console.error("Shouldn't happen");
                continue;
            }
            if (prevBallEv.location.spotIdx === spot && prevBallEv.transition.type === "keep") {
                continue;
            }
            ballTimeline.addEvent(t1, {
                location: prevBallEv.location,
                transition: { type: "slideInHand" }
            });
            ballTimeline.addEvent(t2, {
                location: { ...prevBallEv.location, spotIdx: spot },
                transition: { type: "keep" }
            });
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
                ballTimelines.get(ballID)!.addEvent(initialTime, {
                    location: { type: "onTable", tableID, spot: spotName },
                    transition: { type: "keep" }
                });
            }
            for (const ballID of initialState.table.unknown.keys()) {
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
                const truePreHandSpots: [Map<string, number>, Map<string, number>] = [
                    convertHandToSpotIndices(ev.setupHands.preHandState[0]),
                    convertHandToSpotIndices(ev.setupHands.preHandState[1])
                ];
                const truePostHandSpots: [Map<string, number>, Map<string, number>] = [
                    convertHandToSpotIndices(ev.setupHands.postHandState[0]),
                    convertHandToSpotIndices(ev.setupHands.postHandState[1])
                ];

                for (let moveIdx = 0; moveIdx < ev.setupHands.moves.length; moveIdx++) {
                    const ball = ev.setupHands.moves[moveIdx];
                    if (ball.from.type === "held") {
                        if (ball.to.type === "held") {
                            if (ball.from.handIdx !== ball.to.handIdx) {
                                ballsToSwapHands[ball.from.handIdx].push(moveIdx);
                            } else if (
                                truePreHandSpots[ball.from.handIdx].get(ball.id) !==
                                truePostHandSpots[ball.to.handIdx].get(ball.id)
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
                    jugglerTimeline[handIdx].addEvent(prevTimelineTime + timePerMove, {
                        type: "swap"
                    });
                    // Handle this one here :)
                    jugglerTimeline[handIdx].addEvent(
                        prevTimelineTime + (nbMoves - 2) * timePerMove,
                        { type: "swap" }
                    );
                    // TODO : here or handle in sim ?
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
                                spotIdx: truePreHandSpots[ball.from.handIdx].get(ball.id)!
                            },
                            transition: { type: "ufo" }
                        };
                    } else {
                        // Sanity check
                        if (tableID === undefined) {
                            console.error("Shouldn't happen");
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
                    ballTimelines.get(ball.id)!.addEvent(moveStartTime, ballStartEv);

                    // Add to ball timeline the end of the transition.
                    let ballEndEv: BallEvent;
                    if (ball.to.type === "held") {
                        ballEndEv = {
                            location: {
                                type: "held",
                                jugglerName: jugglerName,
                                rightHand: ball.to.handIdx === 1,
                                spotIdx: truePostHandSpots[ball.to.handIdx].get(ball.id)!
                            },
                            transition: { type: "ufo" }
                        };
                    } else {
                        // Sanity check
                        if (tableID === undefined) {
                            console.error("Shouldn't happen");
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
                    ballTimelines.get(ball.id)!.addEvent(moveEndTime, ballEndEv);

                    // Add to juggler timeline its position for the transition.
                    jugglerTimeline[0].addEvent(moveStartTime, { type: "swap" });
                    jugglerTimeline[1].addEvent(moveStartTime, { type: "swap" });
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
                const truePreCatchHandSpots: [Map<string, number>, Map<string, number>] = [
                    convertHandToSpotIndices(ev.catches.preHandState[0]),
                    convertHandToSpotIndices(ev.catches.preHandState[1])
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
                    ballTimelines.get(cat.ballID)?.addEvent(evTime, {
                        location: {
                            type: "held",
                            jugglerName: cat.to.juggler,
                            rightHand: cat.to.handIdx === 1,
                            spotIdx: convertSpot(cat.to.spotIdx, ev.catches.preHandState.length)
                        },
                        transition: { type: "keep" },
                        sound: soundDescriptionToInstance(
                            ballIDToSound.get(cat.ballID)?.soundOnCatch
                        )
                    });
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
                const truePreCatchHandSpots: [Map<string, number>, Map<string, number>] = [
                    convertHandToSpotIndices(ev.tosses.preHandState[0]),
                    convertHandToSpotIndices(ev.tosses.preHandState[1])
                ];
                addEventsToCreateHeldState(evTime, tossTime, truePreCatchHandSpots, ballTimelines);

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
                    ballTimelines.get(toss.ballID)?.addEvent(tossTime, {
                        location: {
                            type: "held",
                            jugglerName: toss.from.juggler,
                            rightHand: toss.from.handIdx === 1,
                            spotIdx: convertSpot(toss.to.spotIdx, ev.tosses.preHandState.length)
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
                    jugglerTimelines.get(toss.from.juggler)![toss.from.handIdx].addEvent(evTime, {
                        type: "toss",
                        ballID: toss.ballID
                    });
                }
            }
        }
    }

    return { jugglers: jugglerTimelines, balls: ballTimelines };
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
