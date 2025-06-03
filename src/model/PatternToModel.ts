import Fraction from "fraction.js";
import { FracSortedList, Scheduler, SimulatorEvent } from "../inference/Scheduler";
import { MusicBeatConverter, MusicTempo, MusicTime } from "../inference/MusicBeatConverter";
import {
    ParserToSchedulerParams,
    transformParserParamsToSchedulerParams as parserParamsToSchedulerParams
} from "../inference/ParserToScheduler";
import { createJugglerCubeGeometry, createJugglerMaterial, Juggler } from "../simulator/Juggler";
import * as THREE from "three";
import { TableModel } from "../model/TableModel";
import { BallModel } from "../model/BallModel";
import { getNoteBuffer } from "../simulator/NoteBank";
import { V3SCA } from "../utils/three/StaticOp";
import { EventSound } from "../simulator/Timeline";
import { schedulerToModel } from "../inference/SchedulerToModel";
import { TimeConductor } from "../MusicalJuggling";
import { PerformanceModel } from "./PerformanceModel";

export type RawPreParserEvent = {
    tempo?: string;
    hands?: [string[], string[]];
    pattern?: string /*; useHand?: "L" | "R" */;
};

export type PreParserEvent = {
    tempo?: Fraction;
    hands?: [string[], string[]];
    pattern?: string /*; useHand?: "L" | "R" */;
};

export type RawMusicConverter = [
    number,
    {
        signature?: string;
        tempo?: {
            note: string;
            bpm: number;
        };
    }
][];

//TODO : Table Param ? (impact on scheduler)
//TODO : Silent Throws ?
//TODO : Specify Hand site for balls ?
//TODO : Have final repr in simulator using only splines ?
//TODO : Soft errors in simulator ! (with error Logger too ?) HECK YEAH !
//TODO : In Scheduler Ball, rename "name" with "sound" ?
//TODO : Separate siteswap params from "aesthetic params".
//TODO : Fix Ball buffer not loaded when sound requested to play. (do this whith by default undefined in buffer, and do not worry if not there.)
//TODO: Make name optional.
//TODO: Make table optional (consider it in scheduler) Can not have swap events.
export interface JugglingPatternRaw {
    jugglers: {
        balls: { id: string; name: string; sound?: string }[];
        name: string;
        events: [string, RawPreParserEvent][];
        table?: string;
    }[];
    musicConverter: RawMusicConverter;
}

