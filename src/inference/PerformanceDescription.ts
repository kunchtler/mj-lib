/*
Have an easy way to set things.
That gets transformed into a convenient way to use them in code.
// TODO : Remove from the most complete object the templates (makes more sense code-wise).

*/
/**
 * A MusicBeatConverter expressed in a JSON-friendly format. It stores information about the music to be synced with. It is an array of two elements arrays :
 * - the second one indicates the current tempo and signature.
 * - the first one indicated on which beat such information is given.
 * Note that there needs to be both tempo and signature information on the first beat.
 */
/**
 * This is the doc comment for file1.ts
 *
 * Specify this is a module comment and rename it to my-module:
 * @module my-module
 */
import Fraction from "fraction.js";
import { MusicTempo, ScoreConverter, TimeSignature } from "./ScoreConverter";
import { BallSound } from "../model";
import { DeepFuse, DeepRequired } from "../utils";

// TODO for description : Add support for...
// - custom meshes (imported / through Three / through Fiber)
// - custom sounds (from file / through JS / through preloaded buffers)
// - custom functions for sound that handle different sounds being played (based on info from catch/toss/...).
// - Do we need to know the sound name when the ball is caught ? Are the sound functions rather important in the events ? (we could have silent tosses in which case we don't want to emit sound, so just don't call the function ?) Ask them to be pure ? Have a function to say : what the note is, and a function to say : given this note, what file to play (so that there can be variety. Or could be array with weights).
// - custom hands / jugglers visibility ?
// - allow or not for tables.
// - when no table : specify balls in hands. When table : either specify here, or later in the pattern.
// - transform all hand arrays in leftHand/rightHand object ?
// - Separate pattern from JugglerDescription ? Instead have name of the juggler in the pattern and lex/parse it ?
// - Map sound name -> AudioBuffer ?

export type Sound = { type: "note"; note: string } | { type: "url"; url: string };
// | { type: "path" }; //TODO : Support audio buffer Base64-encoded in JSON Description.

export type BallTemplate = {
    name: string; //TODO : Name should be unique. //T
    color?: ColorDescription; //P
    radius?: number;
    soundOnCatch?: BallSound; //A
    soundOnToss?: BallSound;
    // soundWhileAirborne?: BallSound;
};

export type ColorDescription = number | string;

export type SpotDescription = {
    position: [number, number, number];
    rotation?: [number, number, number]; // Rotation indicates with its "y" axis where the up is, and therefore how the ball should be put on top of the spot.
};

// TODO : How to provide the flexibility of placing the spots with a more gentle approach to generating them ?
// Answer : have the most convenient object with code ?, and have a more convenient object to manipulate for the specification.
// It could be that in most convenient object with code, there are no templates.
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

export type HandDescription = {
    length?: number; // From wrist to fingertip.
    width?: number; // From thumb to little finger.
    depth?: number; // From palm to back.
    visible?: boolean; //P
    color?: ColorDescription;
    // TODO : have hand spot templates to avoid redundancy.
    // TODO : find a way to make optional.
    tossSpot: SpotDescription; // Relative to juggler origin. //P
    catchSpot: SpotDescription; // Relative to juggler origin. //P
    restSpot?: SpotDescription; // Relative to juggler origin. //P
    swapSpot?: SpotDescription; // Relative to juggler origin. //P
    heldSpots?: SpotDescription[]; // Relative to hand's wrist (x is towards thumb, y towards up, z towards fingers).
};

export type BodyDescription = {
    height?: number; //P
    width?: number; //P
    depth?: number; //P
    color?: ColorDescription; //P
    visible?: boolean; //P
};

export type BallOnTable = {
    name: string;
    id?: string;
    spot?: string;
};

export type JugglerDescription<JugglingPhraseType> = {
    name: string; //T
    // id?: string; //TODO : Name should already be unique (else how can we pass ?) //T
    position?: [number, number, number]; // Relative to performance origin. //P
    rotation?: [number, number, number]; // Relative to performance origin. //P
    scale?: [number, number, number]; //P
    leftHand?: HandDescriptionHelper; //P
    rightHand?: HandDescriptionHelper; //P
    body?: BodyDescription; //P
    table?: TableDescription; //T+P
    ballsHeldAtStart?: [BallDescription[], BallDescription[]]; //T
    jugglingPhrases?: JugglingPhraseType[]; //T
    // defaultTossOrder: ;
    // defaultCatchOrder: ;
};

export type TableSpotDescription = SpotDescription & {
    name: string; //T
    acceptedBallName: string; //T
};

export type TableTemplate = {
    name: string; //T
    height?: number; //P
    width?: number; //P
    depth?: number; //P
    spots: TableSpotDescription[]; //T+P
    unknownSpot?: SpotDescription; // Relative to table origin. //P
};

export type TableDescription = {
    // id?: string; //T //Not needed because juggler name is good enough.
    template: string; //T
    position?: [number, number, number]; // Relative to performance origin. //P
    rotation?: [number, number, number]; // Relative to performance origin. //P
    scale?: [number, number, number]; //P
    color?: ColorDescription;
    visible?: boolean;
    ballsOnTableAtStart?: BallOnTable[]; //T
};

