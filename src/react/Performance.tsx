/* eslint-disable @eslint-react/web-api/no-leaked-event-listener */
// Reason of the above suppression : it is based on the name "addEventListener";
// For which our clock api has a bit of a different way of working.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AudioEngine } from "../audio";
import { PerformanceModel } from "../model";
import { Clock, useLazyRef } from "../utils";
import { useFrame } from "@react-three/fiber";

// TODO : Test moveing whole performnce around with an engloping object (and chaging scale and rotation).
// TODO : Test scale for everything that has scale in fact.
// TODO : Currently, sound is computed on each frame, handle it with a proper outside class, and/or with event callbacks ?

export function Performance2(specs: {
    jugglers: Map<string, { mesh: THREE.Mesh; volume?: number }>;
    balls: Map<string, { mesh: THREE.Mesh; volume?: number }>;
    volume?: number;
    buffersMap?: Map<string, AudioBuffer>;
    clock: Clock;
    model: PerformanceModel;
}) {}

export function Performance({
    listener,
    model,
    clock,
    buffersMap
}: {
    listener: THREE.AudioListener;
    model: PerformanceModel;
    clock: Clock;
    buffersMap: Map<string, AudioBuffer>;
}) {
    // Previous time
    const previousTime = useRef<number>(-Infinity);

    // References to a utility class that helps with managing audio of a performance.
    // TODO : HANDLE LISTENER CHANGE ???
    const audioControls = useLazyRef<AudioEngine>(() => new AudioEngine(listener));
    // References to meshes of the scene to update to update their position.
    const ballsRef = useLazyRef(() => new Map<string, { mesh?: THREE.Mesh }>());
    const jugglersRef = useLazyRef(
        () =>
            new Map<
                string,
                { leftHandMesh?: THREE.Mesh; rightHandMesh?: THREE.Mesh; bodyMesh: THREE.Mesh }
            >()
    );
    // const performanceRef = useRef<THREE.Object3D>(null!);

    useEffect(() => {
        // TODO : Listener change.
        return;
    });

    // Bind some of the audio to the clock.
    // useEffect(() => {
    //     const onStart = () => {
    //         audioControls.current.unpause();
    //     };
    //     const onPause = () => {
    //         audioControls.current.pause();
    //     };
    //     const onEnded = () => {
    //         // Do nothing, we want the sounds to keep playing even when the simulation stops at the end.
    //         return;
    //     };
    //     const onManualTimeUpdate = () => {
    //         // Load each ball with its sound at the right time.
    //         for (const ballID of audioControls.current.ballIDs()) {
    //             // Get the model.
    //             const ballModel = model.balls.get(ballID);
    //             if (ballModel === undefined) {
    //                 continue;
    //             }
    //             // Figure out what is the previous sound the ball should have made, (accounting for the clock ticking forwards or backwards).
    //             // TODO : For now, only forward.
    //             const [prevEvTime, prevEv] = ballModel.timeline.prevEvent(clock.getTime());
    //             if (
    //                 prevEvTime !== null &&
    //                 previousTime.current < prevEvTime &&
    //                 prevEv.sound !== undefined
    //             ) {
    //                 // Check if a ball has changed jugglers to change its gain.
    //                 if (
    //                     prevEv.location.type === "held" &&
    //                     prevEv.location.jugglerName !== audioControls.current.getBallJuggler(ballID)
    //                 )
    //                     audioControls.current.changeBallJuggler(
    //                         ballID,
    //                         prevEv.location.jugglerName
    //                     );
    //                 // Make the ball sound.
    //                 audioControls.current.prevEv.sound.loop
    //             }
    //                 // TO CONTINUE : Have a way to load the sound the ball should play, but not playing it instantly, by modifying PerformanceAudio
    //                 !clock.isStopped()
    //             ) {
    //                 performanceAudio.playBallSound(id, buffersMap.get(id)!);
    //             }
    //         }
    //     };
    //     const onPlaybackRateChange = () => {
    //         // Change the playback so that the pitch is shifted.
    //         // TODO : Is this the behaviour we want ? Or no pitch shift and normal sound.
    //         // TODO : Test if works in reverse.
    //         audioControls.current.setPlaybackRate(clock.getPlaybackRate());
    //     };

    //     clock.addEventListener("start", onStart);
    //     clock.addEventListener("pause", onPause);
    //     clock.addEventListener("ended", onEnded);
    //     clock.addEventListener("manualTimeUpdate", onManualTimeUpdate);
    //     clock.addEventListener("playbackRateChange", onPlaybackRateChange);
    //     clock.addEventListener("boundsChange", onBoundsChange);
    //     clock.addEventListener("loopChange", onLoopChange);

    //     clock.addEventListener("playbackRateChange");
    //     clock.addEventListener("play", onPlay);
    //     clock.addEventListener("pause", onPause);
    //     clock.addEventListener("reachedEnd", onReachedEnd);

    //     // Return a function to remove all event listeners.
    //     return () => {
    //         clock.removeEventListener("play", onPlay);
    //         clock.removeEventListener("pause", onPause);
    //         clock.removeEventListener("reachedEnd", onReachedEnd);
    //     };
    // }, [clock]);

    useEffect(() => {
        audioControls.current.setPlaybackRate(1);
    });

    // TODO : Audio system.
    // - May need adding "manualUpdate" back to clock.
    // - Play with sounds to see if we ask them to play while pause,
    // - they won't play, and then play again when pressing play once more.
    // useFrame(() => {
    //     const time = clock.getTime();
    //     for (const [i] of ballsRef.current) {

    //     }
    // })

    useFrame(() => {
        const time = clock.getTime();

        for (const [id, { mesh }] of ballsRef.current) {
            // Update the balls' positions.
            if (mesh !== undefined) {
                mesh.position.copy(model.balls.get(id)!.positionAtTime(time));
            }

            // Change the ball juggler's channel if need be.
            // const [prevEvTime, prevEv] = model.balls.get(id)!.timeline.prevEvent(time);

            // // Check if a ball has changed jugglers to change its gain.
            // if (prevEv !== null && previousTime.current < prevEvTime)
            //     if (
            //         prevEvTime !== null &&
            //         prevEv instanceof TossEvent &&
            //         previousTime.current < prevEvTime &&
            //         prevEv.hand.juggler.name !== performanceAudio.getBallJuggler(id)
            //     ) {
            //         console.log("changed");
            //         performanceAudio.changeBallJuggler(id, prevEv.hand.juggler.name);
            //     }

            // // TODO : Stop all ball sounds if we jumped too far.

            // // Make the ball sound if needed.
            // if (
            //     prevEv !== null &&
            //     prevEv.sound !== undefined &&
            //     previousTime.current < prevEvTime &&
            //     !clock.isPaused()
            // ) {
            //     const audioBuffer = buffersMap.get(id);
            //     if (audioBuffer === undefined) {
            //         console.warn(`Can't play sound `);
            //     }
            //     performanceAudio.playBallSound(id, buffersMap.get(id)!);
            // }
        }

        previousTime.current = time;

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

    return (
        <group position={position} ref={performanceRef}>
            {description.jugglersData.map((elem) => mapJuggler(elem, jugglersRef))}
            {description.tablesData.map((elem) => mapTables(elem))}
            {description.ballsData.map((elem) => mapBalls(elem, ballsRef, listener, audioControls))}
        </group>
    );
}

function mapBalls(
    { id, color }: BallData,
    ballsRef: RefObject<Map<string, { mesh?: THREE.Mesh; audio?: THREE.PositionalAudio }>>,
    listener: THREE.AudioListener,
    performanceAudio: AudioEngine
) {
    return (
        <BallMesh
            key={id}
            color={color}
            ref={(node) => {
                updateMapRef<THREE.Mesh, string, { mesh?: THREE.Mesh }>(
                    node,
                    ballsRef,
                    id,
                    (ball, node) => {
                        ball.mesh = node;
                    }
                );
            }}
        >
            <positionalAudio
                args={[listener]}
                ref={(node) => {
                    if (node !== null) {
                        performanceAudio.addBallAudio(id, node);
                    } else {
                        performanceAudio.deleteBallAudio(id);
                    }
                }}
            />
        </BallMesh>
    );
}

function mapJuggler(
    { name, position }: JugglerData,
    jugglersRef: RefObject<
        Map<
            string,
            {
                leftHand?: THREE.Mesh;
                rightHand?: THREE.Mesh;
                body?: THREE.Mesh;
            }
        >
    >
) {
    return (
        <group position={position} key={name}>
            <BodyMesh
                ref={(node) => {
                    updateMapRef<
                        THREE.Mesh,
                        string,
                        {
                            leftHand?: THREE.Mesh;
                            rightHand?: THREE.Mesh;
                            body?: THREE.Mesh;
                        }
                    >(node, jugglersRef, name, (juggler, node) => {
                        juggler.body = node;
                    });
                }}
            />
            <HandMesh
                ref={(node) => {
                    updateMapRef<
                        THREE.Mesh,
                        string,
                        {
                            leftHand?: THREE.Mesh;
                            rightHand?: THREE.Mesh;
                            body?: THREE.Mesh;
                        }
                    >(node, jugglersRef, name, (juggler, node) => {
                        juggler.rightHand = node;
                    });
                }}
            />
            <HandMesh
                ref={(node) => {
                    updateMapRef<
                        THREE.Mesh,
                        string,
                        {
                            leftHand?: THREE.Mesh;
                            rightHand?: THREE.Mesh;
                            body?: THREE.Mesh;
                        }
                    >(node, jugglersRef, name, (juggler, node) => {
                        juggler.leftHand = node;
                    });
                }}
            />
        </group>
    );
}

// Note : MapValueObject must have all fields optional.
function updateMapRef<NodeType, MapKey, MapValueObject extends object>(
    node: NodeType | null,
    mapRef: RefObject<Map<MapKey, Partial<MapValueObject>>>,
    key: MapKey,
    addToRefFunc: (juggler: Partial<MapValueObject>, node: NodeType) => void
) {
    let elem = mapRef.current.get(key);
    if (node !== null) {
        // The node is being mounted.
        if (elem === undefined) {
            // The mapRef has not the specified key, so we create it.
            elem = {};
            mapRef.current.set(key, elem);
        }
        // We complete the value object.
        addToRefFunc(elem, node);
    } else {
        // The node is being dismounted.
        if (elem === undefined) {
            // The refs have already been cleared.
            return;
        }
        // Clear the whole ref
        mapRef.current.delete(key);
    }
}

function mapTables({ position, rotation, name }: TableData) {
    return <TableMesh position={position} rotation={rotation} key={name} />;
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
