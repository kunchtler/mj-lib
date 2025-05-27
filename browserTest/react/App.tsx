import { Simulator, TimeConductor } from "../../src/MusicalJuggling";
import { TimeControls } from "./TimeControls";
import styles from "./simulator.module.css";
import { ReactNode, useEffect, useRef, useState } from "react";
import { pattern as pattern1 } from "./jugglingPattern";
import { Affix } from "@mantine/core";
import { VRButton } from "./VRButton";

//TODO : Handle timecontrol styles better ?
// TODO : When separation of canvas and simulator, see where to put simulator.onVRstart/end.

function App() {
    // const [pattern, setPattern] = useState<JugglingAppParams>(pattern1);
    // const [playbackRate, setPlaybackRate] = useState(1);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // const rendererRef = useRef<WebGLRenderer>(null);
    const simulatorRef = useRef<Simulator>(null);
    const [timeConductor, setTimeConductor] = useState<TimeConductor>(new TimeConductor());
    const [showVRButton, setShowVRButton] = useState(false); //TODO : Find better solution to this.

    useEffect(() => {
        // Create renderer using the existing canvas
        const simulator = new Simulator({
            canvas: canvasRef.current!,
            enableAudio: true,
            scene: { backgroundColor: "#444444" },
            timeConductor: timeConductor
        });
        simulator.setupPattern(pattern1);

        // const renderer = simulator.renderer;
        // rendererRef.current = renderer;
        simulatorRef.current = simulator;
        // const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        // renderer.setSize(window.innerWidth, window.innerHeight);
        // renderer.xr.enabled = true;

        // Add VRButton to the DOM
        // document.body.appendChild(VRButtonThree.createButton(renderer));

        // renderer.setAnimationLoop(simulator.render);

        setShowVRButton(true);

        return () => {
            simulator.dispose();
            timeConductor.dispose();
        };
    }, [timeConductor]);

    // useEffect(() => {
    //     simulatorRef.current!.scene.background = new THREE.Color(sceneBackgroundColor);
    //     simulatorRef.current!.requestRenderIfNotRequested();
    // }, [sceneBackgroundColor]);

    // useEffect(() => {
    //     simulatorRef.current!.reset();
    //     simulatorRef.current!.setupPattern(pattern);
    // }, [pattern]);

    // useEffect(() => {
    //     simulatorRef.current!.timeController.playbackRate = playbackRate ?? 1;
    // }, [playbackRate]);

    let vrButton: ReactNode;
    if (showVRButton) {
        vrButton = (
            <Affix position={{ bottom: "md", right: "md" }}>
                <VRButton
                    renderer={simulatorRef.current!.renderer}
                    onVRStart={simulatorRef.current!.onVRstart}
                    onVREnd={simulatorRef.current!.onVRend}
                />
            </Affix>
        );
    } else {
        vrButton = <></>;
    }

    return (
        <>
            <canvas ref={canvasRef} className={styles.simulator} />
            <div className={styles.timecontrols}>
                <TimeControls timeConductor={timeConductor} />
            </div>
            {vrButton}
            {/* <ColorPicker onChange={handleBackgroundColorChange}></ColorPicker> */}
        </>
    );
    // return (
    //     <>
    //         <canvas ref={canvasRef} />
    //         {showVRButton ? (
    //             <VRButton renderer={/*rendererRef.current!*/ simulatorRef.current!.renderer} />
    //         ) : (
    //             <></>
    //         )}
    //     </>
    // );
}

export default App;
