export type SoundSpec = {
    ballID: string;
    sound: { name: string; loop?: string };
    stopPreviousSounds: boolean;
};

export type BaseHandEvent = {};

export type TossHandEvent = {
    type: "toss";
    ballID: string;
    posIdx: number;
};

export type CatchHandEvent = {
    type: "catch";
    ballID: string;
    posIdx: number;
};

export type TableHandEvent = {
    type: "table";
    ballID: string;
    tableID: string;
    spot?: string;
};

// export type BallSlideHandEvent = {
//     type: "slide";
//     ballID: string;
//     fromPosIdx: number;
//     toPosIdx: number;
// }

export type BallSwapHandEvent = {
    type: "swap";
};

export type HandState = (string | undefined)[];

export type HandTimelineEvent = TossHandEvent | CatchHandEvent | TableHandEvent | BallSwapHandEvent;

export function handStateDiff(
    state1: HandState,
    state2: HandState
): { ballID: string; fromIdx: number; toIdx: number }[] {
    const diff: { ballID: string; fromIdx: number; toIdx: number }[] = [];
    for (let fromIdx = 0; fromIdx < state1.length; fromIdx++) {
        const ballID = state1[fromIdx];
        if (ballID === undefined) {
            continue;
        }
        const toIdx = state2.findIndex((ballID2) => ballID2 === ballID);
        if (toIdx !== fromIdx) {
            diff.push({ ballID, fromIdx, toIdx });
        }
    }
    return diff;
}
