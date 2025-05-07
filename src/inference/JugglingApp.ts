import Fraction from "fraction.js";
import { FracSortedList, Scheduler } from "./Scheduler";
import { MusicBeatConverter, MusicTempo, MusicTime } from "./MusicBeatConverter";
import {
    ParserToSchedulerParams,
    transformParserParamsToSchedulerParams
} from "./ParserToScheduler";
import { Simulator } from "../simulator/Simulator";
import { createJugglerCubeGeometry, createJugglerMaterial, Juggler } from "../simulator/Juggler";
import * as THREE from "three";
import {
    createTableGeometry,
    createTableMaterial,
    createTableObject,
    Table
} from "../simulator/Table";
import { Ball, createBallGeometry, createBallMaterial } from "../simulator/Ball";
import { getNoteBuffer } from "../simulator/NoteBank";
import { V3SCA } from "../utils/three/StaticOp";
import { EventSound } from "../simulator/Timeline";
import { simulateEvents } from "./SchedulerToSimulator";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { TimeConductor } from "../MusicalJuggling";

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
export interface JugglingAppParams {
    jugglers: [
        string,
        {
            //TODO: Make name optional.
            //TODO: Make table optional (wonsider it in scheduler) Can not have swap events.
            balls: { id: string; name: string; sound?: string; color?: string | number }[];
            events: [string, RawPreParserEvent][];
        }
    ][];
    musicConverter: RawMusicConverter;
    table?: {
        realDimensions?: { height: number; width: number; depth: number };
        internalDimensions: [number, number];
        ballsPlacement: [string, [number, number]][];
        unknownBallPosition: [number, number];
    };
}

export interface TableConstructorParameters {
    tableObject?: TableObject;
    surfaceInternalSize?: [number, number];
    ballsPlacement?: Map<string, [number, number]>;
    unkownBallPosition?: [number, number];
    debug?: boolean;
}

interface TableObject {
    mesh: THREE.Mesh;
    bottomLeftCorner: THREE.Object3D;
    upRightCorner: THREE.Object3D;
}

