import { Timeline } from "../../utils/Timeline";

// export type BaseBallEvent = {
//     ballID: number;
//     // soundOnEvent?: SoundSpec;
//     // stopPreviousSound?: boolean;
// };

// TODO : Unify with scheduler LocType ?

export type AirborneBallEvent = {
    type: "airborne";
    siteswapHeight?: number;
};

export type HeldBallEvent = {
    type: "held";
    jugglerName: string;
    rightHand: boolean;
    posIdx: number;
};

export type TableBallEvent = {
    type: "table";
    tableID: string;
    tableSpot: string | undefined;
};

export type BallEvent = AirborneBallEvent | HeldBallEvent | TableBallEvent;

export class BallTimeline extends Timeline<number, BallEvent> {}
