/* eslint-disable @eslint-react/web-api/no-leaked-event-listener */
// Reason of the above suppression : it is based on the name "addEventListener";
// For which our clock api has a bit of a different way of working.
import { RefObject, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AudioEngine, getNoteBuffer } from "../audio";
import { PerformanceModel } from "../model";
import { Clock, FracTimedErrorLogger, useLazyRef } from "../utils";
import { useFrame, useThree } from "@react-three/fiber";
import {
    BallMeshDescription,
    BodyMeshDescription,
    HandMeshDescription,
    PerformanceDescription,
    PerformanceMeshesDescription,
    TableMeshDescription
} from "../inference";
import { BallMesh } from "./BallMesh";
import { BodyMesh } from "./BodyMesh";
import { HandRectMesh } from "./HandMesh";
import { TableMesh } from "./TableMesh";
import { descriptionFromHelper } from "../inference/HelperToDescription";
import { PerformanceDescriptionHelper } from "../inference/PerformanceDescriptionHelpers";
import { performanceDescriptionToModel } from "../inference/DescriptionToModel";

// TODO : Test moveing whole performnce around with an engloping object (and chaging scale and rotation).
// TODO : Test scale for everything that has scale in fact.
// TODO : Currently, sound is computed on each frame, handle it with a proper outside class, and/or with event callbacks ?

export function Wrapper({
    listener,
    clock,
    descriptionHelper
}: {
    listener: THREE.AudioListener;
    clock: Clock;
    descriptionHelper: PerformanceDescriptionHelper;
}) {
    const errorLogger = new FracTimedErrorLogger();
    const description = descriptionFromHelper(descriptionHelper, errorLogger);
    const model = performanceDescriptionToModel(description, description, errorLogger);
    errorLogger.printErrorsInConsole();
    const x = model!.jugglers.getSurely("Kylian").leftHand.timeline.toArray();
    console.log(JSON.stringify(x));
    // console.log(x.positionAtTime(0.8));
    // const x = model!.jugglers.get("Kylian")!.hands[1];
    // console.log(x.localPositionAndRotationAtTime(0.9));
    // const y = x.timeline.toArray();
    // console.log(y);
    if (model === undefined) {
        return <></>;
    }

    // Loading sounds.
    // TODO : Better handle this promise to have some UI blocking the start of the sound while they load.
    const buffersMap = new Map<string, AudioBuffer>();
    const loadingSounds = new Set<string>();
    const promises: Promise<void>[] = [];
    for (const ball of description.balls) {
        for (const sound of [ball.soundOnCatch?.name, ball.soundOnToss?.name]) {
            if (typeof sound === "string") {
                if (!loadingSounds.has(sound)) {
                    loadingSounds.add(sound);
                    promises.push(
                        getNoteBuffer(sound, listener.context)
                            .then((buffer) => {
                                if (buffer !== undefined) {
                                    buffersMap.set(sound, buffer);
                                }
                            })
                            .catch(() => {
                                console.log("Something went wrong");
                            })
                    );
                }
            }
        }
    }
    // Promise.all(promises).then()
    return Performance({ listener, clock, meshesDescription: description, model, buffersMap });
}


