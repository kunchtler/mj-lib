import { Canvas, extend, useFrame } from "@react-three/fiber";
import { Performance } from "../src/react/core/Performance";
import { BasicBall, BasicBallProps } from "../src/react/examples/BasicBall";
import { BasicJuggler } from "../src/react/examples/BasicJuggler";
import { BasicJugglerProps } from "../src/react/mesh/JugglerMesh";
import { BasicTable, BasicTableProps } from "../src/react/examples/BasicTable";
import { Clock } from "../src";
import { useEffect, useRef, useState } from "react";
import { TimeControls } from "./TimeControls";
import { PerformanceModel } from "../src/model/PerformanceModel";
import { PerformanceView } from "../src/view/PerformanceView";
import * as THREE from "three";
import { pattern } from "./pattern";
import { patternToModel } from "../src/inference/PatternToModel";
import { OrbitControls } from "@react-three/drei";
import styles from "./simulator.module.css";
import mergeRefs from "merge-refs";
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { AlertsTimeline } from "../src/utils/AlertsTimeline";
import { Alerts } from "../src/utils/Alerts";
//TODO : styles ?
//TODO : clock optional for performance ?

//To extend those components to make them usable with R3F
extend({ LineMaterial, LineGeometry });

export function App() {
    const [clock] = useState(() => new Clock({bounds: [0, 15]}));
    const [model] = useState(() => patternToModel(pattern));
    const [ballsData] = useState<BasicBallProps[]>([
        { id: "Do?K", color: "red" },
        { id: "Re?K", color: "orange" },
        { id: "Mi?K", color: "yellow" }
    ]);
    const [jugglersData] = useState<BasicJugglerProps[]>([
        { name: "Kylian", position: [-1,0,0] as [number, number, number] }
    ]);
    const [tablesData] = useState<BasicTableProps[]>([
        { name: "KylianT", position: [0, 0, 0], rotation: [0, Math.PI, 0] }
    ]);

    return (
        <>
            <Canvas frameloop="always" camera={{ position: [6, 2, 0] }}>
                <color args={[0x444444]} attach={"background"} />
                <OrbitControls enableDamping={false} target={[-1, 1, 0]} />
                <ambientLight args={[0xfefded, 2]} />
                <directionalLight args={[0xfefded, 1]} />
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
    
    useEffect(() => {
        const alertesTimeline = new AlertsTimeline();
    
        model.balls.forEach((ball) => {
            alertesTimeline.addTimeline(ball.timeline, 0.2)
            //console.log(ball.timeline.stringify())
        })

        console.log('----------- ALERTES TIMELINE --------------')
        alertesTimeline.forEach((a) => {
            console.log(a[0] + 's ('+ a[1][1] +'): ' +a[1][0].stringify())
        })

        console.log('----------- ALERTES TIMELINE / WITH CLOCK RUNNING --------------')
        let alertes = new Alerts(alertesTimeline, clock);

        alertes.addEventListener("sup", (e) => {
            console.log(e.stringify());
        })
    })

    useFrame(() => {
        const time = performance.getClock().getTime();
        // Update the balls' positions.
        for (const [id, ballView] of performance.balls) {
            let { model, curvePoints } = ballView;
            const ballObject = ballsRef.current.get(id);
            const curveObject = curvesRef.current.get(id);

            ballView.calculateCurve(performance.getClock());

            if (ballObject !== undefined) {
                const pos = model.position(time);
                const o = new THREE.Object3D()
                if(performance.position){
                    o.position.set(performance.position[0], performance.position[1], performance.position[2]);
                }
                if(!performance.getClock().isPaused()){
                    curvePoints.shift();
                    curvePoints.push(model.position(time+0.31));
                    curvePoints = curvePoints.map((p) => o.worldToLocal(p.clone()));

                    let curve = new THREE.CatmullRomCurve3(curvePoints);
                    curve.closed = false;
                    curve.curveType = 'catmullrom';
                    curve.tension = 0.5;

                    const p = curve.getPoints(100);

                    curveObject?.geometry.setFromPoints(p);
                }

                const localPos = o.worldToLocal(
                    pos.clone()
                );
                ballObject.position.copy(localPos);
            }

                      
        }


        // Update the hands' positions.
        for (const [name, { model }] of performance.jugglers) {
            const jugglerObject = jugglersRef.current.get(name);
            const jugglerPos = performance.jugglers.get(name)?.position;
            if (jugglerObject !== undefined) {
                if (jugglerObject.leftHand !== null) {
                    const o = new THREE.Object3D()
                    if(performance.position){
                        o.position.set(performance.position[0] + jugglerPos[0], performance.position[1] - jugglerPos[1], performance.position[2] - jugglerPos[2]);
                    }
                    const localPos = o.worldToLocal(
                        model.leftHand.position(time).clone()
                    );
                    jugglerObject.leftHand.position.copy(localPos);
                }
                if (jugglerObject.rightHand !== null) {
                    const o = new THREE.Object3D()
                    if(performance.position){
                        o.position.set(performance.position[0] + jugglerPos[0], performance.position[1] - jugglerPos[1], performance.position[2] - jugglerPos[2]);
                    }
                    const localPos = o.worldToLocal(
                        model.rightHand.position(time).clone()
                    );
                    jugglerObject.rightHand.position.copy(localPos);
                }
            }
        }
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
        <Performance audio={true} clock={clock} performance={performance} position={[0, 0, 0]}>
            {jugglersData.map((elem) => mapJuggler(elem))}
            {ballsData.map((elem) => mapBalls(elem))}
        </Performance>
    );
}
