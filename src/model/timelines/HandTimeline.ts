import { MultiTimeline } from "../../utils/Timeline";

// export type SoundSpec = {
//     ballID: string;
//     sound: { name: string; loop?: string };
//     stopPreviousSounds: boolean;
// };

export type TossHandEvent = {
    type: "toss";
    ballID: string;
    // handSpotIdx?: number; // Not needed ? Should ask the ball !
};

export type CatchHandEvent = {
    type: "catch";
    ballID: string;
    // handSpotIdx?: number; // Not needed ! Should ask the ball !
    // posIdx: number;
};

export type RestHandEvent = {
    type: "rest";
};

// export type TableHandEvent = {
//     type: "table";
//     ballID: string;
//     // handSpotIdx?: number; // Not needed
//     // tableID: string; // Not needed
//     // tableSpot?: string; // Not needed
// };

// export type BallSlideHandEvent = {
//     type: "slide";
//     ballID: string;
//     fromPosIdx: number;
//     toPosIdx: number;
// }

export type BallSwapHandEvent = {
    type: "swap";
    // ballID: string;
    // handSpotIdx: number;
    // isGivingHand: boolean;
};

export type HandEvent = TossHandEvent | CatchHandEvent | BallSwapHandEvent | RestHandEvent;

export class HandTimeline extends MultiTimeline<number, HandEvent> {}

/**
 * Checks if a multi-event makes sense, that is to say the only multi-events
 * allowed are :
 * - throwing / catching any number of balls.
 * - putting a single ball on the table.
 * - taking a single ball from the table.
 * @param multiEv the multi-event to check.
 * @returns true if the aforementioned conditions are satisfied.
 */
// export function isMultiEventSane(multiEv: HandEvent[]): boolean {
//     let nbCatch = 0;
//     let nbToss = 0;
//     let nbTableTake = 0;
//     let nbTablePut = 0;
//     for (const ev of multiEv) {
//         if (ev instanceof CatchEvent) {
//             nbCatch++;
//         } else if (ev instanceof TossEvent) {
//             nbToss++;
//         } else if (ev instanceof TableTakeEvent) {
//             nbTableTake++;
//         } else {
//             nbTablePut++;
//         }
//     }
//     const sum = nbCatch + nbToss + nbTablePut + nbTableTake;
//     return sum === nbCatch + nbToss || sum === 1;
// }

// export type HandState = (string | undefined)[];

// export function handStateDiff(
//     state1: HandState,
//     state2: HandState
// ): { ballID: string; fromIdx: number; toIdx: number }[] {
//     const diff: { ballID: string; fromIdx: number; toIdx: number }[] = [];
//     for (let fromIdx = 0; fromIdx < state1.length; fromIdx++) {
//         const ballID = state1[fromIdx];
//         if (ballID === undefined) {
//             continue;
//         }
//         const toIdx = state2.findIndex((ballID2) => ballID2 === ballID);
//         if (toIdx !== fromIdx) {
//             diff.push({ ballID, fromIdx, toIdx });
//         }
//     }
//     return diff;
// }
