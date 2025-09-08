import {
    calcPosFromAngles,
    OrbitControls,
    PerspectiveCamera,
    PositionalAudio
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Ref, useEffect, useRef, useState } from "react";
import { CustomThreePositionalAudio } from "../src";
import * as THREE from "three";
import { create } from "zustand";

export function App() {
    // useEffect(() => {
    //     const x = setTimeout(async () => {
    //         try {
    //             audio.current.connectTo(listener.current.gain);
    //             const response = await fetch("browserTest/music.mp3");
    //             const buffer = await THREE.AudioContext.getContext().decodeAudioData(
    //                 await response.arrayBuffer()
    //             );
    //             audio.current.setBuffer(buffer);
    //             audio.current.play();
    //             console.log("yy");
    //         } catch (err) {
    //             console.error(`Unable to fetch the audio file. Error: ${err}`);
    //         }
    //     }, 500);
    //     return () => {
    //         clearTimeout(x);
    //     };
    // }, []);

    return (
        <>
            <Canvas frameloop="always" camera={{ position: [3, 2, 0] }}>
                <Contents />
            </Canvas>
        </>
    );
}

function Contents() {
    const audio = useRef<CustomThreePositionalAudio>(null!);
    // const listener = useRef<THREE.AudioListener>(null!);

    const [listener] = useState(new THREE.AudioListener());
    const audioRef = useRef<THREE.PositionalAudio>(null!);

    const scene = useThree((state) => state.scene);
    const camera = useThree((state) => state.camera);

    useEffect(() => {
        // const listener = new THREE.AudioListener();
        // camera.add(listener);
        console.log(audioRef.current);
        const ctx = THREE.AudioContext.getContext();

        // const audio = new THREE.PositionalAudio(listener);
        const audio = audioRef.current;
        const loader = new THREE.AudioLoader();
        let disposed = false;
        // scene.add(audio);
        loader.load("browserTest/music.mp3", (buffer) => {
            console.log(ctx.state);
            if (disposed) {
                return;
            }
            audio.setBuffer(buffer);
            audio.play();
            console.log("Playing");
            audio.setLoop(true);
        });
        scene.remove(audio);

        const mesh = new THREE.Mesh(
            new THREE.TorusGeometry(),
            new THREE.MeshLambertMaterial({ color: "red" })
        );
        scene.add(mesh);
        return () => {
            disposed = true;
            camera.remove(listener);
            audio.stop();
            console.log("Stopped");
            scene.remove(mesh);
        };
    }, [scene, camera, listener]);

    // useFrame(({ clock }) => (listener.position.x = Math.sin(clock.elapsedTime)));

    return (
        <>
            {/* <audioListener ref={listener} position={[1, 0, 0]}/> */}
            <color args={[0x444444]} attach={"background"} />
            <PerspectiveCamera makeDefault position={[-3, 2, 6]}>
                <primitive object={listener} position={[0, 0, 0]} />
            </PerspectiveCamera>
            <OrbitControls enableDamping={false} target={[0, 0, 0]} />
            <ambientLight args={[0xfefded, 2]} />
            <directionalLight args={[0xfefded, 1]} />
            <axesHelper args={[1.5]} position={[0, 0.01, 0]} />
            <gridHelper args={[30, 30]} />
            <positionalAudio args={[listener]} ref={audioRef} />
            {/* <CustomPositionalAudio ref={audio} /> */}
            {/* <PositionalAudio url="src/assets/notes/A4.mp3" /> */}
            {/* <positionalAudio args={[new ]} position={[0, 0, 0]}></positionalAudio> */}
        </>
    );
}

// type ListenerState = {
//     listener: THREE.AudioListener | null;
//     updateListener: (listener: THREE.AudioListener | null) => void;
// };

// const useListenerStore = create<ListenerState>()((set) => ({
//     listener: null,
//     updateListener: (listener) => {
//         set(() => ({ listener: listener }));
//     }
// }));

// type AudioListenerProps = { makeDefault: boolean; ref: Ref<THREE.AudioListener> };

// function AudioListener({ makeDefault }: { makeDefault: boolean }) {
//     const oldListener = useListenerStore((state) => state.listener);
//     const updateListener = useListenerStore((state) => state.updateListener);
//     const [listener] = useState(() => new THREE.AudioListener());

//     useEffect(() => {
//         if (makeDefault) {
//             updateListener(listener);
//         }
//         return () => {
//             if (oldListener === listener) {
//                 updateListener(null);
//             }
//         };
//     }, [listener, makeDefault, oldListener, updateListener]);

//     return <primitive object={listener} />;
// }
