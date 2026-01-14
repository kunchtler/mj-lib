

//TODO : Rewrite more cleanly with Immer.js ?

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
import { ScoreConverter } from "./ScoreConverter";

//TODO : add beat to the object rather than have a 2-array element.
//TODO : useHand ?

//TODO : Rename
//TODO : Rename InputEvent as part of MDN.
//TODO : Handle Jugglers having different balls at start.
// export interface ParserToSchedulerParams {
//     jugglers: Map<string, FracSortedList<PreParserEvent>>;
//     ballNames?: Set<string>;
//     ballIDs?: Map<string, string>;
//     musicConverter?: MusicBeatConverter;
// }

// export type TableSpot = {
//     name: string;
//     ball: string;
//     // position: [number, number, number];
// };

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

// TODO : Rename MusciBeatConverter to ScoreConverter and measure to bar.
// TODO : Also rename all coreesponding variables.

// export type RawPreParserEvent = {
//     tempo?: string;
//     hands?: [string[], string[]];
//     pattern?: string /*; useHand?: "L" | "R" */;
// };

// export type PreParserEvent = {
//     tempo?: Fraction;
//     hands?: [string[], string[]];
//     pattern?: string /*; useHand?: "L" | "R" */;
// };

export type ScoreConverterGenerics<TimeSignatureType, NoteLengthType> = {
    bar: number;
    /**
     * The current signature of the measure.
     */
    timeSignature?: TimeSignatureType;
    /**
     * The current tempo of the measure.
     */
    tempo?: {
        /**
         * A fraction corresponding to the note that we wish to specify the tempo for.
         */
        note: NoteLengthType;
        /**
         * A number corresponding to how many times the tempo's note occurs in a beat.
         */
        bpm: number;
    };
}[];

export type JSONScoreConverter = ScoreConverterGenerics<
    string | FractionObject,
    number | string | FractionObject
>;

export type BallTemplate = {
    name: string; //TODO : Name should be unique. //T
    color?: number | string; //P
    soundOnCatch?: string; //A
    // soundOnToss?: BallSound;
    // soundWhileAirborne?: BallSound;
    // soundOnCatch?: BallSound;
};

export type ColorDescription = number | string;

export type SpotDescription = {
    position: [number, number, number];
    rotation?: [number, number, number]; // Rotation indicates with its "y" axis where the up is, and therefore how the ball should be put on top of the spot.
};

// TODO : How to provide the flexibility of placing the spots with a more gentle approach to generating them ?
// Answer : have the most convenient object with code ?, and have a more convenient object to manipulate for the specification.
// It could be that in most convenient object with code, there are no templates.
export type HandDescription = {
    tossSpot: SpotDescription; // Relative to juggler origin. //P
    catchSpot: SpotDescription; // Relative to juggler origin. //P
    restSpot: SpotDescription; // Relative to juggler origin. //P
    length: number; // From wrist to fingertip.
    width: number; // From thumb to little finger.
    depth: number; // From palm to back.
    // TODO : have hand spot templates to avoid redundancy.
    // TODO : find a way to make optional.
    heldSpots: SpotDescription[]; // Relative to hand's wrist (x is towards thumb, y towards up, z towards fingers).
    visible: boolean; //P
};

// Describes properties about both hands / single hands.
export type HandsDescription2 = {
    length?: number; // From wrist to fingertip.
    width?: number; // From thumb to little finger.
    depth?: number; // From palm to back.
    visible?: boolean; //P

    spots?: { leftHand?:
    }
    heldSpots: SpotDescription[]; // Relative to hand's wrist (x is towards thumb, y towards up, z towards fingers).
    // TODO : have hand spot templates to avoid redundancy.
    // TODO : find a way to make optional.
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
    scale?: number; //P
    leftHand?: HandDescription; //P
    rightHand?: HandDescription; //P
    body?: BodyDescription; //P
    table?: TableDescription; //T+P
    ballsHeldAtStart?: [BallDescription[], BallDescription[]]; //T
    jugglingPhrases?: JugglingPhraseType[]; //T
    // defaultTossOrder: ;
    // defaultCatchOrder: ;
};

