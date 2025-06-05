import { Canvas, extend, useFrame } from "@react-three/fiber";
import { Performance } from "../src/react/Performance";
import {
    BasicBall,
    BasicBallProps,
    BasicJuggler,
    BasicJugglerProps,
    BasicTable,
    BasicTableProps
} from "../src/react/Default3DModels";
import { Clock } from "../src/MusicalJuggling";
import { useRef, useState } from "react";
import { TimeControls } from "./TimeControls";
import { PerformanceModel } from "../src/model/PerformanceModel";
import { PerformanceView } from "../src/view/PerformanceView";
import * as THREE from "three";
import { pattern } from "./pattern";
import { patternToModel } from "../src/model/PatternToModel";
import { OrbitControls } from "@react-three/drei";
import styles from "./simulator.module.css";
import mergeRefs from "merge-refs";
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

//TODO : styles ?
//TODO : clock optional for performance ?

//To extend those components to make them usable with R3F
extend({ LineMaterial, LineGeometry });

export function App() {
    const [clock] = useState(() => new Clock({bounds: [0, 20]}));
    const [model] = useState(() => patternToModel(pattern));
    const [ballsData] = useState<BasicBallProps[]>([
        { id: "Do?K", color: "red" },
        { id: "Re?K", color: "orange" },
        { id: "Mi?K", color: "yellow" }
    ]);
    const [jugglersData] = useState<BasicJugglerProps[]>([
        { name: "Kylian", position: [-1, 0, 0] as [number, number, number] }
    ]);
    const [tablesData] = useState<BasicTableProps[]>([
        { name: "KylianT", position: [0, 0, 0], rotation: [0, Math.PI, 0] }
    ]);

    return (
        <>
            <Canvas frameloop="always" camera={{ position: [3, 2, 0] }}>
                <color args={[0x444444]} attach={"background"} />
                <OrbitControls enableDamping={false} target={[-1, 1, 0]} />
                <ambientLight args={[0xfefded, 2]} />
                <directionalLight args={[0xfefded, 1]} />
                <axesHelper args={[1.5]} position={[0, 0.01, 0]} />
                <gridHelper args={[30, 30]} />
                <CanvasContent
                    clock={clock}
                    model={model}
                    ballsData={ballsData}
                    jugglersData={jugglersData}
                    tablesData={tablesData}
                />
            </Canvas>
            <div className={styles.timecontrols}>
                <TimeControls clock={clock} />
            </div>
        </>
    );
}

function CanvasContent({
    clock,
    model,
    ballsData,
    jugglersData,
    tablesData
}: {
    clock: Clock;
    model: PerformanceModel;
    ballsData: BasicBallProps[];
    jugglersData: BasicJugglerProps[];
    tablesData: BasicTableProps[];
}) {
    const [performance] = useState(() => new PerformanceView({ model: model, clock: clock }));
    const ballsRef = useRef(new Map<string, THREE.Object3D>());
    const curvesRef = useRef(new Map<string, THREE.Line>());
    const jugglersRef = useRef(
        new Map<string, { leftHand: THREE.Object3D | null; rightHand: THREE.Object3D | null }>()
    );

    useFrame(() => {
        const time = performance.getClock().getTime();
        // Update the balls' positions.
        for (const [id, ballView] of performance.balls) {
            const { model, curvePoints, initCurve } = ballView;
            const ballObject = ballsRef.current.get(id);
            const curveObject = curvesRef.current.get(id);

            if (curvePoints.length === 0) {
                ballView.initCurve(performance.getClock());
                console.log('After initCurve:', curvePoints);
            }

            if (ballObject !== undefined) {
                const pos = model.position(time);

                if(!performance.getClock().isPaused()){
                    curvePoints.shift();
                    curvePoints.push(model.position(time+0.81));

                    let curve = new THREE.CatmullRomCurve3(curvePoints);
                    curve.closed = false;
                    curve.curveType = 'catmullrom';
                    curve.tension = 0.5;

                    const p = curve.getPoints(100);

                    curveObject?.geometry.setFromPoints(p);
                }

                ballObject.position.copy(pos);
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

    function mapBalls({ id, ref, ...props }: BasicBallProps) {
        return (
            <>
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
                <mesh ref={mergeRefs((elem) => {
                        if (elem === null) {
                            curvesRef.current.delete(id);
                        } else {
                            curvesRef.current.set(id, elem);
                        }
                    })}>
                    <lineGeometry />
                    <lineMaterial color={props.color} linewidth={0.002}/>
                </mesh>
            </>
        );
    }
    // <BasicBall
    //     id="Do?K"
    //     color="red"
    //     ref={(elem) => {
    //         if (elem !== null) {
    //             ballsRef.current.set("Do?K", elem);
    //         }
    //     }}
    // />

    function mapJuggler({ name, ...props }: BasicJugglerProps) {
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
    // <BasicJuggler
    //     name="Kylian"
    //     position={[-1, 0, 0]}
    //     rightHandRef={(elem) => {
    //         const ref = jugglersRef.current.get("Kylian");
    //         if (ref !== undefined) {
    //             ref.rightHand = elem;
    //         }
    //     }}
    //     leftHandRef={(elem) => {
    //         const ref = jugglersRef.current.get("Kylian");
    //         if (ref !== undefined) {
    //             ref.leftHand = elem;
    //         }
    //     }}
    // />

    function mapTables({ name, ...props }: BasicTableProps) {
        return <BasicTable name={name} key={name} {...props} />;
    }

    return (
        <Performance audio={true} clock={clock} performance={performance}>
            {jugglersData.map((elem) => mapJuggler(elem))}
            {tablesData.map((elem) => mapTables(elem))}
            {ballsData.map((elem) => mapBalls(elem))}
        </Performance>
    );
}
