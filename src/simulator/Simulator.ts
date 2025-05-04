import * as THREE from "three";
import { Ball, createBallGeometry, createBallMaterial } from "./Ball";
import { createJugglerCubeGeometry, createJugglerMaterial, Juggler } from "./Juggler";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/Addons.js";
import { createTableGeometry, createTableMaterial, createTableObject, Table } from "./Table";
import { formatRawEventInput, JugglingAppParams, PreParserEvent } from "../inference/JugglingApp";
import { FracSortedList, Scheduler } from "../inference/Scheduler";
import {
    EventSound,
    getNoteBuffer,
    MusicBeatConverter,
    MusicTempo,
    ParserToSchedulerParams,
    simulateEvents,
    TimeConductor,
    transformParserParamsToSchedulerParams
} from "../MusicalJuggling";
import Fraction from "fraction.js";
import { V3SCA } from "../utils/three/StaticOp";

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

//TODO : Create default class implementing TimeController.
// The TimeController Interface is used to connect the simulator to an interface.
// It should implement a method getTime (to allow the simulator to know what frame to render, in milliseconds).
// It should implement a method isPaused (to figure out if the simulator is initially playing or paused).
// The TimeController should also call:
// - the play method of the simulator to resume playback.
// - the pause method of the simulator to freeze it.
// - the requestRenderIfNotRequested method of the simulator to render a single frame when paused.
export interface TimeController {
    getTime: () => number;
    setTime: (time: number) => void;
    isPaused: () => boolean;
    play: () => Promise<void>;
    pause: () => void;
    playbackRate: number;
}

interface SimulatorConstructorParams {
    canvas: HTMLCanvasElement;
    timeConductor?: TimeConductor;
    enableAudio: boolean;
    controls?: OrbitControls; //TODO : Change to control when updating Threejs.
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene | { backgroundColor?: THREE.ColorRepresentation; lights?: THREE.Light[] };
    debug?: { showFloorAxis?: boolean; showFloorGrid: boolean };
    jugglers?: Map<string, Juggler>;
    balls?: Map<string, Ball>;
    tables?: Map<string, Table>;
}

export class Simulator {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    balls: Map<string, Ball>;
    jugglers: Map<string, Juggler>;
    tables: Map<string, Table>;
    private timeConductor!: TimeConductor;
    listener?: THREE.AudioListener;
    private _timeConductorEventListeners: (() => void)[] = [];
    // readonly audioEnabled: boolean;
    // playBackRate: number;
    // paused: boolean;

    constructor({
        canvas,
        timeConductor,
        enableAudio,
        controls,
        camera,
        renderer,
        scene,
        debug,
        balls,
        jugglers,
        tables
    }: SimulatorConstructorParams) {
        // Scene setup
        this.renderer = renderer ?? new THREE.WebGLRenderer({ antialias: true, canvas });
        this.scene = scene instanceof THREE.Scene ? scene : new THREE.Scene();
        if (camera === undefined) {
            const aspect = canvas.clientWidth / canvas.clientHeight;
            this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 50);
            this.camera.position.set(2.0, 1.5, 0);
        } else {
            this.camera = camera;
        }
        if (controls === undefined) {
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.target.set(0, 1.4, 0);
            this.controls.update();
        } else {
            this.controls = controls;
        }
        this.controls.addEventListener("change", this.requestRenderIfNotRequested);
        if (scene instanceof THREE.Scene) {
            this.scene = scene;
        } else {
            const backgroundColor = new THREE.Color(
                scene?.backgroundColor ?? window.getComputedStyle(canvas).backgroundColor
            );
            if (scene?.lights !== undefined) {
                for (const light of scene.lights) {
                    this.scene.add(light);
                }
            } else {
                this.scene.background = backgroundColor;
                const ambient_light = new THREE.AmbientLight(this.scene.background, 2);
                this.scene.add(ambient_light);
                const light = new THREE.DirectionalLight(0xffffff, 1);
                light.position.set(4, 2, -1);
                this.scene.add(light);
            }
        }

