import { Canvas, useFrame } from "@react-three/fiber";
import { Performance } from "../../src/view/Performance";
import {
    BasicBall,
    BasicBallProps,
    BasicJuggler,
    BasicJugglerParams,
    BasicTable
} from "../../src/view/Default3DModels";
import { TimeConductor } from "../../src/MusicalJuggling";
import { useRef, useState } from "react";
import { TimeControls } from "./TimeControls";
import { PerformanceModel } from "../../src/model/PerformanceModel";
import { PerformanceSim } from "../../src/simulation/PerformanceSim";
import { BallSim } from "../../src/simulation/BallSim";
import * as THREE from "three";
import { pattern } from "./pattern";
import { patternToModel } from "../../src/model/PatternToModel";
import { OrbitControls } from "@react-three/drei";
import styles from "./simulator.module.css";
import mergeRefs from "merge-refs";

//TODO : styles ?
//TODO : clock optional for performance ?

export function App() {
    const [clock] = useState(() => new TimeConductor());
    const [model] = useState(() => patternToModel(pattern));

    return (
        <>
            <Canvas frameloop="demand">
                <color args={[0x444444]} attach={"background"} />
                <OrbitControls enableDamping={false} />
                <ambientLight args={[0xfefded, 2]} />
                <directionalLight args={[0xfefded, 1]} />
                <axesHelper args={[1.5]} position={[0, 0.01, 0]} />
                <gridHelper args={[30, 30]} />
                <CanvasContent clock={clock} model={model} />
            </Canvas>
            <div className={styles.timecontrols}>
                <TimeControls clock={clock} />
            </div>
        </>
    );
}

function CanvasContent({ clock, model }: { clock: TimeConductor; model: PerformanceModel }) {
    const [performance] = useState(() => new PerformanceSim({ model: model, clock: clock }));
    const ballsRef = useRef(new Map<string, THREE.Object3D>());
    const jugglersRef = useRef(
        new Map<string, { leftHand: THREE.Object3D; rightHand: THREE.Object3D }>()
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
        for (const [name, { model }] of performance.jugglers) {
            const jugglerObject = jugglersRef.current.get(name);
            if (jugglerObject !== undefined) {
                jugglerObject.leftHand.position.copy(model.leftHand.position(time));
                jugglerObject.rightHand.position.copy(model.rightHand.position(time));
            }
        }
    });

    const ballsData = [
        { id: "Do?K", note: "Do", color: "red" },
        { id: "Re?K", note: "Re", color: "orange" },
        { id: "Mi?K", note: "Mi", color: "yellow" }
    ];

    const jugglersData = [{ name: "Kylian", position: [-1, 0, 0] as [number, number, number] }];

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

    function mapJuggler({ name, ...props }: BasicJugglerParams) {
        return (
            <BasicJuggler
                name={name}
                key={name}
                rightHandRef={(elem) => {
                    const ref = jugglersRef.current.get(name);
                    if (ref !== undefined) {
                        ref.rightHand = elem;
                    } else {
                        jugglersRef.current.delete(name);
                    }
                }}
                leftHandRef={(elem) => {
                    const ref = jugglersRef.current.get(name);
                    if (ref !== undefined) {
                        ref.leftHand = elem;
                    } else {
                        jugglersRef.current.delete(name);
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

    return (
        <Performance audio={true} clock={clock} performance={performance}>
            {jugglersData.map((elem) => mapJuggler(elem))}
            <BasicTable name="KylianT" position={[0, 0, 0]} rotation={[0, Math.PI, 0]} />
            {ballsData.map((elem) => mapBalls(elem))}
        </Performance>
    );
}