export function Performance({
    listener,
    model,
    clock,
    meshesDescription,
    buffersMap
}: {
    listener: THREE.AudioListener;
    model: PerformanceModel;
    meshesDescription: PerformanceMeshesDescription;
    clock: Clock;
    buffersMap: Map<string, AudioBuffer>;
}) {
    // Previous time
    // const previousTime = useRef<number>(-Infinity);

    const invalidate = useThree((state) => state.invalidate);
    // References to a utility class that helps with managing audio of a performance.
    // TODO : HANDLE LISTENER CHANGE ???
    const audioControls = useRef<AudioEngine | undefined>(undefined);
    // References to meshes of the scene to update to update their position.
    const ballsRef = useRef(
        new Map<string, { mesh?: THREE.Mesh; audio?: THREE.PositionalAudio }>()
    );
    const jugglersRef = useRef(
        new Map<
            string,
            { leftHandMesh?: THREE.Mesh; rightHandMesh?: THREE.Mesh; bodyMesh?: THREE.Mesh }
        >()
    ); // TODO : Figure how to use lazyRefs without ESLint complaining in UseEffects ?
    // const performanceRef = useRef<THREE.Object3D>(null!);


    // TODO : This assumes first the positional audio are created and that then they are added.
    // Work on a version that adds them (with ref).
    useEffect(() => {
        // Recreate the audioEngine, and add again
        const audioEngine = new AudioEngine({ listener, model, clock, buffersMap });
        ballsRef.current.forEach((ballInfo, ballID) => {
            if (ballInfo.audio !== undefined) {
                audioEngine.setBallAudio(ballID, ballInfo.audio);
            }
        });
        audioControls.current = audioEngine;
        return () => {
            audioControls.current?.dispose();
        };
    }, [listener, model, clock, buffersMap]);

    // Chenge the clock's range when there is a new model.
    useEffect(() => {
        let [lowerBound, upperBound] = model.patternTimeBounds();
        console.log(lowerBound, upperBound);
        if (lowerBound === null || upperBound === null) {
            // Put arbitrary time bounds since the model has no events.
            lowerBound = 0;
            upperBound = 5;
        } else {
            // Leave enough time for sound to finish playing at the end.
            upperBound += 2;
        }
        clock.setBounds({ lowerBound, upperBound });
        clock.restart();
    }, [clock, model]);

    // This makes sure a new frame in the canvas is rendered whenever the clock is ticking,
    // But stop it when it is not (this will save battery).
    useEffect(() => {
        const triggerRender = () => {
            invalidate();
        };

        clock.addEventListener("start", triggerRender);
        clock.addEventListener("manualTimeUpdate", triggerRender);

        return () => {
            clock.removeEventListener("start", triggerRender);
            clock.removeEventListener("manualTimeUpdate", triggerRender);
        };
    });

    useFrame(() => {
        const time = clock.getTime();
        let ballPos: THREE.Vector3 | undefined;
        let rightHandPos: THREE.Vector3 | undefined;
        let leftHandPos: THREE.Vector3 | undefined;
        for (const [id, { mesh }] of ballsRef.current) {
            // Update the balls' positions.
            if (mesh !== undefined) {
                ballPos = model.balls.get(id)!.positionAtTime(time);
                mesh.position.copy(ballPos);
            }

            for (const [name, { leftHandMesh, rightHandMesh }] of jugglersRef.current) {
                if (leftHandMesh !== undefined) {
                    leftHandPos = model.jugglers
                        .get(name)!
                        .leftHand.localPositionAndRotationAtTime(time).position;
                    leftHandMesh.position.copy(leftHandPos);
                }
                if (rightHandMesh !== undefined) {
                    rightHandPos = model.jugglers
                        .get(name)!
                        .rightHand.localPositionAndRotationAtTime(time).position;
                    rightHandMesh.position.copy(rightHandPos);
                }
            }
        }
        if (clock.isTicking()) {
            invalidate();
            // console.log(
            //     `Ball Pos : ${stringifyVec(ballPos)}\nRight Hand Pos : ${stringifyVec(rightHandPos)}\nLeft Hand Pos : ${stringifyVec(leftHandPos)}\n`
            // );
        }
        // for (const { name: jugglerName } of description.jugglersData) {
        //     const {
        //         bodyMesh: body,
        //         leftHandMesh: leftHand,
        //         rightHandMesh: rightHand
        //     } = jugglersRef.current.get(jugglerName)!;
        //     const jugglerModel = model.jugglers.get(jugglerName)!;
        //     // Update the hands' positions.
        //     rightHand?.position.copy(
        //         changeCoordinateSystem(
        //             jugglerModel.rightHand.position(time),
        //             performanceRef.current,
        //             body
        //         )
        //     );
        //     leftHand?.position.copy(
        //         changeCoordinateSystem(
        //             jugglerModel.leftHand.position(time),
        //             performanceRef.current,
        //             body
        //         )
        //     );
        // }
    });

    // Parent container group or empty ?
    return (
        <>
            {[...model.jugglers].map(([jugglerName, jugglerModel]) => {
                const meshInfo = meshesDescription.jugglers.find(
                    (juggler) => juggler.name === jugglerName
                );
                if (meshInfo === undefined) {
                    return;
                }
                return (
                    <Juggler
                        key={jugglerName}
                        name={jugglerName}
                        bodyMeshInfo={meshInfo.body}
                        rightHandMeshInfo={meshInfo.rightHand}
                        leftHandMeshInfo={meshInfo.leftHand}
                        position={jugglerModel.position.getLocal()}
                        rotation={jugglerModel.rotation.getLocal()}
                        jugglersRef={jugglersRef}
                    />
                );
            })}
            {[...model.tables].map(([tableID, tableModel]) => {
                const meshInfo = meshesDescription.tables.find((table) => table.id === tableID);
                if (meshInfo === undefined) {
                    return;
                }
                return (
                    <Table
                        key={tableID}
                        meshInfo={meshInfo}
                        position={tableModel.position.getLocal()}
                        rotation={tableModel.rotation.getLocal()}
                    />
                );
            })}
            {[...model.balls].map(([ballID]) => {
                const meshInfo = meshesDescription.balls.find((ball) => ball.id === ballID);
                if (meshInfo === undefined) {
                    return;
                }
                return (
                    <Ball
                        key={ballID}
                        id={ballID}
                        meshInfo={meshInfo}
                        ballsRef={ballsRef}
                        listener={listener}
                    />
                );
            })}
        </>
    );
}

