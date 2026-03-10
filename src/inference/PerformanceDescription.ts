/**
 * This is the doc comment for file1.ts
 *
 * Specify this is a module comment and rename it to my-module:
 * @module my-module
 */
import { DeepFuse, DeepRequired, ElementOf } from "../utils";

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

export type PerformanceDescription = DeepFuse<
    DeepFuse<JugglingScore, PerformanceLayout>,
    PerformanceMeshesDescription
>;

// type Test1 = PerformanceDescription["balls"];
// type Test2 = Omit<ElementOf<PerformanceDescription["jugglers"]>, "leftHand" | "rightHand">;
// type Test3 = PerformanceDescription["tables"];
// TODO : Have the sounds in the ball IDs instead of in the template.
// TODO : Same for ball template names ? No, I don't think so. We may have template names not present.
export type JugglingScore = {
    balls: {
        id: string;
        templateName: string;
        soundOnCatch?: BallSoundDescription;
        soundOnToss?: BallSoundDescription;
    }[];
    jugglers: {
        name: string;
        ballsHeldAtStart: [(string | undefined)[], (string | undefined)[]]; // TODO : Fuse with leftHand.heldSpots ???
        beatReference: JugglerBeatReference;
        jugglingPhrases: JugglingPhrase[];
        defaultTableID?: string;
    }[];
    tables: {
        id: string;
        spots: {
            name: string;
            ballID?: string;
            acceptedBallName: string;
        }[];
        unknownSpot: {
            ballIDs: string[];
        };
    }[];
    globalBeat: GlobalBeatDescription;
};

// TODO : Check if scale is working correctly.
// TODO : Move sounds back to mise en scene (they shouldn't be in score).
export type PerformanceLayout = {
    balls: {
        id: string;
        radius: number;
    }[];
    jugglers: {
        name: string;
        position: [number, number, number];
        rotation: [number, number, number];
        scale: [number, number, number];
        leftHand: DeepRequired<HandLayoutDescription>;
        rightHand: DeepRequired<HandLayoutDescription>;
    }[];
    tables: {
        id: string;
        position: [number, number, number];
        rotation: [number, number, number];
        scale: [number, number, number];
        spots: {
            name: string;
            position: [number, number, number];
            rotation: [number, number, number];
        }[];
        unknownSpot: {
            position: [number, number, number];
            rotation: [number, number, number];
        };
    }[];
};

export type BallMeshDescription = {
    id: string;
    color: ColorDescription;
    radius: number;
};

export type PerformanceMeshesDescription = {
    balls: BallMeshDescription[];
    jugglers: {
        name: string;
        leftHand: HandMeshDescription; //TODO : Make optional.
        rightHand: HandMeshDescription;
        body: BodyMeshDescription;
    }[];
    tables: TableMeshDescription[];
};

//TODO : Have tables independent of juggler, and just have parameter for juggler default table.
// that way, multiple jugglers can take from the same spot.
// No need for now to implement custom taking from siteswap, later.
// Remake scheduler with proper juggler states that hold ref to world state, as no problem with cyclic dep.
// So that they can access all other tables and jugglers.
// Also, as Nicolas said, no big difference for spots on table or hand or on body.
// It is jsut that the ones on hands have the special insertion rule, but that can be given by an outside function.
// Defaultposwith3balls(spot1, spot2, spot3).

// export type PerformanceMeshesDescription = {
//     balls: {
//         name: string;
//         color: ColorDescription;
//         radius: number;
//     }[];
//     jugglers: {
//         name: string;
//         leftHand: HandMeshDescription; //TODO : Make optional.
//         rightHand: HandMeshDescription;
//         body: BodyMeshDescription;
//         table?: TableMeshDescription;
//     }[];
// };

export type ColorDescription = number | string;
export type FractionDescription = number | string;

export type Sound = { type: "note"; note: string } | { type: "url"; url: string };
// | { type: "path" }; //TODO : Support audio buffer Base64-encoded in JSON Description.

// export type TimeInSeconds = { type: "byTime"; seconds: FractionDescription };
// export type TimeByBeat = { type: "byBeat"; beat: FractionDescription };
// export type TimeByBarBeat = { type: "byBarBeat"; bar: number; beatInBar: FractionDescription };
// export type TimeByFollow = { type: "followPrevious" };
// export type TimeByLocalBeat = { type: "byLocalBeat"; beat: FractionDescription };
// export type TimeByGlobalBeat = { type: "byGlobalBeat"; beat: FractionDescription };
// export type TimeByGlobalBarBeat = {
//     type: "byGlobalBarBeat";
//     bar: number;
//     beatInBar: FractionDescription;
// };