export function patternToModel({
    jugglers: rawJugglers,
    musicConverter: rawMusicConverter
}: JugglingPatternRaw): PerformanceModel {
    //TODO : Sanitize here too ! (different juggler names, etc)
    //TODO : In MusicBeatConverter (and here before), Sort tempo and signature changes !!

    // 1. Create parser parameters.
    // 1a. rawMusicConverter
    const signatureChanges: [number, Fraction][] = [];
    const tempoChanges: [number, MusicTempo][] = [];
    for (const [number, { signature, tempo }] of rawMusicConverter) {
        if (signature !== undefined) {
            signatureChanges.push([number, new Fraction(signature)]);
        }
        if (tempo !== undefined) {
            tempoChanges.push([number, { note: new Fraction(tempo.note), bpm: tempo.bpm }]);
        }
    }
    const musicConverter = new MusicBeatConverter(signatureChanges, tempoChanges);

    // 1b. rawJugglers
    const preParserJugglers = new Map<
        string,
        {
            balls: { id: string; name: string }[];
            events: FracSortedList<PreParserEvent>;
            table?: string;
        }
    >();
    for (const { name, events: rawEvents, balls, table } of rawJugglers) {
        preParserJugglers.set(name, {
            balls: balls,
            events: formatRawEventInput(rawEvents, musicConverter),
            table: table
        });
    }
    if (preParserJugglers.size !== rawJugglers.length) {
        throw Error("TODO : Duplicate juggler name");
    }

    // 1c. Gather ball info from jugglers.
    //TODO : Fuse ballIDs and BallIDSounds ?
    //TODO : Sound on toss / catch.
    const ballIDs = new Map<
        string,
        { name: string; sound?: string; juggler: string; id: string }
    >();
    const ballNames = new Set<string>();
    const ballSounds = new Set<string>();
    for (const { name, balls } of rawJugglers) {
        for (const ball of balls) {
            if (ballIDs.has(ball.id)) {
                throw Error("TODO : Duplicate ball ID");
            }
            ballIDs.set(ball.id, {
                name: ball.name,
                sound: ball.sound,
                juggler: name,
                id: ball.id
            });
            ballNames.add(ball.name);
            if (ball.sound !== undefined) {
                ballSounds.add(ball.sound);
            }
        }
    }

    // 1d. Compile the parameters for the parser.
    const parserParams: ParserToSchedulerParams = {
        ballNames: ballNames,
        ballIDs: ballIDs,
        jugglers: preParserJugglers,
        musicConverter: musicConverter
    };

    //TODO : Rename to parser only ? Name of method a bit convoluted.
    const schedulerParams = parserParamsToSchedulerParams(parserParams);
    const postSchedulerParams = new Scheduler(schedulerParams).validatePattern();

    // Creating the params for the simulation
    // const ballIDSounds2 = new Map<
    //     string,
    //     {
    //         onToss?: string | EventSound;
    //         onCatch?: string | EventSound;
    //     }
    // >();
    // for (const [name, sound] of ballIDs) {
    //     ballIDSounds2.set(name, { onCatch: sound });
    // }

    const jugglerParams = new Map<
        string,
        {
            table?: string;
            events: FracSortedList<SimulatorEvent<Fraction>>;
        }
    >();
    for (const [name, { events }] of postSchedulerParams) {
        jugglerParams.set(name, { events, table: preParserJugglers.get(name)?.table });
    }

    return schedulerToModel({
        jugglers: jugglerParams,
        ballIDSounds: ballIDs,
        musicConverter: musicConverter
    });
}

// export function formatJugglerBalls(
//     commonBallNames: string[],
//     jugglersSpecificBallNames: { name: string; ballNames: string[] }[]
// ): { name: string; balls: Ball[] }[] {
//     const jugglerBalls: { name: string; balls: Ball[] }[] = [];
//     for (const { name: jugglerName, ballNames: specificBallNames } of jugglersSpecificBallNames) {
//         const balls: Ball[] = [];
//         for (const ball of [...commonBallNames, ...specificBallNames]) {
//             balls.push({ id: ball, id: ball + "?" + jugglerName });
//         }
//         jugglerBalls.push({ name: jugglerName, balls: balls });
//     }
//     return jugglerBalls;
// }

export function formatRawTime(time: string): Fraction | MusicTime {
    const numbers = time.replace(" ", "").split(",");
    if (numbers.length < 1 || numbers.length > 2) {
        throw Error(`Can't understand provided time : ${time}`);
    }
    if (numbers.length === 1) {
        return new Fraction(numbers[0]);
    }
    return [parseInt(numbers[0]), new Fraction(numbers[1])];
}

//TODO : add beat to the object rather than have a 2-array element.
//TODO : useHand ?

//TODO : Use ErrorHandler ?
export function formatRawEventInput(
    rawEvents: [string, RawPreParserEvent][],
    musicConverter?: MusicBeatConverter
): [Fraction, PreParserEvent][] {
    const formattedEvents: [Fraction, PreParserEvent][] = [];
    for (const [rawTime, rawEv] of rawEvents) {
        let time = formatRawTime(rawTime);
        if (Array.isArray(time)) {
            if (musicConverter === undefined) {
                throw Error("No Signature information was provided to be able to use measures");
            }
            time = musicConverter.convertMeasureToBeat(time);
        }
        const tempo = rawEv.tempo === undefined ? undefined : new Fraction(rawEv.tempo);
        formattedEvents.push([time, { ...rawEv, tempo: tempo }]);
    }
    return formattedEvents;
}