function Ball({
    id,
    meshInfo,
    ballsRef,
    listener
}: {
    id: string;
    meshInfo: BallMeshDescription;
    ballsRef: RefObject<Map<string, { mesh?: THREE.Mesh; audio?: THREE.PositionalAudio }>>;
    listener: THREE.AudioListener;
}) {
    return (
        <BallMesh
            // key={id}
            color={meshInfo.color}
            radius={meshInfo.radius}
            ref={updateMapRef(ballsRef, id, (ball, node) => {
                ball.mesh = node;
            })}
        >
            <positionalAudio
                args={[listener]}
                ref={updateMapRef(ballsRef, id, (ball, node) => {
                    ball.audio = node;
                })}
            />
        </BallMesh>
    );
}

function Juggler({
    name,
    position,
    rotation,
    leftHandMeshInfo,
    rightHandMeshInfo,
    bodyMeshInfo,
    jugglersRef
}: {
    name: string;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    leftHandMeshInfo: HandMeshDescription;
    rightHandMeshInfo: HandMeshDescription;
    bodyMeshInfo: BodyMeshDescription;
    jugglersRef: RefObject<
        Map<
            string,
            {
                leftHandMesh?: THREE.Mesh;
                rightHandMesh?: THREE.Mesh;
                bodyMesh?: THREE.Mesh;
            }
        >
    >;
}) {
    return (
        <group position={position} rotation={rotation}>
            <BodyMesh
                {...bodyMeshInfo}
                ref={
                    updateMapRef(jugglersRef, name, (juggler, node) => {
                        juggler.bodyMesh = node;
                    }) //TODO : Not needed anymore, remove ?
                }
            />
            <HandRectMesh
                {...rightHandMeshInfo}
                ref={updateMapRef(jugglersRef, name, (juggler, node) => {
                    juggler.rightHandMesh = node;
                })}
            />
            <HandRectMesh
                {...leftHandMeshInfo}
                ref={updateMapRef(jugglersRef, name, (juggler, node) => {
                    juggler.leftHandMesh = node;
                })}
            />
        </group>
    );
}


function Table({
    position,
    rotation,
    meshInfo
}: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    meshInfo: TableMeshDescription;
}) {
    return (
        <object3D position={position} rotation={rotation}>
            <TableMesh {...meshInfo} />;
        </object3D>
    );
}

/**
 * Say you want references to be held in a map, but you want a key to hold multiple references as an object. This function allows to easily fill such a map with new refs
 * @param mapRef the referenced map.
 * @param key the key of the element to update in the map.
 * @param onMount a function to update an existing object of the map with the new value.
 * @returns
 */
