import * as THREE from "three";
// import {
//     formatRawEventInput,
//     JugglingAppParams,
//     PreParserEvent
// } from "../inference/JugglingApp.js";
// import { FracSortedList, Scheduler } from "../inference/Scheduler.js";
// import {
//     EventSound,
//     getNoteBuffer,
//     MusicBeatConverter,
//     MusicTempo,
//     ParserToSchedulerParams,
//     simulateEvents,
//     TimeConductor,
//     transformParserParamsToSchedulerParams
// } from "../MusicalJuggling.js";
// import Fraction from "fraction.js";
// import { V3SCA } from "../utils/three/StaticOp.js";
import { BallModel } from "./BallModel.js";
import { JugglerModel } from "./JugglerModel.js";
import { TableModel } from "./TableModel.js";
// import { Map as FrozenMap, MapOf } from "immutable";

// Découpage en petits bouts spécialisés qui communique par des API.

/* TODO : juggling model / simulator / canvas refactor
The model handles :
 - the timeline of events
 - computing / providing the position, velocities and trajectories at any time. (NO, MAYBE, this needs the knowledge of jugglers positions, which is rather the part of the simulator ? We could have the calculations ask as parameters some elements of the model (jugglers position, ...) to give its answer. Are this information part of the model, or should they be passed as arguments ?) I am a bit confused because this should be the part working without any threeJS. This part, whether only the model or not, should be able to compute ball position based on position given by three's meshes in the simulator.
 If we give position as parameters here, one model can be shared by multiple simulators. If not, the coupling is tighter and one model can give rise to only one simulator, as it has this data as fields. I think the first option is preferrable. Or the second ? Think about it !

 The simulator handles (it can help to see that one model may serve for multiple simulators in parallel (if for instance in the graph exploration of patterns, we show side by side two figures ? (this doens't work as the two patterns would be different))).
 - Ownership of the model.
 - The collection of meshes of balls, jugglers.
 - Playing the sounds of the balls.
 - Giving a function to update the balls position based on time.
 - the timeConductor ? (see below). 
 - How does it dispose of its ressources ?
 - Should we be able to mutate jugglers / balls / etc as it depends on the model ? (eternal question)

 The canvas handles : (it helps if you think of the canvas as potentially having multiple simulators running inside of it at the same time, like "a museum" of patterns).
 - The clock (timeConductor) for the pattern is handled by the canvas or by the simulator ? It may be shared by multiple simulators, but we could want multiple simulators in the same scene to havi different clocks. 
 - The render and window resizing affects the canvas only.
 - The Listener is linked to the camera
*/

// TODO 27.05.25 : Rename Simulator to Troup
// TODO 27.05.25 : Do factory method to help with creating pattern instead ?
// TODO 27.05.25 : method to facilitate not having to add balls to the scene
// TODO 27.05.25 : immutable data structures ? + readonly attributes ?
// TODO 27.05.25 : change bounds and duration (normalize) return to undefined instead of [null, null]

//TODO : Handle sounds pausing when simulator pauses.
//TODO : Handle gentle implementation of sounds (do not make them mandatory).
//TODO : Make empty timeline balls behave better than throwing an error.
//TODO : More generally, when in render an error is thrown, it shouldn't crash the page.
//TODO : Bowling pin juggler model.
//TODO : How to handle autostart ?
//TODO : Should there be two way communication with the timecontroller ? Should it be optional ?
//TODO : Move helpers into custom function to activate / deactivate them at will ?
//TODO : Allow any camera (struggle comes from resizetorendersize aspect) ?
//TODO : Remove "Request" from method names to make it easier to wrap head around.
//TODO : Smooth ball pause sound / play the sound at the right time in the sound if the time has moved
//To make illusion of movie.
//TODO : Custom method or readonly to change scene, etc, so as not to have user use this functions
//And break things (for instance : changing controls without removing / adding the eventListener)

//TODO : onended.
//TODO : Change getPatternDuration to getPatternBounds and return undefined not null.

/*
TODO : Add methods to easily use simulator class.
Expose playBackRate, gravity
Make time system adaptable to audio / no audio.
Handle adding / removing juggler / patterns + sanitizing
All aesthetic things (color, ground)
*/

//TODO : Create default class implementing TimeController.
// The TimeController Interface is used to connect the simulator to an interface.
// It should implement a method getTime (to allow the simulator to know what frame to render, in milliseconds).
// It should implement a method isPaused (to figure out if the simulator is initially playing or paused).
// The TimeController should also call:
// - the play method of the simulator to resume playback.
// - the pause method of the simulator to freeze it.
// - the requestRenderIfNotRequested method of the simulator to render a single frame when paused.