        // Helpers
        debug ??= { showFloorAxis: true, showFloorGrid: true };
        if (debug.showFloorAxis) {
            const axes_helper = new THREE.AxesHelper(1.5);
            axes_helper.position.y = 0.001;
            this.scene.add(axes_helper);
        }
        if (debug.showFloorGrid) {
            const grid_helper = new THREE.GridHelper(30, 30);
            this.scene.add(grid_helper);
        }

        //TODO : CHANGE TO CALL ADDXXX FOR EACH ELEM !
        this.balls = balls ?? new Map<string, Ball>();
        this.jugglers = jugglers ?? new Map<string, Juggler>();
        this.tables = tables ?? new Map<string, Table>();

        this.setTimeConductor(timeConductor ?? new TimeConductor());

        if (enableAudio) {
            this.listener = new THREE.AudioListener();
            this.camera.add(this.listener);
        }

        // To make it so we render if the window is resized.
        window.addEventListener("resize", () => this.requestRenderIfNotRequested());
        // To render the scene at least once if paused.
        this.requestRenderIfNotRequested();
    }

    //TODO method to facilitate not having to add balls to the scene
    addJuggler(
        name: string,
        juggler: Juggler,
        position?: THREE.Vector3,
        triggerRender = true
    ): void {
        if (this.jugglers.has(name)) {
            console.log(`Overriding existing juggler ${name}.`);
            this.removeJuggler(name);
        }
        this.jugglers.set(name, juggler);
        if (position !== undefined) {
            juggler.mesh.position.set(position.x, position.y, position.z);
        }
        this.scene.add(juggler.mesh);
        if (triggerRender) {
            this.requestRenderIfNotRequested();
        }
    }

    removeJuggler(name: string, triggerRender = true): void {
        const juggler = this.jugglers.get(name);
        if (juggler !== undefined) {
            this.jugglers.delete(name);
            this.scene.remove(juggler.mesh);
            juggler.dispose();
        }
        if (triggerRender) {
            this.requestRenderIfNotRequested();
        }
    }

    addBall(name: string, ball: Ball, triggerRender = true) {
        if (this.balls.has(name)) {
            console.log(`Overriding existing ball ${name}.`);
            this.removeBall(name);
        }
        this.balls.set(name, ball);
        this.scene.add(ball.mesh);
        if (triggerRender) {
            this.requestRenderIfNotRequested();
        }
    }

    removeBall(name: string, triggerRender = true): void {
        const ball = this.balls.get(name);
        if (ball !== undefined) {
            this.balls.delete(name);
            this.scene.remove(ball.mesh);
            ball.dispose();
        }
        if (triggerRender) {
            this.requestRenderIfNotRequested();
        }
    }

    addTable(name: string, table: Table, triggerRender = true) {
        if (this.tables.has(name)) {
            console.log(`Overriding existing ball ${name}.`);
            this.removeTable(name);
        }
        this.tables.set(name, table);
        this.scene.add(table.mesh);
        if (triggerRender) {
            this.requestRenderIfNotRequested();
        }
    }

    removeTable(name: string, triggerRender = true): void {
        const table = this.tables.get(name);
        if (table !== undefined) {
            this.tables.delete(name);
            this.scene.remove(table.mesh);
            table.dispose();
        }
        if (triggerRender) {
            this.requestRenderIfNotRequested();
        }
    }

    getTimeConductor(): TimeConductor {
        return this.timeConductor;
    }

    setTimeConductor(newTimeConductor: TimeConductor) {
        // 1. Remove the old timeConductor's event listeners.
        this._timeConductorEventListeners.forEach((removeEventListenerFunc) =>
            removeEventListenerFunc()
        );

        // 2. Add the new timeConductor and event listeners.
        this.timeConductor = newTimeConductor;
        // Event listener when play is pressed.
        const removeEventListenerPlay = this.timeConductor.addEventListener("play", () => {
            this.requestRenderIfNotRequested();
        });
        // Event listener when pause is pressed.
        const removeEventListenerPause = this.timeConductor.addEventListener("pause", () => {
            for (const ball of this.balls.values()) {
                //TODO : Make proper pause ?
                ball.sound?.node.stop();
            }
            this.requestRenderIfNotRequested(); // TODO : Needed ?
        });
        // Event listener when time changes manually. (Also gets called additionnaly when timer is ticking, TODO fix with either manualUpdate event, or by offsetting to UI the periodic checks (better).)
        const updateEventListenerPlay = this.timeConductor.addEventListener("timeUpdate", () => {
            this.requestRenderIfNotRequested();
        });
        this._timeConductorEventListeners = [
            removeEventListenerPlay,
            removeEventListenerPause,
            updateEventListenerPlay
        ];
    }

    /**
     * The render loop of the simulator. It is private as calling it multiple times would
     * trigger multiple renders. You should instead use the public method requestRenderIfNotRequested.
     */
    private render(): void {
        resizeRendererToDisplaySize(this.renderer, this.camera);

        const simulatorTime = this.timeConductor.getTime();
        for (const ball of this.balls.values()) {
            ball.render(simulatorTime);
            ball.triggerSound(simulatorTime, this.timeConductor.isPaused());
        }
        this.jugglers.forEach((juggler) => {
            juggler.render(simulatorTime);
        });
        this.renderer.render(this.scene, this.camera);

        if (!this.timeConductor.isPaused()) {
            this.requestRenderIfNotRequested();
        }
    }

    requestRenderIfNotRequested = createRequestRenderIfNotRequestedFunction(this.render.bind(this));

    getPatternDuration(): [number, number] | [null, null] {
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
        return [startTime, endTime === null ? endTime : endTime + 2];
    }

    setMasterVolume(gain: number): void {
        this.listener?.setMasterVolume(gain);
    }

    //TODO : SHouldn't hands / jugglers handle removal from scene ?
    // TODO : Reset position, time, etc ?
    reset(): void {
        for (const name of this.jugglers.keys()) {
            this.removeJuggler(name);
        }
        for (const name of this.balls.keys()) {
            this.removeBall(name);
        }
        for (const name of this.tables.keys()) {
            this.removeTable(name);
        }
        this.timeConductor.pause();
        this.timeConductor.setTime(0);
        // this.timeController.playbackRate = 1;
    }

    setupPattern({
        jugglers: rawJugglers,
        musicConverter: rawMusicConverter,
        table: rawTable
    }: JugglingAppParams): void {
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
            this.addJuggler(jugglerName, juggler, V3SCA(2.0, positionNormalized));

            //TODO : Handle table position based on juggler.
            if (table !== undefined) {
                this.addTable(jugglerName, table);
                table.mesh.position.copy(V3SCA(1.5, positionNormalized));
            }
        }

        const soundBuffers = new Map<string, AudioBuffer>();
        for (const sound of ballSounds) {
            getNoteBuffer(sound, this.listener!.context)
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
                defaultJuggler: this.jugglers.get(juggler)!,
                id: ID,
                radius: ballRadius,
                sound:
                    sound === undefined
                        ? undefined
                        : {
                              buffers: soundBuffers,
                              node: new THREE.PositionalAudio(this.listener!)
                          }
            });
            this.addBall(ID, ball);
        }

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
            simulator: this,
            jugglers: postSchedulerParams,
            ballIDSounds: ballIDSounds2,
            musicConverter: musicConverter
        });

        // Updating the timeconductor
        this.timeConductor.pause();

        let bounds = this.getPatternDuration();
        this.timeConductor.setBounds([bounds[0] ?? undefined, bounds[1] ?? undefined]);
        this.timeConductor.restart();
        // document.body.appendChild(VRButton.createButton(simulator.renderer));
        // simulator.renderer.xr.enabled = true;
        // simulator.renderer.setAnimationLoop(function () {
        //     simulator.renderer.render(simulator.scene, simulator.camera);
        // });
    }

    // soft_reset(): void {
    //     for (const ball of this.balls) {
    //         ball.timeline.clear();
    //         this.scene.remove(ball.mesh);
    //     }
    //     for (const juggler of this.jugglers) {
    //         juggler.right_hand.timeline.clear();
    //         juggler.left_hand.timeline.clear();
    //     }
    // }

    /*
    TODO : Add methods to easily use simulator class.
    Expose playBackRate, gravity
    Make time system adaptable to audio / no audio.
    Handle adding / removing juggler / patterns + sanitizing
    All aesthetic things (color, ground)
    */
}

