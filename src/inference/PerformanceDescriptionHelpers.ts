import { BallSoundDescription } from "../model";
import {
    BallDescription,
    BodyMeshDescription,
    ColorDescription,
    FractionDescription,
    GlobalBeatDescription,
    GlobalBeatReference,
    JugglerBeatReference,
    JugglingPhrase,
    SpotDescription
} from "./PerformanceDescription";

export type JugglingScoreHelper = {
    version: "0.1";
    ballTemplates: {
        name: string;
        soundOnCatch?: BallSoundDescription;
        soundOnToss?: BallSoundDescription;
    }[];
    jugglers: {
        name: string;
        table?: {
            template: string;
            ballsOnTableAtStart?: {
                name: string;
                id?: string | undefined;
                spot?: string | undefined;
            }[];
        };
        ballsHeldAtStart?: [(BallDescription | undefined)[], (BallDescription | undefined)[]];
        beatReference?: Partial<JugglerBeatReference>;
        jugglingPhrases?: JugglingPhrase[];
    }[];
    tableTemplates?: {
        name: string;
        spots: {
            name: string;
            acceptedBallName: string; // TODO : Support undefined acceptedBallName ?
        }[];
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

export type PerformanceLayoutHelper = {
    version: "0.1";
    ballTemplates: {
        name: string;
        soundOnCatch?: BallSoundDescription; //TODO : Remove ?
        soundOnToss?: BallSoundDescription; //TODO : Remove ?
    }[];
    jugglers: {
        name: string;
        position?: [number, number, number];
        rotation?: [number, number, number];
        scale?: [number, number, number];
        handBuilder?: HandLayoutHelper;
        body?: { height?: number; depth?: number; width?: number };
        table?: {
            template: string;
            position?: [number, number, number];
            rotation?: [number, number, number];
            scale?: [number, number, number];
        };
    }[];
    tableTemplates?: {
        name: string;
        height?: number;
        width?: number;
        depth?: number;
        spots: {
            name: string;
            position: [number, number, number];
            rotation?: [number, number, number];
        }[];
        unknownSpot?: {
            position: [number, number, number];
            rotation?: [number, number, number];
        };
    }[];
};

export type PerformanceMeshDefinitionsHelper = {
    ballTemplates: {
        name: string;
        color?: ColorDescription;
        radius?: number;
    }[];
    jugglers: {
        name: string;
        handBuilder?: {
            // Mesh related properties.
            length?: number; // From wrist to fingertip.
            width?: number; // From thumb to little finger.
            depth?: number; // From palm to back.
            visible?: boolean; //P
        };
        body: {
            height?: number;
            width?: number;
            depth?: number;
            visible?: boolean;
            color?: ColorDescription;
        };
        table?: {
            template: string;
            visible?: boolean;
            color?: ColorDescription;
        };
    }[];
    tableTemplates?: {
        name: string;
        height?: number;
        width?: number;
        depth?: number;
    }[];
};

export type HandLayoutHelper = {
    length?: number; // From wrist to fingertip.
    width?: number; // From thumb to little finger.
    depth?: number; // From palm to back.
    heldSpots: SpotDescription[]; // Relative to hand's wrist (x is towards thumb, y towards up, z towards fingers).
    scale?: [number, number, number];
    spotsBuild?: {
        catchTossDistance?: number;
        spotsHeight?: number;
        distanceToMirroringLine?: number;
        jugglingPlaneDistanceFromJuggler?: number;
    };
};