export type TakeBall =
    | { type: "byName"; name: string; fromSpot?: string }
    | { type: "byID"; id: string };

export type PutBall =
    | {
          type: "byName";
          toSpot?: string;
          name: string; //T
          fromHand?: "left" | "right"; // Needs to be specified when there are two balls with the same name. //T
          //handSpotNumber: number
      }
    | { type: "byId"; toSpot?: string; id: string };

export type HandsInstructions = {
    /**
     * All balls that are specified as being put on a particular table spot.
     * It happens before taking new balls in hand, before making any toss.
     */
    placeBalls?: PutBall[];
    /**
     * The balls held in hands just after having (possibly) put balls on the table,
     * and just before tossing the balls.
     */
    haveBalls?: [TakeBall[], TakeBall[]];
};

export type JugglingPhraseGenerics<PatternTimeType, FractionType> = {
    startTime: PatternTimeType;
    withTempo?: FractionType; //T
    setupHands?: HandsInstructions; //T
    pattern?: string; //T
};

/** The exhaustive description of a juggling pattern. */
export type PerformanceDescriptionGenerics<JugglingPhraseType, ScoreConverterType> = {
    /** Each  */
    ballTemplates: BallTemplate[];
    jugglers: JugglerDescription<JugglingPhraseType>[];
    // handTemplates: HandTemplate[];
    tableTemplates?: TableTemplate[];
    scoreConverter?: ScoreConverterType;
};

export type FractionObject = { n: bigint; d: bigint };
export type ScoreTime<FractionType> = { bar: number; beat: FractionType };
export type FractionType = number | string;

export type BallDescription = {
    name: string;
    id?: string;
};

export type JugglingScore = {
    ballTemplates: {
        name: string;
    }[];
    jugglers: {
        name: string;
        table?: {
            id: string;
            ballsOnTableAtStart: {
                id: string;
                name: string; // Todo : differentiate template name from sound category ?
                spot?: string;
            }[];
            spots: {
                name: string;
                acceptedBallName: string;
            }[];
        };
        ballsHeldAtStart: [
            (Required<BallDescription> | undefined)[],
            (Required<BallDescription> | undefined)[]
        ];
        jugglingPhrases: JugglingPhrase[];
    }[];
    globalBeat: Required<GlobalBeatDescription>;
};

// export type JugglingScore2 = {
//     ballTemplates: {
//         name: string;
//     }[];
//     jugglers: {
//         name: string;
//         table?: {
//             id: string;
//             ballsOnTableAtStart: {
//                 id: string;
//                 templateName: string; // Todo : differentiate template name from sound category ?
//                 spot?: string;
//             }[];
//             spots: {
//                 name: string;
//                 acceptedBallName: string;
//             }[];
//         };
//         ballsHeldAtStart: [Required<BallDescription>[], Required<BallDescription>[]];
//         jugglingPhrases: JugglingPhrase[];
//     }[];
//     scoreRhythm?: ScoreRhythmDescription;
// };

export type JugglingPhrase = {
    startTime:
        | { type: "followPreviousPhrase" } // directly follows previous phrase.
        | { type: "byTime"; seconds: FractionType }
        | { type: "byLocalBeat"; beat: FractionType } // Specify toss number.
        | { type: "byGlobalBeat"; beat: FractionType } // Specify beat counts since start.
        | {
              type: "byGlobalBarBeat";
              bar: number;
              beatInBar: FractionType;
          }; // Specify bar and beat in bar.
    localBeatTempo?:
        | { type: "perGlobalBeat"; beatsPerGlobalBeat: FractionType }
        | { type: "perMinute"; beatsPerMinute: FractionType };
    localBeatTempoMultiplier?: FractionType;
    setupHands?: HandsInstructions;
    pattern?: string;
};

// export type JugglingPhrase = {
//     startTime:
//         | { type: "followPreviousPhrase" } // directly follows previous phrase.
//         | { type: "byToss"; toss: number } // Specify toss number.
//         | { type: "byBeat"; beat: FractionType } // Specify beat counts since start.
//         | {
//               type: "byBarBeat";
//               bar: number;
//               beatInBar: FractionType;
//           }; // Specify bar and beat in bar.
//     tossesPerBeat?:
//         | { type: "perMinute"; tossesPerMinute: FractionType } // self explanatory. Doesn't change when tempo or signature.beatDuration changes.
//         | { type: "perBeat"; tossesPerBeat: FractionType } // Changes when scoreRhythm signature.beatDuration or tempo changes.
//         | {
//               type: "perNoteDuration";
//               noteDuration: FractionType;
//               tossesPerNote: FractionType;
//           }; // changes when tempo changes, but not signature.beatDuration.
//     tempoMultiplier?: FractionType;
//     setupHands?: HandsInstructions;
//     pattern?: string;
// };

