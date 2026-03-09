import { Canvas, extend } from "@react-three/fiber";
import { useState } from "react";
import { TimeControls } from "./TimeControls";
import * as THREE from "three";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import styles from "./simulator.module.css";
import { LineMaterial } from "three/examples/jsm/Addons.js";
import { Wrapper } from "../src/react/Performance";
import { Clock } from "../src";
import { pattern } from "./pattern";
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
