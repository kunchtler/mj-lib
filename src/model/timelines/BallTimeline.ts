import { Timeline } from "../../utils/Timeline";

// TODO : Unify with scheduler LocType ?

export type BallSound = {
    name: string | string[];
    /**
     * Whether the sound should loop until the next event. False by default.
     */
    loop?: boolean;
};

export type BallEvent = {
    location: BallLocation;
    transition: BallTransition;
    sound?: BallSound;
};

export type BallLocation =
    | { type: "onTable"; tableID: string; spot: null | string }
    | { type: "held"; jugglerName: string; rightHand: boolean; spotIdx: number };

// The ball goes up in the air, disappears, reappears above its next spot, and falls down.
// As if it had been teleported by a UFO.

// siteswap only defined if the generating juggling toss was specified by its siteswap height.
export type BallTransition =
    | { type: "keep" }
    | { type: "slideInHand" }
    | { type: "ufo" }
    | { type: "airborne"; siteswapHeight?: number };

export class BallTimeline extends Timeline<number, BallEvent> {}

// export type BallSound = {
//     name: string | string[];
//     /**
//      * Whether the sound should loop until the next event. False by default.
//      */
//     loop?: boolean;
// };

// export type AirborneBallEvent = {
//     type: "airborne";
//     // Only defined if the generating juggling toss was specified by its siteswap height.
//     siteswapHeight?: number;
//     // Needed in case the previous event is that the ball is held in subspot 1 and goes to subsot 2 as it is tossed.
//     from?: HeldBallEvent | TableBallEvent;
//     soundOnEvent?: BallSound;
// };

// export type HeldBallEvent = {
//     type: "held";
//     jugglerName: string;
//     rightHand: boolean;
//     handPosIdx?: number;
//     soundOnEvent?: BallSound;
// };

// export type TableBallEvent = {
//     type: "table";
//     tableID: string;
//     tableSpot: string | undefined;
//     // Needed in case the previous event is that the ball is held in subspot 1 and goes to subsot 2 as it is tossed.
//     from?: HeldBallEvent | TableBallEvent;
//     soundOnEvent?: BallSound;
// };

// export type NullEvent = {
//     type: "null";
//     from?: HeldBallEvent | TableBallEvent
// };

// // The ball goes up in the air, disappears, reappears above its next spot, and falls down.
// // As if it had been teleported by a UFO.
// export type UFOBallEvent = {
//     type: "ufo";
//     from?: HeldBallEvent | TableBallEvent;
// };

// export type BallEvent = AirborneBallEvent | HeldBallEvent | TableBallEvent;

// export class BallTimeline extends Timeline<number, BallEvent> {}

// export type Vec3 = [number, number, number];

// export type Animatable = {
//     type: "spline",
//     to: null | Vec3; // If null, target is the next position in the timeline.

// }

// export type Spline = {
//     type: "spline";
//     fromPos: null | Vec3;
//     fromTime: null | number;
//     toPos: null | Vec3;
//     toTime: null | number;
// }