import { useEffect, useRef } from "react";
import { Simulator } from "../../src/MusicalJuggling";
import { Button, ColorPicker } from "@mantine/core";
import * as THREE from "three";

export function SimulatorApp({}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const simulatorRef = useRef<Simulator>(null);

    function handleBackgroundColorChange(value: string) {
        // TODO : rather have simulator logic in simulator class, such as simulator.changeBackgroundColor
        if (simulatorRef.current === null) {
            return;
        }
        simulatorRef.current.scene.background = new THREE.Color(value);
        simulatorRef.current.requestRenderIfNotRequested();
    }

    useEffect(() => {
        simulatorRef.current = new Simulator({ canvas: canvasRef.current!, enableAudio: true });
    }, []);

    return (
        <>
            <canvas ref={canvasRef} className="simulator" />
            <ColorPicker onChange={handleBackgroundColorChange}></ColorPicker>
        </>
    );
}
