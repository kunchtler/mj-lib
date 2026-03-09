import { DeepFuse } from "../utils";
import {
    BallSoundDescription,
    BallDescription,
    ColorDescription,
    FractionDescription,
    GlobalBeatDescription,
    GlobalBeatReference,
    JugglerBeatReference,
    JugglingPhrase,
    SpotDescription
} from "./PerformanceDescription";

// export type PerformanceDescriptionHelper = DeepFuse<
//     DeepFuse<JugglingScoreHelper, PerformanceLayoutHelper>,
//     PerformanceMeshDefinitionsHelper
// >;

export type JugglingScoreHelper = {
    version: "0.1";
    ballTemplates: {
        name: string;
        soundOnCatch?: BallSoundDescription;
        soundOnToss?: BallSoundDescription;
    }[];
    jugglers: {
        name: string;
        ballsHeldAtStart?: [(BallDescription | undefined)[], (BallDescription | undefined)[]];
        beatReference?: Partial<JugglerBeatReference>;
        jugglingPhrases?: JugglingPhrase[];
        defaultTableID?: string;
    }[];
    tables?: {
        id: string;
        spots: {
            name: string;
            acceptedBallName: string; // TODO : Support undefined acceptedBallName ?
            ball?: boolean | { name: string; id?: string };
        }[];
        unknownSpot?: { balls: { name: string; id?: string }[] };
    }[];
    globalBeat?:
        | {
              type: "constant";
              beatReference?: GlobalBeatReference;
              beatsInBar?: FractionDescription;
              beatsPerMinute?: FractionDescription;
          }
        | ({ type: "variable" } & Partial<GlobalBeatDescription>);
};

// Both Meshes and Layout are described here, as the dimensions of the layout are quite linked to the helpers.
export type PerformanceLayoutAndMeshHelper = {
    version: "0.1";
    ballTemplates: {
        name: string;
        // soundOnCatch?: BallSoundDescription; //TODO : Remove ?
        // soundOnToss?: BallSoundDescription; //TODO : Remove ?
        color?: ColorDescription;
        radius?: number;
    }[];
    jugglers: {
        name: string;
        position?: [number, number, number];
        rotation?: [number, number, number];
        scale?: [number, number, number];
        handBuilder?: JugglerHandBuilder;
        body?: {
            height?: number;
            depth?: number;
            width?: number;
            color?: ColorDescription;
            visible?: boolean;
        };
        defaultTableID?: string;
    }[];
    tables?: {
        id: string;
        height?: number;
        width?: number;
        depth?: number;
        scale?: [number, number, number];
        spots: {
            name: string;
            position: [number, number, number];
            rotation?: [number, number, number];
        }[];
        unknownSpot?: {
            position: [number, number, number];
            rotation?: [number, number, number];
        };
        position?: [number, number, number];
        rotation?: [number, number, number];
        color?: ColorDescription;
        visible?: boolean;
    }[];
};

// export type PerformanceMeshDefinitionsHelper = {
//     ballTemplates: {
//         name: string;
//         color?: ColorDescription;
//         radius?: number;
//     }[];
//     jugglers: {
//         name: string;
//         handBuilder?: {
//             // Mesh related properties.
//             length?: number; // From wrist to fingertip.
//             width?: number; // From thumb to little finger.
//             depth?: number; // From palm to back.
//             visible?: boolean; //P
//         };
//         body: {
//             height?: number;
//             width?: number;
//             depth?: number;
//             visible?: boolean;
//             color?: ColorDescription;
//         };
//     }[];
//     tables?: {
//         height?: number;
//         width?: number;
//         depth?: number;
//         visible?: boolean;
//         color?: ColorDescription;
//     }[];
// };

export type JugglerHandBuilder = {
    length?: number; // From wrist to fingertip.
    width?: number; // From thumb to little finger.
    depth?: number; // From palm to back.
    heldSpots?: SpotDescription[]; // Relative to hand's wrist (x is towards thumb, y towards up, z towards fingers).
    scale?: [number, number, number];
    spotsBuild?: {
        catchTossDistance?: number;
        spotsHeight?: number;
        distanceToMirroringLine?: number;
        jugglingPlaneDistanceFromJuggler?: number;
    };
    visible?: boolean;
    color?: ColorDescription;
};