interface TroupModelParams {
    origin?: THREE.Vector3;
    jugglers?: Map<string, JugglerModel>;
    balls?: Map<string, BallModel>;
    tables?: Map<string, TableModel>;
}

export class TroupModel {
    readonly balls: Map<string, BallModel>;
    readonly jugglers: Map<string, JugglerModel>;
    readonly tables: Map<string, TableModel>;
    origin: THREE.Vector3;

    constructor({ balls, jugglers, tables, origin }: TroupModelParams) {
        this.balls = balls ?? new Map<string, BallModel>();
        this.jugglers = jugglers ?? new Map<string, JugglerModel>();
        this.tables = tables ?? new Map<string, TableModel>();
        this.origin = origin ?? new THREE.Vector3();
    }

    /**
     * Computes the pattern's duration.
     * TO FIX : can be a bit bugged.
     * @returns
     * - [null, null] if no event happens in the timeline.
     * - [startTime, endTime] otherwise.
     */
    patternDuration(): [number, number] | [null, null] {
        let startTime: number | null = null;
        let endTime: number | null = null;
        for (const juggler of this.jugglers.values()) {
            const [handStartTime, handEndTime] = juggler.patternTimeBounds();
            if (startTime === null || (handStartTime !== null && startTime > handStartTime)) {
                startTime = handStartTime;
            }
            if (endTime === null || (handEndTime !== null && endTime > handEndTime)) {
                endTime = handEndTime;
            }
        }
        // TODO : FIX HAND MOVEMENT AT THE END HAPPENING AFTER THE END.
        // @ts-expect-error startTime is null if and only if endTime is null too.
        return [
            startTime === null ? startTime : startTime - 2,
            endTime === null ? endTime : endTime + 2
        ];
    }

    // static fromPattern({
    //     jugglers: rawJugglers,
    //     musicConverter: rawMusicConverter,
    //     table: rawTable
    // }: JugglingAppParams): TroupModel {
    //     //TODO : Separate in own function.
    //     //TODO : Sanitize here too ! (different juggler names, etc)
    //     //TODO : In MusicBeatConverter (and here before), Sort tempo and signature changes !!
    //     // 1. Create parser parameters.

    //     // 1a. rawMusicConverter
    //     const signatureChanges: [number, Fraction][] = [];
    //     const tempoChanges: [number, MusicTempo][] = [];
    //     for (const [number, { signature, tempo }] of rawMusicConverter) {
    //         if (signature !== undefined) {
    //             signatureChanges.push([number, new Fraction(signature)]);
    //         }
    //         if (tempo !== undefined) {
    //             tempoChanges.push([number, { note: new Fraction(tempo.note), bpm: tempo.bpm }]);
    //         }
    //     }
    //     const musicConverter = new MusicBeatConverter(signatureChanges, tempoChanges);

    //     // 1b. rawJugglers
    //     const preParserJugglers = new Map<
    //         string,
    //         { balls: { id: string; name: string }[]; events: FracSortedList<PreParserEvent> }
    //     >();
    //     for (const [jugglerName, { balls, events: rawEvents }] of rawJugglers) {
    //         preParserJugglers.set(jugglerName, {
    //             balls: balls,
    //             events: formatRawEventInput(rawEvents, musicConverter)
    //         });
    //     }
    //     if (preParserJugglers.size !== rawJugglers.length) {
    //         throw Error("TODO : Duplicate juggler name");
    //     }

    //     // 1c. Gather ball info from jugglers.
    //     //TODO : Fuse ballIDs and BallIDSounds ?
    //     //TODO : Sound on toss / catch.
    //     const ballIDs = new Map<
    //         string,
    //         { name: string; sound?: string; juggler: string; color?: string | number }
    //     >();
    //     const ballNames = new Set<string>();
    //     const ballSounds = new Set<string>();
    //     for (const [jugglerName, { balls }] of rawJugglers) {
    //         for (const ball of balls) {
    //             if (ballIDs.has(ball.id)) {
    //                 throw Error("TODO : Duplicate ball ID");
    //             }
    //             ballIDs.set(ball.id, {
    //                 name: ball.name,
    //                 sound: ball.sound,
    //                 juggler: jugglerName,
    //                 color: ball.color
    //             });
    //             ballNames.add(ball.name);
    //             if (ball.sound !== undefined) {
    //                 ballSounds.add(ball.sound);
    //             }
    //         }
    //     }

