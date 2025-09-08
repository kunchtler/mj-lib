import { Canvas, extend, invalidate, useFrame } from "@react-three/fiber";
import { BallMesh, BodyMesh, HandMesh, TableMesh } from "../src/react";
import {
    Clock,
    DEFAULT_JUGGLER_CUBE_ARM_LENGTH,
    DEFAULT_JUGGLER_CUBE_COLOR,
    DEFAULT_JUGGLER_CUBE_DEPTH,
    DEFAULT_JUGGLER_CUBE_HEIGHT,
    DEFAULT_JUGGLER_CUBE_WIDTH,
    DEFAULT_TABLE_HEIGHT,
    PerformanceAudio
} from "../src";
import { RefObject, useEffect, useRef, useState } from "react";
import { TimeControls } from "./TimeControls";
import { PerformanceModel } from "../src/model/PerformanceModel";
import * as THREE from "three";
import { pattern } from "./pattern";
import { patternToModel } from "../src/inference/PatternToModel";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import styles from "./simulator.module.css";
import { LineMaterial } from "three/examples/jsm/Addons.js";
extend(LineMaterial);
//TODO : styles ?
//TODO : clock optional for performance ?

// TODO : Rename "model" to events ???
// TODO : demand + invalidate.
// TODO : Store position in JugglerModel
// TODO : Store position in TableModel
// TODO : In model we have timeline. We need to have "physicality" in attribute.
// The addition of both allows to compute into real positions.

type HandDescription = {
    tossSpot: THREE.Vector3Tuple; // Relative to juggler origin.
    catchSpot: THREE.Vector3Tuple; // Relative to juggler origin.
    restSpot: THREE.Vector3Tuple; // Relative to juggler origin.
};

type BallData = { id: string; color: THREE.ColorRepresentation };
type JugglerData = {
    name: string;
    position: THREE.Vector3Tuple; // Relative to performance origin.
    rotation?: THREE.Vector3Tuple; // Relative to performance origin.
    rightHand: HandDescription;
    leftHand: HandDescription;
};
type TableData = {
    name: string;
    position: THREE.Vector3Tuple; // Relative to performance origin.
    rotation?: THREE.Vector3Tuple; // Relative to performance origin.
    spots: Map<string, THREE.Vector3Tuple>; // Relative to table origin.
    unknownSpot: THREE.Vector3Tuple; // Relative to table origin.
};

type performanceDescription = {
    ballsData: BallData[];
    model: PerformanceModel;
    jugglersData: JugglerData[];
    tablesData: TableData[];
};

function createHandData(
    isRight: boolean,
    juggler?: {
        armLength?: number; //TODO : Remove (and rather only do with cube dimensions)
        height?: number;
        width?: number;
        depth?: number;
        color?: THREE.ColorRepresentation;
    }
): HandDescription {
    // Default values
    juggler ??= {};
    juggler.armLength ??= DEFAULT_JUGGLER_CUBE_ARM_LENGTH;
    juggler.height ??= DEFAULT_JUGGLER_CUBE_HEIGHT;
    juggler.width ??= DEFAULT_JUGGLER_CUBE_WIDTH;
    juggler.depth ??= DEFAULT_JUGGLER_CUBE_DEPTH;
    juggler.color ??= DEFAULT_JUGGLER_CUBE_COLOR;

    const sideSign = isRight ? +1 : -1;

    const restSpot: THREE.Vector3Tuple = [
        juggler.armLength,
        juggler.height - juggler.armLength * 2,
        (sideSign * juggler.depth * 2) / 3
    ];
    const tossSpot: THREE.Vector3Tuple = [
        restSpot[0],
        restSpot[1],
        restSpot[2] - (sideSign * juggler.width) / 4
    ];
    const catchSpot: THREE.Vector3Tuple = [
        restSpot[0],
        restSpot[1],
        restSpot[2] + (sideSign * juggler.width) / 4
    ];
    return { restSpot, catchSpot, tossSpot };
}

// function createTableData(tableHeight: number) {
//     const spots = new Map<string, THREE.Vector3Tuple>();

//     return { spots, unknownSpot: [0, tableHeight, 0] };
// }

const model = patternToModel(pattern);

