import { Canvas, extend, useFrame } from "@react-three/fiber";
import { Performance } from "../src/react/core/Performance";
import { BasicBall, BasicBallProps } from "../src/react/examples/BasicBall";
import { BasicJuggler } from "../src/react/examples/BasicJuggler";
import { BasicJugglerProps } from "../src/react/mesh/JugglerMesh";
import { BasicTable, BasicTableProps } from "../src/react/examples/BasicTable";
import { ballVelocity, Clock, TossCatchEvent, TossEvent } from "../src";
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
import { LineMaterial } from "three/examples/jsm/Addons.js";
extend(LineMaterial);
//TODO : styles ?
//TODO : clock optional for performance ?

export function App() {
    const [clock] = useState(() => new Clock());
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

    useEffect(() => {
        const event = model.balls.get("Do?K")?.timeline.nextEvent(0)[1];
        if (event instanceof TossCatchEvent) {
            console.log(`Example of fetching information at time ${event.time}:`);
            console.log(`Is event a toss ? : ${event instanceof TossEvent}`);
            console.log(`Siteswap height : ${event.siteswapHeight}`);
            console.log(`Time between two successive toss of the juggler : ${event.unitTime}s`);
            const tossPerMinute = 60 / event.unitTime;
            console.log(`Number of tosses per minute of the juggler : ${tossPerMinute}`);
            const tossStartPos = event.ball.positionAtEvent(event);
            const tossEndPos = event.ball.positionAtEvent(event.nextBallEvent()[1]);
            console.log(`Toss starting position : ${tossStartPos.toArray()}`);
            console.log(`Toss ending position : ${tossEndPos.toArray()}`);
            console.log(
                "At that tempo, if the starting and ending positions of the toss are the same, here are the velocities the ball should have when tossed at different siteswap heights :\nTODO : Technically, this doesn't take into account the time the ball spends in hand... In order to fix this, interact with the timeline at the event layer, and have dwell time parameter there ?\nTODO : This won't work if the juggler's tempo changes midflight."
            );
            for (let i = 1; i < 7; i++) {
                const flightTime = event.unitTime * i;
                console.log(
                    `Siteswap height ${i} :\n\tFlight time ${flightTime}\n\tVelocity vector ${ballVelocity(tossStartPos, 0, tossEndPos, flightTime, 0).toArray()}`
                );
            }
        }
    }, [model]);

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

    function mapBalls({ id, ref, ...props }: BasicBallProps) {
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