//TODO : WHEN TO TRANSFORM PATTERN STRING INTO PARSED STUFF ?
//TODO : WHEN TO HAVE "immutable" data format ?
//TODO : Separate what is needed to create the Timelines (T) from the physical layer (P) ??? We may not want to have to specify P when doing T...

export type TableSpotDescription = SpotDescription & {
    name: string; //T
    acceptedBallName?: string; //T
    position: [number, number, number]; // Relative to table origin. //P
};

// export type HandTemplate = {
//     name: string;
//     heldSpots: SpotDescription[]; // Relative to hand's wrist (x is towards thumb, y towards up, z towards fingers).
// };

export type TableTemplate = {
    name: string; //T
    height?: number; //P
    width?: number; //P
    depth?: number; //P
    spots: TableSpotDescription[]; //T+P
    unknownSpot?: [number, number, number]; // Relative to table origin. //P
};

export type TableDescription = {
    // id?: string; //T //Not needed because juggler name is good enough.
    template: string; //T
    position?: [number, number, number]; // Relative to performance origin. //P
    rotation?: [number, number, number]; // Relative to performance origin. //P
    scale?: number; //P
    ballsOnTableAtStart?: BallOnTable[]; //T
};

export type TakeBall = { name: string; fromSpot?: string } | { id: string };

export type PutBall =
    | {
          toSpot?: string;
          name: string; //T
          fromHand?: "left" | "right"; // Needs to be specified when there are two balls with the same name. //T
          //handSpotNumber: number
      }
    | { toSpot?: string; id: string };

export type HandsInstructions = {
    /**
     * All balls that are specified as being put on a particular table spot.
     * It happens before taking new balls in hand, before making any toss.
     */
    place?: PutBall[];
    /**
     * The balls held in hands just after having (possibly) put balls on the table,
     * and just before tossing the balls.
     */
    have?: [TakeBall[], TakeBall[]];
};

export type JugglingPhraseGenerics<PatternTimeType, FractionType> = {
    startTime: PatternTimeType;
    withTempo?: FractionType; //T
    setupHands?: HandsInstructions; //T
    pattern?: string; //T
};

// TODO : Performance instead of Pattern

/** The exhaustive description of a juggling pattern. */
export type PerformanceDescriptionGenerics<JugglingPhraseType, ScoreConverterType> = {
    /** Each  */
    ballTemplates: BallTemplate[];
    jugglers: JugglerDescription<JugglingPhraseType>[];
    // handTemplates: HandTemplate[];
    tableTemplates?: TableTemplate[];
    scoreConverter?: ScoreConverterType;
};
// TODO ? (less clearer when we look for a ingle object to generate everything)
// type PatternDescriptionGenerics<PatternTimeType, FractionType> = PatternEventsDescriptionGenerics<PatternTimeType, FractionType> & PatternViewDescription;

export type FractionObject = { n: bigint; d: bigint };
export type ScoreTime<FractionType> = { bar: number; beat: FractionType };
export type FractionParam = number | string;
export type JSONTime = number | string | ScoreTime<FractionParam>;

export type JSONPerformanceDescription = PerformanceDescriptionGenerics<
    JSONJugglingPhrase,
    JSONScoreConverter
>;

export type PerformanceDescription = PerformanceDescriptionGenerics<JugglingPhrase, ScoreConverter>;

export type BallDescription = {
    name: string;
    id?: string;
};

export type JugglingScoreGenerics<JugglingPhraseType, ScoreConverterType> = {
    ballTemplates: { name: string }[];
    jugglers: {
        name: string;
        table?: {
            template: string;
            ballsOnTableAtStart?: BallOnTable[];
        };
        ballsHeldAtStart?: [BallDescription[], BallDescription[]];
        jugglingPhrases?: JugglingPhraseType[];
    }[];
    tableTemplates?: {
        name: string;
        spots: {
            name: string;
            acceptedBallName?: string;
        }[];
    }[];
    scoreConverter?: ScoreConverterType;
};

export type JSONJugglingPhrase = JugglingPhraseGenerics<JSONTime, number | string | FractionObject>;
export type JugglingPhrase = JugglingPhraseGenerics<Fraction, Fraction>;

export type JSONJugglingScore = JugglingScoreGenerics<JSONJugglingPhrase, JSONScoreConverter>;
export type JugglingScore = JugglingScoreGenerics<JugglingPhrase, ScoreConverter>;

