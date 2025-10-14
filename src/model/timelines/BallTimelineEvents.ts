export type BaseBallEvent = {
    ballID: number;
    // soundOnEvent?: SoundSpec;
    // stopPreviousSound?: boolean;
};

// TODO : Unify with scheduler LocType ?

export type AirborneBallEvent = BaseBallEvent & {
    type: "airborne";
};

export type HeldBallEvent = BaseBallEvent & {
    type: "held";
    jugglerName: string;
    rightHand: boolean;
};

export type TableBallEvent = BaseBallEvent & {
    type: "table";
    tableID: string;
    spot: string | undefined;
};

export type BallTimelineEvent = AirborneBallEvent | HeldBallEvent | TableBallEvent;
