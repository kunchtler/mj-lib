import { Canvas, extend, invalidate, useFrame } from "@react-three/fiber";
import { BallMesh, BodyMesh, HandCircleMesh, TableMesh } from "../src/react";
import {
    CatchEvent,
    Clock,
    DEFAULT_JUGGLER_CUBE_ARM_LENGTH,
    DEFAULT_JUGGLER_CUBE_COLOR,
    DEFAULT_JUGGLER_CUBE_DEPTH,
    DEFAULT_JUGGLER_CUBE_HEIGHT,
    DEFAULT_JUGGLER_CUBE_WIDTH,
    DEFAULT_TABLE_HEIGHT,
    AudioEngine,
    TossEvent
} from "../src";
import { RefObject, useEffect, useRef, useState } from "react";
import { TimeControls } from "./TimeControls";
import { PerformanceModel } from "../src/model/PerformanceModel";
import * as THREE from "three";
import { pattern } from "./pattern";
import { JSONJugglingScoreToModel } from "../src/inference/PatternToModel";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import styles from "./simulator.module.css";
import { LineMaterial } from "three/examples/jsm/Addons.js";
extend(LineMaterial);
//TODO : styles ?
//TODO : clock optional for performance ?

const model = JSONJugglingScoreToModel(pattern);

//TODO : Juggler model have position of the juggler, and position of its hand relative to that ?

// Fill in the model's positional info
// TODO : Have that info better propagated when reworking of info propagates from the inference.
const clock = new Clock();

export function App() {
    return (
        <>
            {/* TODO : At some point, use invalidate. */}
            <Canvas frameloop="always" camera={{ position: [3, 2, 0] }}>
                <CanvasContents />
            </Canvas>
            <div className={styles.timecontrols}>
                <TimeControls clock={clock} />
            </div>
        </>
    );
}

function CanvasContents() {
    const [listener] = useState(new THREE.AudioListener());

    return (
        <>
            <color args={[0x444444]} attach={"background"} />
            <PerspectiveCamera makeDefault position={[6, 2, 3]}>
                <primitive object={listener} />
            </PerspectiveCamera>
            <OrbitControls enableDamping={false} target={[0, 0, 0]} />
            <ambientLight args={[0xfefded, 2]} />
            <directionalLight args={[0xfefded, 1]} />
            <axesHelper args={[1.5]} position={[0, 0.01, 0]} />
            <gridHelper args={[30, 30]} />
            <Performance listener={listener} />
        </>
    );
}

//TODO : Optimization THREE do not recreate vectors each time but have one that is reused.

const buffersMap = new Map<string, AudioBuffer>();
const loader = new THREE.AudioLoader();
loader.load("src/assets/notes/C4.mp3", (buffer) => {
    buffersMap.set("Do?K", buffer);
});
loader.load("src/assets/notes/D4.mp3", (buffer) => {
    buffersMap.set("Re?K", buffer);
});
loader.load("src/assets/notes/E4.mp3", (buffer) => {
    buffersMap.set("Mi?K", buffer);
});

// function changeCoordinateSystem(
//     point: THREE.Vector3,
//     originalObject: THREE.Object3D,
//     targetObject: THREE.Object3D
// ): THREE.Vector3 {
//     return targetObject.worldToLocal(originalObject.localToWorld(point.clone()));
// }
// TODO : Test what is happening when the listener changes.
// TODO : Have juggler origin in addition to their body mesh.
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
    const [performanceAudio] = useState(() => new AudioEngine({ listener }));
    const performanceRef = useRef<THREE.Object3D>(null!);
    // const audioRef = useRef(new PerformanceAudio());

    useEffect(() => {
        performanceAudio.setPlaybackRate(1);
    });

    // useEffect(() => {
    //     console.log(performanceAudio);
    //     const loader = new THREE.AudioLoader();
    //     let disposed = false;
    //     loader.load("src/assets/notes/A4.mp3", (buffer) => {
    //         if (disposed) {
    //             return;
    //         }
    //         performanceAudio.playBallSound("Mi?K", buffer, true);
    //         console.log("Playing");
    //     });
    //     return () => {
    //         disposed = true;
    //         performanceAudio.stop();
    //     };
    // });

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
                performanceAudio.changeJugglerGainForBall(id, prevEv.hand.juggler.name);
            }

            // Make the ball sound if needed.
            if (
                prevEvTime !== null &&
                prevEv instanceof CatchEvent &&
                previousTime.current < prevEvTime &&
                !clock.isStopped()
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

        // for (const [name, { model }] of performance.jugglers) {
        //     const jugglerObject = jugglersRef.current.get(name);
        //     if (jugglerObject !== undefined) {
        //         if (jugglerObject.leftHand !== null) {
        //             const localPos = jugglerObject.leftHand.worldToLocal(
        //                 model.leftHand.position(time).clone()
        //             );
        //             // console.log(localPos);
        //             jugglerObject.leftHand.position.copy(localPos);
        //         }
        //         if (jugglerObject.rightHand !== null) {
        //             const localPos = jugglerObject.rightHand.worldToLocal(
        //                 model.rightHand.position(time).clone()
        //             );
        //             jugglerObject.rightHand.position.copy(localPos);
        //         }
        //     }
        // }
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
            <HandCircleMesh
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
            <HandCircleMesh
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
