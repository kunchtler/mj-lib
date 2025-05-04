import { Affix, Center, Container } from "@mantine/core";
import { JugglingAppParams, Simulator, TimeConductor } from "../../src/MusicalJuggling";
import { TimeControls } from "./TimeControls";
import styles from "./simulator.module.css";
import { useEffect, useRef, useState } from "react";
import { pattern as pattern1 } from "./jugglingPattern";

//TODO : Handle timecontrol styles better ?

function App() {
    // return (
    //     <Group /*style={{ height: "100%", display: "flex" }}*/>
    //         <img src={image} style={{ width: "100px", display: "block", objectFit: "contain" }} />
    //         <canvas style={{ height: "100%", width: "100%", display: "block", flex: 1 }} />
    //     </Group>
    // );
    // return (
    //     <div style={{ height: "100%", display: "flex" }}>
    //         <img src={image} style={{ width: "100px", display: "block", objectFit: "contain" }} />
    //         <canvas style={{ height: "100%", width: "100%", display: "block", flex: 1 }} />
    //     </div>
    // );

    const [pattern, setPattern] = useState<JugglingAppParams>(pattern1);
    const [playbackRate, setPlaybackRate] = useState(1);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const simulatorRef = useRef<Simulator>(null);
    const timeConductorRef = useRef<TimeConductor>(new TimeConductor());

    useEffect(() => {
        simulatorRef.current = new Simulator({
            canvas: canvasRef.current!,
            enableAudio: true,
            scene: { backgroundColor: "#444444" },
            timeConductor: timeConductorRef.current
        });
    }, []);

    // useEffect(() => {
    //     simulatorRef.current!.scene.background = new THREE.Color(sceneBackgroundColor);
    //     simulatorRef.current!.requestRenderIfNotRequested();
    // }, [sceneBackgroundColor]);

    useEffect(() => {
        simulatorRef.current!.reset();
        if (pattern !== undefined) {
            simulatorRef.current!.setupPattern(pattern);
        }
    }, [pattern]);

    // useEffect(() => {
    //     simulatorRef.current!.timeController.playbackRate = playbackRate ?? 1;
    // }, [playbackRate]);

    return (
        <>
            <canvas ref={canvasRef} className={styles.simulator} />
            <div className={styles.timecontrols}>
                <TimeControls timeConductor={timeConductorRef.current} />
            </div>
            {/* <ColorPicker onChange={handleBackgroundColorChange}></ColorPicker> */}
        </>
    );
}

export default App;