export class MyCanvas {
    constructor() {}

    requestRender() {}

    private render() {}
}

export function resizeRendererToDisplaySize(
    renderer: THREE.Renderer,
    camera: THREE.PerspectiveCamera
    // init_tan_fov: number,
    // init_window_height: number
) {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = Math.floor(canvas.clientWidth * pixelRatio);
    const height = Math.floor(canvas.clientHeight * pixelRatio);
    if (canvas.width !== width || canvas.height !== height) {
        renderer.setSize(width, height, false);
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        // camera.fov =
        //     (360 / Math.PI) * Math.atan(init_tan_fov * (window.innerHeight / init_window_height));
        camera.updateProjectionMatrix();
    }
}

export function resizeRendererComposerToDisplaySize(
    renderer: THREE.Renderer,
    composer: EffectComposer,
    camera: THREE.PerspectiveCamera
) {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = Math.floor(canvas.clientWidth * pixelRatio);
    const height = Math.floor(canvas.clientHeight * pixelRatio);
    if (canvas.width !== width || canvas.height !== height) {
        renderer.setSize(width, height, false);
        composer.setSize(width, height);
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
}

function createRequestRenderIfNotRequestedFunction(callback: FrameRequestCallback) {
    let renderRequested = false;
    return function func() {
        if (!renderRequested) {
            renderRequested = true;
            return requestAnimationFrame((time: number) => {
                renderRequested = false;
                callback(time);
            });
        }
    };
}

// let injectedCss = false;
// export class Simulator {
//     renderer: THREE.WebGLRenderer;
//     scene: THREE.Scene;
//     camera: THREE.PerspectiveCamera;
//     controls: OrbitControls;
//     balls: Map<string, Ball>;
//     jugglers: Map<string, Juggler>;
//     tables: Map<string, Table>;
//     timeConductor: TimeConductor;
//     private _paused: boolean;
//     listener?: THREE.AudioListener;
//     // readonly audioEnabled: boolean;
//     // playBackRate: number;
//     // paused: boolean;

//     constructor({
//         canvas,
//         timeConductor,
//         enableAudio,
//         controls,
//         camera,
//         renderer,
//         scene,
//         debug,
//         balls,
//         jugglers,
//         tables
//     }: SimulatorConstructorParams) {
//         // Scene setup
//         //TODO : HMTLCanvasElement as param instead of string ?
//         // if (!injectedCss) {
//         //     injectedCss = true;
//         //     const style = document.createElement("style");
//         //     style.textContent = simulatorCss;
//         //     document.head.appendChild(style);
//         // }
//         this.renderer = renderer ?? new THREE.WebGLRenderer({ antialias: true, canvas });
//         this.scene = scene instanceof THREE.Scene ? scene : new THREE.Scene();
//         if (camera === undefined) {
//             const aspect = canvas.clientWidth / canvas.clientHeight;
//             this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 50);
//             this.camera.position.set(2.0, 1.5, 0);
//         } else {
//             this.camera = camera;
//         }
//         if (controls === undefined) {
//             this.controls = new OrbitControls(this.camera, this.renderer.domElement);
//             this.controls.target.set(0, 1.4, 0);
//             this.controls.update();
//         } else {
//             this.controls = controls;
//         }
//         this.controls.addEventListener("change", this.requestRenderIfNotRequested);
//         if (scene instanceof THREE.Scene) {
//             this.scene = scene;
//         } else {
//             const backgroundColor = new THREE.Color(
//                 scene?.backgroundColor ?? window.getComputedStyle(canvas).backgroundColor
//             );
//             if (scene?.lights !== undefined) {
//                 for (const light of scene.lights) {
//                     this.scene.add(light);
//                 }
//             } else {
//                 this.scene.background = backgroundColor;
//                 const ambient_light = new THREE.AmbientLight(this.scene.background, 2);
//                 this.scene.add(ambient_light);
//                 const light = new THREE.DirectionalLight(0xffffff, 1);
//                 light.position.set(4, 2, -1);
//                 this.scene.add(light);
//             }
//         }

//         // Helpers
//         debug ??= { showFloorAxis: true, showFloorGrid: true };
//         if (debug.showFloorAxis) {
//             const axes_helper = new THREE.AxesHelper(1.5);
//             axes_helper.position.y = 0.001;
//             this.scene.add(axes_helper);
//         }
//         if (debug.showFloorGrid) {
//             const grid_helper = new THREE.GridHelper(30, 30);
//             this.scene.add(grid_helper);
//         }

//         this.balls = balls ?? new Map<string, Ball>();
//         this.jugglers = jugglers ?? new Map<string, Juggler>();
//         this.tables = tables ?? new Map<string, Table>();

//         if (timeConductor === undefined) {
//             timeConductor = new TimeConductor();
//             bindTimeConductorAndSimulator(timeConductor, this);
//             createControls(document.body, timeConductor, [-1, 20]);
//         }
//         this.timeConductor = timeConductor;
//         this._paused = this.timeConductor.isPaused();

//         if (enableAudio) {
//             this.listener = new THREE.AudioListener();
//             this.camera.add(this.listener);
//         }

//         // To make it so we render if the window is resized.
//         window.addEventListener("resize", () => this.requestRenderIfNotRequested());
//         // To render the scene at least once if paused.
//         this.requestRenderIfNotRequested();
//     }

//     //TODO method to facilitate not having to add balls to the scene
//     addJuggler(name: string, juggler: Juggler, position?: THREE.Vector3): void {
//         if (this.jugglers.has(name)) {
//             console.log(`Overriding existing juggler ${name}.`);
//             this.removeJuggler(name);
//         }
//         this.jugglers.set(name, juggler);
//         if (position !== undefined) {
//             juggler.mesh.position.set(position.x, position.y, position.z);
//         }
//         this.scene.add(juggler.mesh);
//         this.requestRenderIfNotRequested();
//     }

//     removeJuggler(name: string): void {
//         const juggler = this.jugglers.get(name);
//         if (juggler !== undefined) {
//             this.jugglers.delete(name);
//             this.scene.remove(juggler.mesh);
//             juggler.dispose();
//         }
//         this.requestRenderIfNotRequested();
//     }

//     addBall(name: string, ball: Ball) {
//         if (this.balls.has(name)) {
//             console.log(`Overriding existing ball ${name}.`);
//             this.removeBall(name);
//         }
//         this.balls.set(name, ball);
//         this.scene.add(ball.mesh);
//         this.requestRenderIfNotRequested();
//     }

//     removeBall(name: string): void {
//         const ball = this.balls.get(name);
//         if (ball !== undefined) {
//             this.balls.delete(name);
//             this.scene.remove(ball.mesh);
//             ball.dispose();
//             this.requestRenderIfNotRequested();
//         }
//     }

//     addTable(name: string, table: Table) {
//         if (this.tables.has(name)) {
//             console.log(`Overriding existing ball ${name}.`);
//             this.removeTable(name);
//         }
//         this.tables.set(name, table);
//         this.scene.add(table.mesh);
//         this.requestRenderIfNotRequested();
//     }

//     removeTable(name: string): void {
//         const table = this.tables.get(name);
//         if (table !== undefined) {
//             this.tables.delete(name);
//             this.scene.remove(table.mesh);
//             table.dispose();
//         }
//         this.requestRenderIfNotRequested();
//     }

//     requestPlay(): void {
//         this._paused = false;
//         this.requestRenderIfNotRequested();
//     }

//     requestPause(): void {
//         this._paused = true;
//         for (const ball of this.balls.values()) {
//             //TODO : Make proper pause ?
//             ball.sound?.node.stop();
//         }
//     }

//     // TODO : Should be private (as it should be interacted with requestPlay/Pause
//     // instead of directly ?
//     private render(): void {
//         resizeRendererToDisplaySize(this.renderer, this.camera);

//         const simulatorTime = this.timeConductor.getTime();
//         for (const ball of this.balls.values()) {
//             ball.render(simulatorTime);
//             ball.triggerSound(simulatorTime, this._paused);
//         }
//         this.jugglers.forEach((juggler) => {
//             juggler.render(simulatorTime);
//         });
//         this.renderer.render(this.scene, this.camera);

//         if (!this._paused) {
//             this.requestRenderIfNotRequested();
//         }
//     }

//     requestRenderIfNotRequested = createRequestRenderIfNotRequestedFunction(this.render.bind(this));

//     getPatternDuration(): [number, number] | [null, null] {
//         let startTime: number | null = null;
//         let endTime: number | null = null;
//         for (const juggler of this.jugglers.values()) {
//             const [handStartTime, handEndTime] = juggler.patternTimeBounds();
//             if (startTime === null || (handStartTime !== null && startTime > handStartTime)) {
//                 startTime = handStartTime;
//             }
//             if (endTime === null || (handEndTime !== null && endTime > handEndTime)) {
//                 endTime = handEndTime;
//             }
//         }
//         // @ts-expect-error startTime is null if and only if endTime is null too.
//         return [startTime, endTime];
//     }

//     setMasterVolume(gain: number): void {
//         this.listener?.setMasterVolume(gain);
//     }

//     //TODO : SHouldn't hands / jugglers handle removal from scene ?
//     // TODO : Reset position, time, etc ?
//     reset(): void {
//         for (const name of this.jugglers.keys()) {
//             this.removeJuggler(name);
//         }
//         for (const name of this.balls.keys()) {
//             this.removeBall(name);
//         }
//         for (const name of this.tables.keys()) {
//             this.removeTable(name);
//         }
//         this.timeConductor.pause();
//         this.timeConductor.setTime(0);
//         // this.timeController.playbackRate = 1;
//     }

//     setupPattern({
//         jugglers: rawJugglers,
//         musicConverter: rawMusicConverter,
//         table: rawTable
//     }: JugglingAppParams): void {
//         //TODO : Separate in own function.
//         //TODO : Sanitize here too ! (different juggler names, etc)
//         //TODO : In MusicBeatConverter (and here before), Sort tempo and signature changes !!
//         // 1. Create parser parameters.

//         // 1a. rawMusicConverter
//         const signatureChanges: [number, Fraction][] = [];
//         const tempoChanges: [number, MusicTempo][] = [];
//         for (const [number, { signature, tempo }] of rawMusicConverter) {
//             if (signature !== undefined) {
//                 signatureChanges.push([number, new Fraction(signature)]);
//             }
//             if (tempo !== undefined) {
//                 tempoChanges.push([number, { note: new Fraction(tempo.note), bpm: tempo.bpm }]);
//             }
//         }
//         const musicConverter = new MusicBeatConverter(signatureChanges, tempoChanges);

//         // 1b. rawJugglers
//         const preParserJugglers = new Map<
//             string,
//             { balls: { id: string; name: string }[]; events: FracSortedList<PreParserEvent> }
//         >();
//         for (const [jugglerName, { balls, events: rawEvents }] of rawJugglers) {
//             preParserJugglers.set(jugglerName, {
//                 balls: balls,
//                 events: formatRawEventInput(rawEvents, musicConverter)
//             });
//         }
//         if (preParserJugglers.size !== rawJugglers.length) {
//             throw Error("TODO : Duplicate juggler name");
//         }

//         // 1c. Gather ball info from jugglers.
//         //TODO : Fuse ballIDs and BallIDSounds ?
//         //TODO : Sound on toss / catch.
//         const ballIDs = new Map<
//             string,
//             { name: string; sound?: string; juggler: string; color?: string | number }
//         >();
//         const ballNames = new Set<string>();
//         const ballSounds = new Set<string>();
//         for (const [jugglerName, { balls }] of rawJugglers) {
//             for (const ball of balls) {
//                 if (ballIDs.has(ball.id)) {
//                     throw Error("TODO : Duplicate ball ID");
//                 }
//                 ballIDs.set(ball.id, {
//                     name: ball.name,
//                     sound: ball.sound,
//                     juggler: jugglerName,
//                     color: ball.color
//                 });
//                 ballNames.add(ball.name);
//                 if (ball.sound !== undefined) {
//                     ballSounds.add(ball.sound);
//                 }
//             }
//         }

//         // 1d. Compile the parameters for the parser.
//         const parserParams: ParserToSchedulerParams = {
//             ballNames: ballNames,
//             ballIDs: ballIDs,
//             jugglers: preParserJugglers,
//             musicConverter: musicConverter
//         };

//         //TODO : Rename to parser only ? Name of method a bit convoluted.
//         const schedulerParams = transformParserParamsToSchedulerParams(parserParams);
//         const postSchedulerParams = new Scheduler(schedulerParams).validatePattern();

//         const jugglerGeometry = createJugglerCubeGeometry();
//         const jugglerMaterial = createJugglerMaterial();
//         const tableMaterial = createTableMaterial();
//         for (let i = 0; i < rawJugglers.length; i++) {
//             const jugglerName = rawJugglers[i][0];
//             let table: Table | undefined;
//             if (rawTable === undefined) {
//                 table = undefined;
//             } else {
//                 const tableObject =
//                     rawTable.realDimensions === undefined
//                         ? undefined
//                         : createTableObject(
//                               createTableGeometry(
//                                   rawTable.realDimensions.height,
//                                   rawTable.realDimensions.width,
//                                   rawTable.realDimensions.depth
//                               ),
//                               tableMaterial
//                           );
//                 const ballsPlacement = new Map<string, [number, number]>(rawTable.ballsPlacement);
//                 table = new Table({
//                     tableObject: tableObject,
//                     ballsPlacement: ballsPlacement,
//                     surfaceInternalSize: rawTable.internalDimensions,
//                     unkownBallPosition: rawTable.unknownBallPosition
//                 });
//             }
//             const juggler = new Juggler({
//                 mesh: new THREE.Mesh(jugglerGeometry, jugglerMaterial),
//                 defaultTable: table
//             });
//             const angleBtwJugglers = Math.PI / 8;
//             const angle1 = Math.PI - (angleBtwJugglers * (rawJugglers.length - 1)) / 2;
//             const angle2 = Math.PI + (angleBtwJugglers * (rawJugglers.length - 1)) / 2;
//             const ratio = rawJugglers.length === 1 ? 0.5 : i / (rawJugglers.length - 1);
//             const angle = angle1 + ratio * (angle2 - angle1);
//             const positionNormalized = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
//             this.addJuggler(jugglerName, juggler, V3SCA(2.0, positionNormalized));

//             //TODO : Handle table position based on juggler.
//             if (table !== undefined) {
//                 this.addTable(jugglerName, table);
//                 table.mesh.position.copy(V3SCA(1.5, positionNormalized));
//             }
//         }

//         const soundBuffers = new Map<string, AudioBuffer>();
//         for (const sound of ballSounds) {
//             getNoteBuffer(sound, this.listener!.context)
//                 .then((buffer) => {
//                     if (buffer !== undefined) {
//                         soundBuffers.set(sound, buffer);
//                     }
//                 })
//                 .catch(() => {
//                     console.log("Something went wrong");
//                 });
//         }

//         const ballRadius = 0.1;
//         const ballGeometry = createBallGeometry(ballRadius);
//         //TODO : Color as part of the spec possibly ?

//         for (const [ID, { sound, juggler, color }] of ballIDs) {
//             const ballMaterial = createBallMaterial(color ?? "pink");
//             //TODO : Change sound.node ? (only specify positional or non-positional).
//             //TODO : How to not have to specify the listener ?
//             const ball = new Ball({
//                 mesh: new THREE.Mesh(ballGeometry, ballMaterial),
//                 defaultJuggler: this.jugglers.get(juggler)!,
//                 id: ID,
//                 radius: ballRadius,
//                 sound:
//                     sound === undefined
//                         ? undefined
//                         : {
//                               buffers: soundBuffers,
//                               node: new THREE.PositionalAudio(this.listener!)
//                           }
//             });
//             this.addBall(ID, ball);
//         }

//         // x. Creating the params for the simulation
//         const ballIDSounds2 = new Map<
//             string,
//             {
//                 onToss?: string | EventSound;
//                 onCatch?: string | EventSound;
//             }
//         >();
//         for (const [name, sound] of ballIDs) {
//             ballIDSounds2.set(name, { onCatch: sound });
//         }
//         simulateEvents({
//             simulator: this,
//             jugglers: postSchedulerParams,
//             ballIDSounds: ballIDSounds2,
//             musicConverter: musicConverter
//         });

//         // Updating the timeconductor
//         this.timeConductor.pause();

//         let bounds = this.getPatternDuration();
//         this.timeConductor.setBounds([bounds[0] ?? undefined, bounds[1] ?? undefined]);
//         this.timeConductor.restart();
//         // document.body.appendChild(VRButton.createButton(simulator.renderer));
//         // simulator.renderer.xr.enabled = true;
//         // simulator.renderer.setAnimationLoop(function () {
//         //     simulator.renderer.render(simulator.scene, simulator.camera);
//         // });
//     }

//     // soft_reset(): void {
//     //     for (const ball of this.balls) {
//     //         ball.timeline.clear();
//     //         this.scene.remove(ball.mesh);
//     //     }
//     //     for (const juggler of this.jugglers) {
//     //         juggler.right_hand.timeline.clear();
//     //         juggler.left_hand.timeline.clear();
//     //     }
//     // }

//     /*
//     TODO : Add methods to easily use simulator class.
//     Expose playBackRate, gravity
//     Make time system adaptable to audio / no audio.
//     Handle adding / removing juggler / patterns + sanitizing
//     All aesthetic things (color, ground)
//     */
// }

// export function resizeRendererToDisplaySize(
//     renderer: THREE.Renderer,
//     camera: THREE.PerspectiveCamera
//     // init_tan_fov: number,
//     // init_window_height: number
// ) {
//     const canvas = renderer.domElement;
//     const pixelRatio = window.devicePixelRatio;
//     const width = Math.floor(canvas.clientWidth * pixelRatio);
//     const height = Math.floor(canvas.clientHeight * pixelRatio);
//     if (canvas.width !== width || canvas.height !== height) {
//         renderer.setSize(width, height, false);
//         camera.aspect = canvas.clientWidth / canvas.clientHeight;
//         // camera.fov =
//         //     (360 / Math.PI) * Math.atan(init_tan_fov * (window.innerHeight / init_window_height));
//         camera.updateProjectionMatrix();
//     }
// }

// export function resizeRendererComposerToDisplaySize(
//     renderer: THREE.Renderer,
//     composer: EffectComposer,
//     camera: THREE.PerspectiveCamera
// ) {
//     const canvas = renderer.domElement;
//     const pixelRatio = window.devicePixelRatio;
//     const width = Math.floor(canvas.clientWidth * pixelRatio);
//     const height = Math.floor(canvas.clientHeight * pixelRatio);
//     if (canvas.width !== width || canvas.height !== height) {
//         renderer.setSize(width, height, false);
//         composer.setSize(width, height);
//         camera.aspect = canvas.clientWidth / canvas.clientHeight;
//         camera.updateProjectionMatrix();
//     }
// }

// function createRequestRenderIfNotRequestedFunction(callback: FrameRequestCallback) {
//     let renderRequested = false;
//     return function func() {
//         if (!renderRequested) {
//             renderRequested = true;
//             return requestAnimationFrame((time: number) => {
//                 renderRequested = false;
//                 callback(time);
//             });
//         }
//     };
// }