const description: performanceDescription = {
    model: patternToModel(pattern),
    ballsData: [
        { id: "Do?K", color: "red" },
        { id: "Re?K", color: "orange" },
        { id: "Mi?K", color: "yellow" }
    ],
    jugglersData: [
        {
            name: "Kylian",
            position: [-1, 0, 0],
            leftHand: createHandData(false),
            rightHand: createHandData(true)
        }
    ],
    tablesData: [
        {
            name: "KylianT",
            position: [0, 0, 0],
            rotation: [0, Math.PI, 0],
            spots: new Map<string, THREE.Vector3Tuple>([
                ["Do", [0, DEFAULT_TABLE_HEIGHT, 0]],
                ["Re", [0, DEFAULT_TABLE_HEIGHT, 0]],
                ["Mi", [0, DEFAULT_TABLE_HEIGHT, 0]]
            ]),
            unknownSpot: [0, DEFAULT_TABLE_HEIGHT, 0]
        }
    ]
};

//TODO : Juggler model have position of the juggler, and position of its hand relative to that ?

// Fill in the model's positional info
// TODO : Have that info better propagated when reworking of info propagates from the inference.
for (const { name, position, leftHand, rightHand } of description.jugglersData) {
    const jugglerModel = model.jugglers.get(name)!;
    const jugglerPosition = new THREE.Vector3(...position);
    jugglerModel.leftHand.catchPos = new THREE.Vector3(...leftHand.catchSpot).add(jugglerPosition);
    jugglerModel.rightHand.catchPos = new THREE.Vector3(...rightHand.catchSpot).add(
        jugglerPosition
    );
    jugglerModel.leftHand.tossPos = new THREE.Vector3(...leftHand.tossSpot).add(jugglerPosition);
    jugglerModel.rightHand.tossPos = new THREE.Vector3(...rightHand.tossSpot).add(jugglerPosition);
    jugglerModel.leftHand.restPos = new THREE.Vector3(...leftHand.restSpot).add(jugglerPosition);
    jugglerModel.rightHand.restPos = new THREE.Vector3(...rightHand.restSpot).add(jugglerPosition);
}
for (const { name, position, unknownSpot, spots } of description.tablesData) {
    const tableModel = model.tables.get(name)!;
    const tablePosition = new THREE.Vector3(...position);
    for (const [ballSound, ballPosition] of spots) {
        tableModel.ballsSpots.set(ballSound, new THREE.Vector3(...ballPosition).add(tablePosition));
    }
    tableModel.unkownBallSpot = new THREE.Vector3(...unknownSpot).add(tablePosition);
}

console.log(model.balls.get("Mi?K")!.timeline.stringify());

const clock = new Clock();

export function App() {
    return (
        <>
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

// TODO : Test what is happening when the listener changes.
function Performance({ listener }: { listener: THREE.AudioListener }) {
    // Previous time
    const previousTime = useRef<number>(-Infinity);
    const ballsRef = useRef(new Map<string, { mesh?: THREE.Mesh }>());
    const jugglersRef = useRef(
        new Map<string, { leftHand?: THREE.Mesh; rightHand?: THREE.Mesh; body: THREE.Mesh }>()
    );
    const [performanceAudio] = useState(() => new PerformanceAudio(listener));
    // const audioRef = useRef(new PerformanceAudio());

    useEffect(() => {
        console.log(performanceAudio);
        const loader = new THREE.AudioLoader();
        let disposed = false;
        loader.load("src/assets/notes/A4.mp3", (buffer) => {
            if (disposed) {
                return;
            }
            performanceAudio.playBallSound("Mi?K", buffer, true);
            console.log("Playing");
        });
        return () => {
            disposed = true;
            performanceAudio.stop();
        };
    });

    useFrame(() => {
        const time = clock.getTime();

        // Update the balls' positions.
        for (const [id, { mesh }] of ballsRef.current) {
            const ballObject = ballsRef.current.get(id);
            if (ballObject !== undefined && mesh !== undefined) {
                mesh.position.copy(model.balls.get(id)!.position(time));
            }
        }

        // Make the balls emit sounds.
        // for (const [id, {audio}] of performance.balls) {
        //     if previousTime.current
        // }

        previousTime.current = time;

        // Update the hands' positions.
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
        <group position={[0, 0, 0]}>
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