export type SpotDescription = {
    position: [number, number, number];
    rotation?: [number, number, number]; // Rotation indicates with its "y" axis where the up is, and therefore how the ball should be put on top of the spot.
};

export type HandLayoutDescription = {
    // TODO : have hand spot templates to avoid redundancy.
    // TODO : find a way to make optional.
    tossSpot: SpotDescription; // Relative to juggler origin. //P
    catchSpot: SpotDescription; // Relative to juggler origin. //P
    restSpot?: SpotDescription; // Relative to juggler origin. //P
    swapSpot?: SpotDescription; // Relative to juggler origin. //P
    heldSpots?: SpotDescription[]; // Relative to hand's wrist (x is towards thumb, y towards up, z towards fingers).
};

export type HandMeshDescription = {
    length: number; // From wrist to fingertip.
    width: number; // From thumb to little finger.
    depth: number; // From palm to back.
    visible: boolean; //P
    color: ColorDescription;
};

export type BodyMeshDescription = {
    height: number; //P
    width: number; //P
    depth: number; //P
    color: ColorDescription; //P
    visible: boolean; //P
};

export type TableMeshDescription = {
    id: string;
    height: number;
    width: number;
    depth: number;
    visible: boolean;
    color: ColorDescription;
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

export type JugglerBeatReference = {
    jugglerBeat: FractionDescription;
    globalTime:
        | { type: "byTime"; seconds: FractionDescription }
        | { type: "byGlobalBeat"; beat: FractionDescription }
        | {
              type: "byGlobalBarBeat";
              bar: number;
              beatInBar: FractionDescription;
          };
};

export type BallDescription = {
    name: string;
    id?: string;
};

//TODO : Rename startTime ???
export type LocalBeatStartTime =
    | { type: "followPrevious" } // directly follows previous phrase.
    | { type: "byTime"; seconds: FractionDescription }
    | { type: "byLocalBeat"; beat: FractionDescription } // Specify toss number.
    | { type: "byGlobalBeat"; beat: FractionDescription } // Specify beat counts since start.
    | {
          type: "byGlobalBarBeat";
          bar: number;
          beatInBar: FractionDescription;
      }; // Specify bar and beat in bar.

export type LocalTempo<FractionType> =
    | { type: "perGlobalBeat"; beatsPerGlobalBeat: FractionType }
    | { type: "perMinute"; beatsPerMinute: FractionType };

export type JugglingPhrase = {
    startTime: LocalBeatStartTime;
    localBaseTempo?: LocalTempo<FractionDescription>;
    localTempoMultiplier?: FractionDescription;
    setupHands?: HandsInstructions;
    pattern?: string;
};

export type GlobalBeatStartTime<FractionType = FractionDescription> =
    | {
          type: "byBeat";
          beat: FractionType;
      }
    | { type: "byBarBeat"; bar: number; beatInBar: FractionType }
    | { type: "byTime"; seconds: FractionType };

export type GlobalBeatDescription<FractionType = FractionDescription> = {
    beatReference: GlobalBeatReference<FractionType>;
    changes: {
        startTime: GlobalBeatStartTime<FractionType>;
        beatsInBar?: FractionType;
        beatsPerMinute?: FractionType;
        // tempoMultiplier?: FractionType;
    }[];
};

export type GlobalBeatReference<FractionType = FractionDescription> = {
    beat: FractionType;
    timeInSeconds: FractionType;
    barBeat: { bar: number; beat: FractionType };
};
// TODO : Unify with scheduler LocType ?

export type BallSoundDescription = {
    name: string | string[];
    /**
     * Whether the sound should loop until the next event. False by default.
     */
    loop?: boolean;
};

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

// function foo(x: PerformanceDescription) {}
// function foo1(x: JugglingScore) {}
// function foo2(x: PerformanceLayout) {}
// function foo3(x: PerformanceMeshesDescription) {}
// const a: PerformanceDescription = {
//     balls: [],
//     jugglers: [],
//     tables: [],
//     globalBeat: {
//         beatReference: { beat: 0, barBeat: { bar: 0, beat: 0 }, timeInSeconds: 0 },
//         changes: []
//     }
// };
// const a1: JugglingScore = a;
// const a2: PerformanceLayout = a;
// const a3: PerformanceMeshesDescription = a;
// foo1(a);
// foo1(a1);
// foo2(a2);
// foo2(a2);
// foo3(a3);
// foo3(a3);
