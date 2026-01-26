import { BallSound } from "../model";
import {
    BallDescription,
    BodyDescription,
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
        soundOnCatch?: BallSound;
        soundOnToss?: BallSound;
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

export type MiseEnSceneHelper = {
    version: "0.1";
    ballTemplates: {
        name: string;
        color?: ColorDescription;
        radius?: number;
    }[];
    jugglers: {
        name: string;
        position?: [number, number, number];
        rotation?: [number, number, number];
        scale?: [number, number, number];
        handBuilder?: HandDescriptionHelper;
        body?: BodyDescription;
        table?: {
            template: string;
            position?: [number, number, number];
            rotation?: [number, number, number];
            color?: ColorDescription;
            scale?: [number, number, number];
            visible?: boolean;
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

export type HandDescriptionHelper = {
    // Mesh related properties.
    length?: number; // From wrist to fingertip.
    width?: number; // From thumb to little finger.
    depth?: number; // From palm to back.
    heldSpots: SpotDescription[]; // Relative to hand's wrist (x is towards thumb, y towards up, z towards fingers).
    visible?: boolean; //P
    scale?: [number, number, number];
    spotsBuild?: {
        catchTossDistance?: number;
        spotsHeight?: number;
        distanceToMirroringLine?: number;
        jugglingPlaneDistanceFromJuggler?: number;
    };
};
