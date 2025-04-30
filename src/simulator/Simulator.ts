import * as THREE from "three";
import { Ball, createBallGeometry, createBallMaterial } from "./Ball";
import { createJugglerCubeGeometry, createJugglerMaterial, Juggler } from "./Juggler";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/Addons.js";
import { createTableGeometry, createTableMaterial, createTableObject, Table } from "./Table";
import simulatorCss from "../assets/styleSheets/simulator.css?raw";
import { formatRawEventInput, JugglingAppParams, PreParserEvent } from "../inference/JugglingApp";
import { FracSortedList, Scheduler } from "../inference/Scheduler";
import {
    bindTimeConductorAndSimulator,
    createControls,
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

// export class DefaultTimeController implements TimeController {
//     getTime(): number {
//         return performance.now();
//     }
//     isPaused(): boolean {
//         return true;
//     }
// }

interface SimulatorConstructorParams {
    canvas: HTMLCanvasElement;
    timeController?: TimeController;
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

let injectedCss = false;
export class Simulator {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    balls: Map<string, Ball>;
    jugglers: Map<string, Juggler>;
    tables: Map<string, Table>;
    timeController: TimeController;
    private _paused: boolean;
    listener?: THREE.AudioListener;
    // readonly audioEnabled: boolean;
    // playBackRate: number;
    // paused: boolean;

    constructor({
        canvas,
        timeController,
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
        //TODO : HMTLCanvasElement as param instead of string ?
        // if (!injectedCss) {
        //     injectedCss = true;
        //     const style = document.createElement("style");
        //     style.textContent = simulatorCss;
        //     document.head.appendChild(style);
        // }
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

        this.balls = balls ?? new Map<string, Ball>();
        this.jugglers = jugglers ?? new Map<string, Juggler>();
        this.tables = tables ?? new Map<string, Table>();

        if (timeController === undefined) {
            const timeConductor = new TimeConductor();
            bindTimeConductorAndSimulator(timeConductor, this);
            createControls(document.body, timeConductor, [-1, 20]);
            timeController = timeConductor;
        }
        this.timeController = timeController;
        this._paused = this.timeController.isPaused();

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
    addJuggler(name: string, juggler: Juggler, position?: THREE.Vector3): void {
        if (this.jugglers.has(name)) {
            console.log(`Overriding existing juggler ${name}.`);
            this.removeJuggler(name);
        }
        this.jugglers.set(name, juggler);
        if (position !== undefined) {
            juggler.mesh.position.set(position.x, position.y, position.z);
        }
        this.scene.add(juggler.mesh);
        this.requestRenderIfNotRequested();
    }

    removeJuggler(name: string): void {
        const juggler = this.jugglers.get(name);
        if (juggler !== undefined) {
            this.jugglers.delete(name);
            this.scene.remove(juggler.mesh);
            juggler.dispose();
        }
        this.requestRenderIfNotRequested();
    }

    addBall(name: string, ball: Ball) {
        if (this.balls.has(name)) {
            console.log(`Overriding existing ball ${name}.`);
            this.removeBall(name);
        }
        this.balls.set(name, ball);
        this.scene.add(ball.mesh);
        this.requestRenderIfNotRequested();
    }

    removeBall(name: string): void {
        const ball = this.balls.get(name);
        if (ball !== undefined) {
            this.balls.delete(name);
            this.scene.remove(ball.mesh);
            ball.dispose();
            this.requestRenderIfNotRequested();
        }
    }

    addTable(name: string, table: Table) {
        if (this.tables.has(name)) {
            console.log(`Overriding existing ball ${name}.`);
            this.removeTable(name);
        }
        this.tables.set(name, table);
        this.scene.add(table.mesh);
        this.requestRenderIfNotRequested();
    }

    removeTable(name: string): void {
        const table = this.tables.get(name);
        if (table !== undefined) {
            this.tables.delete(name);
            this.scene.remove(table.mesh);
            table.dispose();
        }
        this.requestRenderIfNotRequested();
    }

    requestPlay(): void {
        this._paused = false;
        this.requestRenderIfNotRequested();
    }

    requestPause(): void {
        this._paused = true;
        for (const ball of this.balls.values()) {
            //TODO : Make proper pause ?
            ball.sound?.node.stop();
        }
    }

    // TODO : Should be private (as it should be interacted with requestPlay/Pause
    // instead of directly ?
    private render(): void {
        resizeRendererToDisplaySize(this.renderer, this.camera);

        const simulatorTime = this.timeController.getTime();
        for (const ball of this.balls.values()) {
            ball.render(simulatorTime);
            ball.triggerSound(simulatorTime, this._paused);
        }
        this.jugglers.forEach((juggler) => {
            juggler.render(simulatorTime);
        });
        this.renderer.render(this.scene, this.camera);

        if (!this._paused) {
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
        // @ts-expect-error startTime is null if and only if endTime is null too.
        return [startTime, endTime];
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
        this.timeController.pause();
        this.timeController.setTime(0);
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