export function jugglingApp(
    canvas: HTMLCanvasElement,
    { jugglers: rawJugglers, musicConverter: rawMusicConverter, table: rawTable }: JugglingAppParams
): void {
    //TODO : Separate in own function.
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
        { balls: { id: string; name: string }[]; events: FracSortedList<PreParserEvent> }
    >();
    for (const [jugglerName, { balls, events: rawEvents }] of rawJugglers) {
        preParserJugglers.set(jugglerName, {
            balls: balls,
            events: formatRawEventInput(rawEvents, musicConverter)
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
        { name: string; sound?: string; juggler: string; color?: string | number }
    >();
    const ballNames = new Set<string>();
    const ballSounds = new Set<string>();
    for (const [jugglerName, { balls }] of rawJugglers) {
        for (const ball of balls) {
            if (ballIDs.has(ball.id)) {
                throw Error("TODO : Duplicate ball ID");
            }
            ballIDs.set(ball.id, {
                name: ball.name,
                sound: ball.sound,
                juggler: jugglerName,
                color: ball.color
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
    const schedulerParams = transformParserParamsToSchedulerParams(parserParams);
    const postSchedulerParams = new Scheduler(schedulerParams).validatePattern();

    const timeConductor = new TimeConductor();
    // timeConductor.playbackRate = 0.1;
    const simulator = new Simulator({
        canvas: canvas,
        enableAudio: ballSounds.size !== 0,
        timeConductor: timeConductor,
        debug: { showFloorGrid: true, showFloorAxis: true }
    });
    // bindTimeConductorAndSimulator(timeConductor, simulator);

    const jugglerGeometry = createJugglerCubeGeometry();
    const jugglerMaterial = createJugglerMaterial();
    const tableMaterial = createTableMaterial();
    for (let i = 0; i < rawJugglers.length; i++) {
        const jugglerName = rawJugglers[i][0];
        let table: Table | undefined;
        if (rawTable === undefined) {
            table = undefined;
        } else {
            const tableObject =
                rawTable.realDimensions === undefined
                    ? undefined
                    : createTableObject(
                          createTableGeometry(
                              rawTable.realDimensions.height,
                              rawTable.realDimensions.width,
                              rawTable.realDimensions.depth
                          ),
                          tableMaterial
                      );
            const ballsPlacement = new Map<string, [number, number]>(rawTable.ballsPlacement);
            table = new Table({
                tableObject: tableObject,
                ballsPlacement: ballsPlacement,
                surfaceInternalSize: rawTable.internalDimensions,
                unkownBallPosition: rawTable.unknownBallPosition
            });
        }
        const juggler = new Juggler({
            mesh: new THREE.Mesh(jugglerGeometry, jugglerMaterial),
            defaultTable: table
        });
        const angleBtwJugglers = Math.PI / 8;
        const angle1 = Math.PI - (angleBtwJugglers * (rawJugglers.length - 1)) / 2;
        const angle2 = Math.PI + (angleBtwJugglers * (rawJugglers.length - 1)) / 2;
        const ratio = rawJugglers.length === 1 ? 0.5 : i / (rawJugglers.length - 1);
        const angle = angle1 + ratio * (angle2 - angle1);
        const positionNormalized = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
        simulator.addJuggler(jugglerName, juggler, V3SCA(2.0, positionNormalized));

        //TODO : Handle table position based on juggler.
        if (table !== undefined) {
            simulator.addTable(jugglerName, table);
            table.mesh.position.copy(V3SCA(1.5, positionNormalized));
        }
    }

    const soundBuffers = new Map<string, AudioBuffer>();
    for (const sound of ballSounds) {
        getNoteBuffer(sound, simulator.listener!.context)
            .then((buffer) => {
                if (buffer !== undefined) {
                    soundBuffers.set(sound, buffer);
                }
            })
            .catch(() => {
                console.log("Something went wrong");
            });
    }

    const ballRadius = 0.1;
    const ballGeometry = createBallGeometry(ballRadius);
    //TODO : Color as part of the spec possibly ?

    for (const [ID, { sound, juggler, color }] of ballIDs) {
        const ballMaterial = createBallMaterial(color ?? "pink");
        //TODO : Change sound.node ? (only specify positional or non-positional).
        //TODO : How to not have to specify the listener ?
        const ball = new Ball({
            mesh: new THREE.Mesh(ballGeometry, ballMaterial),
            defaultJuggler: simulator.jugglers.get(juggler)!,
            id: ID,
            radius: ballRadius,
            sound:
                sound === undefined
                    ? undefined
                    : {
                          buffers: soundBuffers,
                          node: new THREE.PositionalAudio(simulator.listener!)
                      }
        });
        simulator.addBall(ID, ball);
    }
    // timeConductor.playbackRate = 1.0;

    // x. Creating the params for the simulation
    const ballIDSounds2 = new Map<
        string,
        {
            onToss?: string | EventSound;
            onCatch?: string | EventSound;
        }
    >();
    for (const [name, sound] of ballIDs) {
        ballIDSounds2.set(name, { onCatch: sound });
    }
    simulateEvents({
        simulator: simulator,
        jugglers: postSchedulerParams,
        ballIDSounds: ballIDSounds2,
        musicConverter: musicConverter
    });

    const timeBounds = simulator.getPatternDuration(); //TODO : FIX ! (problem sur les bords.)
    // createControls(
    //     document.body,
    //     timeConductor,
    //     timeBounds[0] === null ? undefined : [timeBounds[0] - 0.5, timeBounds[1] + 0.5]
    // );

    // document.body.appendChild(VRButton.createButton(simulator.renderer));
    simulator.renderer.xr.enabled = true;
    simulator.renderer.setAnimationLoop(function () {
        // XRControls

        simulator.renderer.render(simulator.scene, simulator.camera);
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
