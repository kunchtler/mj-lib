import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { TimeControls } from "./react/TimeControls";
import { createElement, ReactNode, useRef } from "react";
import * as THREE from "three";

// Comment gérer l'instanciation d'un pattern (position des jongleurs, id et son des balles, etc)
// Comment

export default function App() {
    const ref = useRef<THREE.Mesh>(null);
    return (
        <>
            <Canvas frameloop="demand">
                {/* <PerspectiveCamera makeDefault fov={75} near={0.1} far={50} /> */}
                <OrbitControls />
                <Comp>
                    <mesh>
                        <boxGeometry args={[2, 2, 2]} />
                        <meshPhongMaterial args={[{ color: "red" }]} />
                    </mesh>
                </Comp>
                <ambientLight intensity={0.1} />
                <directionalLight position={[0, 0, 5]} color="red" />
                {/* <JugglingSimulation>
                    <Ball />
                    <Ball />
                    <Ball />
                    <Juggler />
                    <Juggler />
                </JugglingSimulation> */}
            </Canvas>
            {/* <TimeControls /> */}
        </>
    );
}

function Comp({ children }: { children: ReactNode }) {
    return <>{children};</>;
}

console.log(createElement(Comp));

// function Ball(props: {id?: number, sound?: }) {
//     return <></>;
// }
// function Juggler(props: { position?: [number, number, number] }) {
//     return <></>;
// }

// function JugglingSimulation({}) {
//     useFrame(() => {});

//     return <></>;
//     return (
//         <>
//             <Ball />
//             <Ball />
//             <Juggler />
//         </>
//     );
// }