function updateMapRef<Elem, Key, Value extends object>(
    mapRef: RefObject<Map<Key, Partial<Value>>>,
    key: Key,
    onMount: (value: Partial<Value>, node: Elem) => void,
    onDismount?: (value: Partial<Value>) => void
) {
    return (node: Elem | null) => {
        let elem = mapRef.current.get(key);
        if (node !== null) {
            // The node is being mounted.
            if (elem === undefined) {
                // The mapRef does not have the specified key, so we create it.
                elem = {};
                mapRef.current.set(key, elem);
            }
            // We complete the value object.
            onMount(elem, node);
        } else {
            // The node is being dismounted (its value is null).
            if (elem === undefined) {
                // The refs have already been cleared.
                return;
            }
            // Clear the whole ref
            if (onDismount !== undefined) {
                onDismount(elem);
            }
            mapRef.current.delete(key);
        }
    };
}

function stringifyVec(vec: THREE.Vector3 | undefined) {
    return vec === undefined ? "undefined" : `[${vec.x}, ${vec.y}, ${vec.z}]`;
}

// import { JSX, RefObject, useRef } from "react";
// import { PerformanceView } from "../view/PerformanceView";
// import { PerformanceContext } from "./Context";
// import { BallModel, Clock, HandModel } from "..";
// import { RenderCallback, ThreeElements, useFrame } from "@react-three/fiber";
// import * as THREE from "three";
// import mergeRefs from "merge-refs";
// import { BodyMesh } from ".";

// // type PerformanceReactProps = {
// //     performance: PerformanceView;
// //     // audio: boolean;
// //     onFrameUpdate: RenderCallback;
// //     jugglers: JSX.Element;
// //     balles: JSX.Element;
// // };

// // enableMapSet();

// // TODO : Cool render when timeconductor is paused.

// //TODO : onFrameUpdate takes all the balls and jugglers and hands ?
// //TODO : First step : Have the hard in stone set render loop. Or customizable ?

// // TODO : How to move the whole performance ?
// // Is the Performance secretely an object3D ?

// export type ReactPatternDescription = {
//     balls: {
//         id: string;
//         sounds: {
//             whenCaught: (param: any) => AudioBuffer;
//             whenTossed: (param: any) => AudioBuffer;
//             whileAirborne: (param: any) => AudioBuffer;
//         };
//         mesh: JSX.Element;
//         model: BallModel;
//         updateMeshPosition: (param: any) => void;
//     }[];
//     jugglers: {
//         // TODO : Make jugglers also have unique ID instead of name ?
//         name: string;
//         table: JSX.Element;
//         bodyMesh: JSX.Element;
//         rightHandMesh: JSX.Element;
//         leftHandMesh: JSX.Element;
//         rightHandModel: HandModel;
//         leftHandModel: HandModel;
//         updateMeshPosition: (param: any) => void;
//     }[];
// };

// export function Performance({ performance, onFrameUpdate }: PerformanceReactProps) {
//     const ballsRef: RefObject<any[]> = [];
//     const jugglersRef: RefObject<any[]> = [];

//     useFrame((state, delta, frame) => {
//         onFrameUpdate(state, delta, frame);
//     });

//     return (
//         <>
//             {jugglers.map((elem) => {})}
//             {}
//             {}
//         </>
//     );
// }

// function mapJugglers({}: {}) {
//     return <BodyMesh/>
// }

// //TODO : SoundNames / buffer

// // useEffect(() => {
// //     performance.model = model;
// // }, [performance, model]);

// // useEffect(() => {
// //     if (audio) {
// //         performance.enableAudio({ballsThreeAudio: , bufferMap: })
// //     } else {
// //         performance.disableAudio();
// //     }
// // })

// // useEffect(() => {
// //     performance.audio?.setClock(clock);
// //     // The cleanup happens when a new clock is set.
// //     // TODO : Change this to make it behave more naturally, with cleanup func ?
// // }, [clock, performance.audio]);

// // Have as param for each element (ball, juggler, etc) an updatePosition method as parameter.
// // Use it in a top call to UseFrame (once only from Performance).
// // How would a pause be handled ?
// // The clock pauses, thus it is reflected in the update.
// // Only pass the event inference layer, not the ones above, at it really is the one needed.
