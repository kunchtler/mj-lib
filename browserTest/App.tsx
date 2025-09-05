import { Canvas, extend, useFrame } from "@react-three/fiber";
import { Performance } from "../src/react/core/Performance";
import { BasicBall, BasicBallProps } from "../src/react/examples/BasicBall";
import { BasicJuggler } from "../src/react/examples/BasicJuggler";
import { BasicJugglerProps } from "../src/react/mesh/JugglerMesh";
import { BasicTable, BasicTableProps } from "../src/react/examples/BasicTable";
import { ballVelocity, Clock, TossCatchEvent, TossEvent } from "../src";
import { RefObject, useEffect, useRef, useState } from "react";
import { TimeControls } from "./TimeControls";
import { PerformanceModel } from "../src/model/PerformanceModel";
import { PerformanceView } from "../src/view/PerformanceView";
import * as THREE from "three";
import { pattern } from "./pattern";
import { JugglingPatternRaw, patternToModel } from "../src/inference/PatternToModel";
import { OrbitControls, TorusKnot } from "@react-three/drei";
import styles from "./simulator.module.css";
import mergeRefs from "merge-refs";
import { LineMaterial } from "three/examples/jsm/Addons.js";
extend(LineMaterial);
//TODO : styles ?
//TODO : clock optional for performance ?

// TODO : Rename "model" to events ???

type performanceDescription = {
    ballsData: { id: string; color: THREE.ColorRepresentation }[];
    model: PerformanceModel;
    jugglersData: { name: string; position: THREE.Vector3Tuple; rotation?: THREE.Vector3Tuple }[];
    tablesData: { name: string; position: THREE.Vector3Tuple; rotation?: THREE.Vector3Tuple }[];
};

const description: performanceDescription = {
    model: patternToModel(pattern),
    ballsData: [
        { id: "Do?K", color: "red" },
        { id: "Re?K", color: "orange" },
        { id: "Mi?K", color: "yellow" }
    ],
    jugglersData: [{ name: "Kylian", position: [-1, 0, 0] }],
    tablesData: [{ name: "KylianT", position: [0, 0, 0], rotation: [0, Math.PI, 0] }]
};
const clock = new Clock();

export function App() {
    return (
        <>
            <Canvas frameloop="always" camera={{ position: [3, 2, 0] }}>
                <color args={[0x444444]} attach={"background"} />
                <OrbitControls enableDamping={false} target={[-1, 1, 0]} />
                <ambientLight args={[0xfefded, 2]} />
                <directionalLight args={[0xfefded, 1]} />
                <axesHelper args={[1.5]} position={[0, 0.01, 0]} />
                <gridHelper args={[30, 30]} />
                <CanvasContent />
            </Canvas>
            <div className={styles.timecontrols}>
                <TimeControls clock={clock} />
            </div>
        </>
    );
}

function CanvasContent() {
    const [performance] = useState(
        () => new PerformanceView({ model: description.model, clock: clock })
    );
    const ballsRef = useRef(new Map<string, THREE.Object3D>());
    const jugglersRef = useRef(
        new Map<string, { leftHand: THREE.Object3D | null; rightHand: THREE.Object3D | null }>()
    );

    useFrame(() => {
        const time = performance.getClock().getTime();

        // Update the balls' positions.
        for (const [id, { model }] of performance.balls) {
            const ballObject = ballsRef.current.get(id);
            if (ballObject !== undefined) {
                ballObject.position.copy(model.position(time));
            }
        }

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
        <Performance audio={true} clock={clock} performance={performance}>
            {description.jugglersData.map((elem) => mapJuggler(elem, jugglersRef))}
            {description.tablesData.map((elem) => mapTables(elem))}
            {description.ballsData.map((elem) => mapBalls(elem, ballsRef))}
        </Performance>
    );
}

function mapBalls(
    { id, ref, ...props }: BasicBallProps,
    ballsRef: RefObject<Map<string, THREE.Object3D>>
) {
    return (
        <BasicBall
            id={id}
            key={id}
            ref={mergeRefs((elem) => {
                if (elem === null) {
                    ballsRef.current.delete(id);
                } else {
                    ballsRef.current.set(id, elem);
                }
                /*@ts-expect-error React 19's refs are weirdly typed*/
            }, ref)}
            {...props}
        />
    );
}

function mapJuggler(
    { name, ...props }: BasicJugglerProps,
    jugglersRef: RefObject<
        Map<
            string,
            {
                leftHand: THREE.Object3D | null;
                rightHand: THREE.Object3D | null;
            }
        >
    >
) {
    return (
        <BasicJuggler
            name={name}
            key={name}
            rightHandRef={(elem) => {
                const ref = jugglersRef.current.get(name);
                if (ref === undefined) {
                    if (elem !== null) {
                        jugglersRef.current.set(name, {
                            rightHand: elem,
                            leftHand: null
                        });
                    }
                } else {
                    ref.rightHand = elem;
                    if (ref.rightHand === null && ref.leftHand === null) {
                        // jugglersRef.current.delete(name);
                    }
                }
            }}
            leftHandRef={(elem) => {
                const ref = jugglersRef.current.get(name);
                if (ref === undefined) {
                    if (elem !== null) {
                        jugglersRef.current.set(name, {
                            rightHand: null,
                            leftHand: elem
                        });
                    }
                } else {
                    ref.leftHand = elem;
                    if (ref.rightHand === null && ref.leftHand === null) {
                        // jugglersRef.current.delete(name);
                    }
                }
            }}
            {...props}
        />
    );
}

function mapTables({ name, ...props }: BasicTableProps) {
    return <BasicTable name={name} key={name} {...props} />;
}