export type MiseEnScene = {
    ballTemplates: {
        name: string;
        color: ColorDescription;
        soundOnCatch?: string;
    }[];
    jugglers: {
        name: string;
        position: [number, number, number];
        rotation: [number, number, number];
        scale: number;
        leftHand: HandDescription;
        rightHand: HandDescription;
        body?: BodyDescription;
        table?: {
            template: string;
            position?: [number, number, number];
            rotation?: [number, number, number];
            scale?: number;
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

///

type PerformanceDescriptionConvenient = {
    ballTemplates: {
        name: string;
        color?: ColorDescription;
        soundOnCatch?: string | null;
    }[];
    jugglers: {
        name: string;
        position: [number, number, number];
        rotation: [number, number, number];
        scale: number;
        leftHand: HandDescription2;
        rightHand: HandDescription;
        body?: BodyDescription;
        table?: {
            template: string;
            position?: [number, number, number];
            rotation?: [number, number, number];
            scale?: number;
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
}


import { BallSound } from "../model";

type PerformanceDescriptionComplete = {
    ballTemplates: {
        name: string;
        color: ColorDescription;
        soundOnCatch: BallSound | null;
    }[];
    jugglers: {
        name: string;
        position: [number, number, number];
        rotation: [number, number, number];
        scale: number;
        leftHand: HandDescriptionComplete;
        rightHand: HandDescriptionComplete;
        body: BodyDescriptionComplete;
        table: {
            id: string;
            height: number;
            width: number;
            depth: number;
            position: [number, number, number];
            rotation: [number, number, number];
            scale: number;
            spots: {
                name: string;
                position: [number, number, number];
                rotation: [number, number, number];
            }[],
            unknownSpot: {
                position: [number, number, number];
                rotation: [number, number, number];
            };
        } | null;
    }[];
}

type HandDescriptionComplete = {
    length: number; // From wrist to fingertip.
    width: number; // From thumb to little finger.
    depth: number; // From palm to back.
    visible: boolean; //P
    // TODO : have hand spot templates to avoid redundancy.
    // TODO : find a way to make optional.
    tossSpot: SpotDescriptionComplete; // Relative to juggler origin. //P
    catchSpot: SpotDescriptionComplete; // Relative to juggler origin. //P
    restSpot: SpotDescriptionComplete; // Relative to juggler origin. //P
    heldSpots: SpotDescriptionComplete[]; // Relative to hand's wrist (x is towards thumb, y towards up, z towards fingers).
};

type BodyDescriptionComplete = {
    height: number; //P
    width: number; //P
    depth: number; //P
    color: ColorDescription; //P
    visible: boolean; //P
};

type SpotDescriptionComplete = {
    position: [number, number, number];
    rotation: [number, number, number]; // Rotation indicates with its "y" axis where the up is, and therefore how the ball should be put on top of the spot.
};

type JugglingScoreComplete<JugglingPhraseType, ScoreConverterType> = {
    ballTemplates: { name: string }[];
    jugglers: {
        name: string;
        table: {
            id: string;
            ballsOnTableAtStart: {
                name: string;
                id: string;
                spot: string | null;
            }[];
        } | null;
        ballsHeldAtStart: [BallDescription[], BallDescription[]];
        jugglingPhrases: JugglingPhraseType[];
    }[];
    tableTemplates?: {
        name: string;
        spots: {
            name: string;
            acceptedBallName?: string;
        }[];
    }[];
    scoreConverter: ScoreConverter;
};

type BallDescriptionComplete = {
    name: string;
    id: string;
};

type JugglingPhraseComplete<PatternTimeType, FractionType> = {
    startTime: Fraction;
    withTempo?: Fraction; //T
    setupHands?: HandsInstructions; //T
    pattern?: string; //T
};

// Uncomment to see if typescript complains about incompatible types.

// function foo(x: JugglingScore) {}
// function fooJSON(x: JSONJugglingScore) {}
// function goo(x: MiseEnScene) {}
// let a: PerformanceDescription;
// foo(a);
// goo(a);
// let aJSON: JSONPerformanceDescription;
// fooJSON(aJSON);
