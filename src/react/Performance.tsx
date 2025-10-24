import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PerformanceAudio } from "../audio";

function Performance({
    listener,
    position = DEFAULT_POSITION
}: {
    listener: THREE.AudioListener;
    position?: THREE.Vector3Tuple;
}) {
    // Previous time
    const previousTime = useRef<number>(-Infinity);
    const ballsRef = useRef(new Map<string, { mesh?: THREE.Mesh }>());
    const jugglersRef = useRef(
        new Map<string, { leftHand?: THREE.Mesh; rightHand?: THREE.Mesh; body: THREE.Mesh }>()
    );
    const [performanceAudio] = useState(() => new PerformanceAudio(listener));
    const performanceRef = useRef<THREE.Object3D>(null!);
    // const audioRef = useRef(new PerformanceAudio());

    useEffect(() => {
        performanceAudio.setPlaybackRate(1);
    });

    useFrame(() => {
        const time = clock.getTime();

        for (const [id, { mesh }] of ballsRef.current) {
            const ballObject = ballsRef.current.get(id);

            // Update the balls' positions.
            if (ballObject !== undefined && mesh !== undefined) {
                mesh.position.copy(model.balls.get(id)!.positionAtTime(time));
            }

            // Audio
            const [prevEvTime, prevEv] = model.balls.get(id)!.timeline.prevEvent(time);

            // Check if a ball has changed jugglers to change its gain.
            if (
                prevEvTime !== null &&
                prevEv instanceof TossEvent &&
                previousTime.current < prevEvTime &&
                prevEv.hand.juggler.name !== performanceAudio.getBallJuggler(id)
            ) {
                console.log("changed");
                performanceAudio.changeBallJuggler(id, prevEv.hand.juggler.name);
            }

            // Make the ball sound if needed.
            if (
                prevEvTime !== null &&
                prevEv instanceof CatchEvent &&
                previousTime.current < prevEvTime &&
                !clock.isPaused()
            ) {
                performanceAudio.playBallSound(id, buffersMap.get(id)!);
            }
        }

        previousTime.current = time;

        for (const { name: jugglerName } of description.jugglersData) {
            const { body, leftHand, rightHand } = jugglersRef.current.get(jugglerName)!;
            const jugglerModel = model.jugglers.get(jugglerName)!;
            // Update the hands' positions.
            rightHand?.position.copy(
                changeCoordinateSystem(
                    jugglerModel.rightHand.position(time),
                    performanceRef.current,
                    body
                )
            );
            leftHand?.position.copy(
                changeCoordinateSystem(
                    jugglerModel.leftHand.position(time),
                    performanceRef.current,
                    body
                )
            );
        }
    });

    return (
        <group position={position} ref={performanceRef}>
            {description.jugglersData.map((elem) => mapJuggler(elem, jugglersRef))}
            {description.tablesData.map((elem) => mapTables(elem))}
            {description.ballsData.map((elem) =>
                mapBalls(elem, ballsRef, listener, performanceAudio)
            )}
        </group>
    );
}

function mapBalls(
    { id, color }: BallData,
    ballsRef: RefObject<Map<string, { mesh?: THREE.Mesh; audio?: THREE.PositionalAudio }>>,
    listener: THREE.AudioListener,
    performanceAudio: PerformanceAudio
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
