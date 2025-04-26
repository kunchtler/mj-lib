import { useEffect, useRef, useState } from "react";
import style from "./simulator.module.css";
import { JugglingAppParams, Simulator } from "../../src/MusicalJuggling";
import { Button, ColorPicker, Image } from "@mantine/core";
import * as THREE from "three";
import image from "../assets/screen.png";

// TODO : canvas not needed for simulator ? So that the same simulator can be rendered in multiple canvases ?
// TODO : Have dedicated worker handle the canvas ? Should be feasible but there's a bit of rewrite.
// Is it premature optimization ?

export interface SimulatorAppProps {
    sceneBackgroundColor?: string;
    pattern?: JugglingAppParams;
}

export function SimulatorApp({ sceneBackgroundColor, pattern }: SimulatorAppProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const simulatorRef = useRef<Simulator>(null);

    useEffect(() => {
        simulatorRef.current = new Simulator({ canvas: canvasRef.current!, enableAudio: true });
    }, []);

    useEffect(() => {
        simulatorRef.current!.scene.background = new THREE.Color(sceneBackgroundColor);
        simulatorRef.current!.requestRenderIfNotRequested();
    }, [sceneBackgroundColor]);

    useEffect(() => {}, [pattern]);

    return (
        <>
            <canvas ref={canvasRef} className={style.simulator} />
            {/* <ColorPicker onChange={handleBackgroundColorChange}></ColorPicker> */}
        </>
    );
}

// function handleBackgroundColorChange(value: string) {
//     // TODO : rather have simulator logic in simulator class, such as simulator.changeBackgroundColor
//     if (simulatorRef.current === null) {
//         return;
//     }
//     simulatorRef.current.scene.background = new THREE.Color(value);
//     simulatorRef.current.requestRenderIfNotRequested();
// }
