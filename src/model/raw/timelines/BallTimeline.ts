import { Timeline } from "../../../utils/Timeline";

// export type BaseBallEvent = {
//     ballID: number;
//     // soundOnEvent?: SoundSpec;
//     // stopPreviousSound?: boolean;
// };

// TODO : Unify with scheduler LocType ?

export type Vec3 = [number, number, number];

export type Animatable = {
    type: "spline",
    to: null | Vec3; // If null, target is the next position in the timeline.

}

export type Spline = {
    type: "spline";
    fromPos: null | Vec3;
    fromTime: null | number;
    toPos: null | Vec3;
    toTime: null | number;
}

export type AirborneBallEvent = {
    type: "airborne";
    from: 
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