export type GlobalBeatTime =
    | {
          type: "byBeat";
          beat: FractionType;
      }
    | { type: "byBarBeat"; bar: number; beat: FractionType }
    | { type: "byTime"; seconds: FractionType };

export type GlobalBeatDescription = {
    firstBeatOffsetInSeconds?: FractionType;
    changes: {
        startTime: GlobalBeatTime;
        beatsInBar?: FractionType;
        beatsPerMinute?: FractionType;
        // tempoMultiplier?: FractionType;
    }[];
};

// export type ScoreRhythmDescription = {
//     bar: number;
//     timeSignature?: TimeSignature<FractionType>;
//     tempo?: MusicTempo<FractionType>;
// }[];

// export type JugglingScore2 = {
//     // ballTemplates: {
//     //     name: string;
//     // }[];
//     jugglers: {
//         name: string;
//         initialState: {
//             hands: [
//                 (Required<BallDescription> | undefined)[],
//                 (Required<BallDescription> | undefined)[]
//             ];
//             table?: {
//                 id: string;
//                 spots: {
//                     spot: string;
//                     ball?: Required<BallDescription>;
//                     templateName: string; // TODO : differentiate template name from sound category ?
//                 }[];
//                 unknownSpots: Required<BallDescription>[];
//             };
//         };
//         // events: {
//         //     beat: FractionType;
//         //     tossesPerBeat: FractionType;
//         //     setupHands?: HandsInstructions;
//         //     pattern?: string;
//         // }[];
//     }[];
//     scoreRhythm?: {
//         bar: number;
//         timeSignature?: {
//             beatDuration: FractionType;
//             beatsPerBar: FractionType;
//         };
//         tempo?: {
//             noteDuration: FractionType;
//             notesPerMinute: number;
//         };
//     }[];
// };

// TOCONTINUE : Faire la version exhaustive (à pattern près) de JugglingScore.

export type JugglingScoreHelper = {
    version: "0.1";
    ballTemplates: {
        name: string;
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
              firstBeatOffsetInSeconds?: FractionType;
              beatsInBar?: FractionType;
              beatsPerMinute?: FractionType;
          }
        | ({ type: "variable" } & GlobalBeatDescription);
};

export type MiseEnSceneHelper = {
    version: "0.1";
    ballTemplates: {
        name: string;
        color?: ColorDescription;
        radius?: number;
        soundOnCatch?: BallSound;
        soundOnToss?: BallSound;
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

// TODO : Check if scale is working correctly.
export type MiseEnScene = {
    ballTemplates: {
        name: string;
        color: ColorDescription;
        radius: number;
        soundOnCatch?: BallSound;
        soundOnToss?: BallSound;
    }[];
    jugglers: {
        name: string;
        position: [number, number, number];
        rotation: [number, number, number];
        scale: [number, number, number];
        leftHand: DeepRequired<HandDescription>;
        rightHand: DeepRequired<HandDescription>;
        body: DeepRequired<BodyDescription>;
        table?: {
            id: string;
            height: number;
            width: number;
            depth: number;
            visible: boolean;
            position: [number, number, number];
            rotation: [number, number, number];
            scale: [number, number, number];
            color: ColorDescription;
            spots: {
                name: string;
                position: [number, number, number];
                rotation: [number, number, number];
            }[];
            unknownSpot: {
                position: [number, number, number];
                rotation: [number, number, number];
            };
        };
    }[];
};

// export type PerformanceView = {
//     ballTemplates: {
//         name: string;
//         color: ColorDescription;
//         radius: number;
//         soundOnCatch?: BallSound;
//         soundOnToss?: BallSound;
//     }[];
//     jugglers: {
//         name: string;
//         leftHand: DeepRequired<HandDescription>;
//         rightHand: DeepRequired<HandDescription>;
//         body: DeepRequired<BodyDescription>;
//         table?: {
//             id: string;
//             height: number;
//             width: number;
//             depth: number;
//             visible: boolean;
//             position: [number, number, number];
//             rotation: [number, number, number];
//             scale: [number, number, number];
//             color: ColorDescription;
//             spots: {
//                 name: string;
//                 position: [number, number, number];
//                 rotation: [number, number, number];
//             }[];
//             unknownSpot: {
//                 position: [number, number, number];
//                 rotation: [number, number, number];
//             };
//         };
//     }[];
// };

// export type PerformanceViewHelper = {};

// Uncomment to see if typescript complains about incompatible types.

// function foo(x: JugglingScore) {}
// function fooJSON(x: JSONJugglingScore) {}
// function goo(x: MiseEnScene) {}
// let a: PerformanceDescription;
// foo(a);
// goo(a);
// let aJSON: JSONPerformanceDescription;
// fooJSON(aJSON);

// type test = MiseEnScene & PerformanceDescription;
// let x: test;
// let y: JugglingScore;
// y = x;
// x = y;

// TODO : Separate in Mise En Scene what is useful for the trajectories computations and what is useful for the models.
