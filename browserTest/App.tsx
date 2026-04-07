import { Canvas, extend, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { TimeControls } from "./TimeControls";
import * as THREE from "three";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import styles from "./simulator.module.css";
import { LineMaterial } from "three/examples/jsm/Addons.js";
import { Wrapper } from "../src/react/Performance";
import { BodyMesh, Clock } from "../src";
import { pattern2 as pattern } from "./pattern";
extend(LineMaterial);
//TODO : styles ?
//TODO : clock optional for performance ?

//TODO : Juggler model have position of the juggler, and position of its hand relative to that ?

// Fill in the model's positional info
// TODO : Have that info better propagated when reworking of info propagates from the inference.
const clock = new Clock();

export function App() {
    return (
        <>
            {/* TODO : At some point, use invalidate. */}
            <Canvas frameloop="always" camera={{ position: [3, 2, 0] }}>
                <CanvasContents clock={clock} />
            </Canvas>
            <div className={styles.timecontrols}>
                <TimeControls clock={clock} />
            </div>
        </>
    );
}

function CanvasContents({ clock }: { clock: Clock }) {
    const [listener] = useState(new THREE.AudioListener());
    const scene = useThree((state) => {
        return state.scene;
    });

    useEffect(() => {
        // cubic Bézier
        const radius = 2;
        const curve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(1, 2, radius * 2), // start
            new THREE.Vector3(1, 2 - (4 / 3) * radius, radius * 2 - 3), // control‑1
            new THREE.Vector3(-3, 2 - (4 / 3) * radius, 0), // control‑2
            new THREE.Vector3(1, 2, 0) // end
        );
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        return () => {
            scene.remove(line);
        };
    });

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
            <Wrapper clock={clock} listener={listener} descriptionHelper={pattern} />
        </>
    );
}

//TODO : Optimization THREE do not recreate vectors each time but have one that is reused.
