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

// TODO : Rename MusciBeatConverter to ScoreRhythmConverter and measure to bar.

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

export type RawMusicConverter<FractionType> = {
    bar: number;
    /**
     * The current signature of the measure.
     */
    timeSignature?: FractionType;
    /**
     * The current tempo of the measure.
     */
    tempo?: {
        /**
         * A fraction corresponding to the note that we wish to specify the tempo for.
         */
        note: FractionType;
        /**
         * A number corresponding to how many times the tempo's note occurs in a beat.
         */
        bpm: number;
    };
}[];

export type BallTemplate = {
    name: string; //TODO : Name should be unique. //T
    color: number | string; //P
    soundOnCatch?: string; //A
    // soundOnToss?: BallSound;
    // soundWhileAirborne?: BallSound;
    // soundOnCatch?: BallSound;
};

export type HandDescription = {
    tossSpot: [number, number, number]; // Relative to juggler origin. //P
    catchSpot: [number, number, number]; // Relative to juggler origin. //P
    restSpot: [number, number, number]; // Relative to juggler origin. //P
    visible?: boolean; //P
};

export type BodyDescription = {
    height?: number; //P
    width?: number; //P
    depth?: number; //P
    color?: number | string; //P
    visible?: boolean; //P
};

export type BallOnTable = {
    ballName: string; //T
    id?: string; //T
    spot?: string; //T
};

export type Ball = {
    template: string; //T
    id?: string; //T
};

export type JugglerDescription<PatternTimeType, FractionType> = {
    name: string; //T
    // id?: string; //TODO : Name should already be unique (else how can we pass ?) //T
    position: [number, number, number]; // Relative to performance origin. //P
    rotation?: [number, number, number]; // Relative to performance origin. //P
    scale?: number; //P
    leftHand: HandDescription; //P
    rightHand: HandDescription; //P
    body: BodyDescription; //P
    table?: TableDescription; //T+P
    ballsHeldAtStart: [Ball[], Ball[]]; //T
    pattern: [PatternTimeType, SubPattern<FractionType>][]; //T
    // defaultTossOrder: ;
    // defaultCatchOrder: ;
};

//TODO : WHEN TO TRANSFORM PATTERN STRING INTO PARSED STUFF ?
//TODO : WHEN TO HAVE "immutable" data format ?
//TODO : Separate what is needed to create the Timelines (T) from the physical layer (P) ??? We may not want to have to specify P when doing T...

export type SpotDescription = {
    name: string; //T
    acceptedBall: string; //T
    position: [number, number, number]; // Relative to table origin. //P
};

export type TableTemplate = {
    name: string; //T
    height?: number; //P
    width?: number; //P
    depth?: number; //P
    spots: SpotDescription[]; //T+P
    unknownSpot?: [number, number, number]; // Relative to table origin. //P
};

export type TableDescription = {
    // id?: string; //T //Not needed because juggler name is good enough.
    spotsTemplate: string; //T
    position: [number, number, number]; // Relative to performance origin. //P
    rotation?: [number, number, number]; // Relative to performance origin. //P
    scale?: number; //P
    ballsOnTableAtStart: BallOnTable[]; //T
};

export type SubPattern<FractionType> = {
    withTempo?: FractionType; //T
    setupHands?: [{ ball: string; fromSpot?: string }[], { ball: string; fromSpot?: string }[]]; //T
    pattern?: string; //T
    thenPlace?: {
        ball: string; //T
        fromHand?: "left" | "right"; // Needs to be specified when there are two balls with the same name. //T
        toSpot: string; //T
        //handSpotNumber: number
    }[];
};

/** The exhaustive description of a juggling pattern. */
export type PatternDescriptionGenerics<PatternTimeType, FractionType> = {
    /** Each  */
    ballTemplates: BallTemplate[];
    jugglers: JugglerDescription<PatternTimeType, FractionType>[];
    tableTemplates?: TableTemplate[];
    musicBeatConverter?: RawMusicConverter<FractionType>[];
};
// TODO ? (less clearer when we look for a ingle object to generate everything)
// type PatternDescriptionGenerics<PatternTimeType, FractionType> = PatternEventsDescriptionGenerics<PatternTimeType, FractionType> & PatternViewDescription;

export type FractionObject = { n: bigint; d: bigint };
export type ScoreTime<FractionType> = { bar: number; beat: FractionType };
export type JSONTime = number | FractionObject | ScoreTime<FractionObject>;

export type JSONPatternDescription = PatternDescriptionGenerics<JSONTime, FractionObject>;

export type PatternDescription = PatternDescriptionGenerics<Fraction, Fraction>;

type PatternEventsDescriptionGenerics<PatternTimeType, FractionType> = {
    ballTemplates: { name: string }[];
    jugglers: {
        name: string;
        table?: {
            spotsTemplate: string;
            ballsOnTableAtStart: BallOnTable[];
        };
        ballsHeldAtStart: [Ball[], Ball[]];
        pattern: [PatternTimeType, SubPattern<FractionType>][];
    }[];
    tableTemplates?: {
        name: string;
        spots: {
            name: string;
            acceptedBall: string;
        }[];
    }[];
    musicBeatConverter?: RawMusicConverter<FractionType>[];
};

export type JSONPatternEventsDescription = PatternEventsDescriptionGenerics<
    JSONTime,
    FractionObject
>;

export type PatternEventsDescription = PatternEventsDescriptionGenerics<Fraction, Fraction>;

export type PatternViewDescription = {
    ballTemplates: {
        name: string;
        color: string | number;
        soundOnCatch?: string;
    }[];
    jugglers: {
        name: string;
        position: [number, number, number];
        rotation?: [number, number, number];
        scale?: number;
        leftHand: HandDescription;
        rightHand: HandDescription;
        body: BodyDescription;
        table?: {
            id?: string;
            position: [number, number, number];
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
        }[];
        unknownSpot?: [number, number, number];
    }[];
};

// function foo(x: PatternEventsDescription) {}
// let a: PatternDescription;
// foo(a);