    //     // 1d. Compile the parameters for the parser.
    //     const parserParams: ParserToSchedulerParams = {
    //         ballNames: ballNames,
    //         ballIDs: ballIDs,
    //         jugglers: preParserJugglers,
    //         musicConverter: musicConverter
    //     };

    //     //TODO : Rename to parser only ? Name of method a bit convoluted.
    //     const schedulerParams = transformParserParamsToSchedulerParams(parserParams);
    //     const postSchedulerParams = new Scheduler(schedulerParams).validatePattern();

    //     const jugglerGeometry = createJugglerCubeGeometry();
    //     const jugglerMaterial = createJugglerMaterial();
    //     const tableMaterial = createTableMaterial();
    //     for (let i = 0; i < rawJugglers.length; i++) {
    //         const jugglerName = rawJugglers[i][0];
    //         let table: Table | undefined;
    //         if (rawTable === undefined) {
    //             table = undefined;
    //         } else {
    //             const tableObject =
    //                 rawTable.realDimensions === undefined
    //                     ? undefined
    //                     : createTableObject(
    //                           createTableGeometry(
    //                               rawTable.realDimensions.height,
    //                               rawTable.realDimensions.width,
    //                               rawTable.realDimensions.depth
    //                           ),
    //                           tableMaterial
    //                       );
    //             const ballsPlacement = new Map<string, [number, number]>(rawTable.ballsPlacement);
    //             table = new Table({
    //                 tableObject: tableObject,
    //                 ballsPlacement: ballsPlacement,
    //                 surfaceInternalSize: rawTable.internalDimensions,
    //                 unkownBallPosition: rawTable.unknownBallPosition
    //             });
    //         }
    //         const juggler = new Juggler({
    //             mesh: new THREE.Mesh(jugglerGeometry, jugglerMaterial),
    //             defaultTable: table
    //         });
    //         const angleBtwJugglers = Math.PI / 8;
    //         const angle1 = Math.PI - (angleBtwJugglers * (rawJugglers.length - 1)) / 2;
    //         const angle2 = Math.PI + (angleBtwJugglers * (rawJugglers.length - 1)) / 2;
    //         const ratio = rawJugglers.length === 1 ? 0.5 : i / (rawJugglers.length - 1);
    //         const angle = angle1 + ratio * (angle2 - angle1);
    //         const positionNormalized = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    //         this.addJuggler(jugglerName, juggler, V3SCA(2.0, positionNormalized));

    //         //TODO : Handle table position based on juggler.
    //         if (table !== undefined) {
    //             this.addTable(jugglerName, table);
    //             table.mesh.position.copy(V3SCA(1.5, positionNormalized));
    //         }
    //     }

    //     const soundBuffers = new Map<string, AudioBuffer>();
    //     for (const sound of ballSounds) {
    //         getNoteBuffer(sound, this.listener!.context)
    //             .then((buffer) => {
    //                 if (buffer !== undefined) {
    //                     soundBuffers.set(sound, buffer);
    //                 }
    //             })
    //             .catch(() => {
    //                 console.log("Something went wrong");
    //             });
    //     }

    //     const ballRadius = 0.1;
    //     const ballGeometry = createBallGeometry(ballRadius);
    //     //TODO : Color as part of the spec possibly ?

    //     for (const [ID, { sound, juggler, color }] of ballIDs) {
    //         const ballMaterial = createBallMaterial(color ?? "pink");
    //         //TODO : Change sound.node ? (only specify positional or non-positional).
    //         //TODO : How to not have to specify the listener ?
    //         const ball = new Ball({
    //             mesh: new THREE.Mesh(ballGeometry, ballMaterial),
    //             defaultJuggler: this.jugglers.get(juggler)!,
    //             id: ID,
    //             radius: ballRadius,
    //             sound:
    //                 sound === undefined
    //                     ? undefined
    //                     : {
    //                           buffers: soundBuffers,
    //                           node: new THREE.PositionalAudio(this.listener!)
    //                       }
    //         });
    //         this.addBall(ID, ball);
    //     }

    //     // x. Creating the params for the simulation
    //     const ballIDSounds2 = new Map<
    //         string,
    //         {
    //             onToss?: string | EventSound;
    //             onCatch?: string | EventSound;
    //         }
    //     >();
    //     for (const [name, sound] of ballIDs) {
    //         ballIDSounds2.set(name, { onCatch: sound });
    //     }
    //     simulateEvents({
    //         simulator: this,
    //         jugglers: postSchedulerParams,
    //         ballIDSounds: ballIDSounds2,
    //         musicConverter: musicConverter
    //     });
    // }
}
