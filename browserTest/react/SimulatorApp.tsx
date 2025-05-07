import { useEffect, useRef, useState } from "react";
import styles from "./simulator.module.css";
import { JugglingAppParams, Simulator } from "../../src/MusicalJuggling";
import { Button, ColorPicker, Image } from "@mantine/core";
import * as THREE from "three";
import image from "../assets/screen.png";

// TODO : canvas not needed for simulator ? So that the same simulator can be rendered in multiple canvases ?
// TODO : Have dedicated worker handle the canvas ? Should be feasible but there's a bit of rewrite.
// Is it premature optimization ?
// TODO : Effect dismount (causes WebGL warnings in console.). Do after cleaning up code for UI.
// TODO : Put Strict mode on again.
// TODO : TimeConductor end / duration / loop, etc...
// TODO : Check if ESLINT React really works :/

export interface SimulatorAppProps {
    readonly sceneBackgroundColor?: string;
    readonly pattern?: JugglingAppParams;
    readonly playbackRate?: number;
}

export function SimulatorApp({ sceneBackgroundColor, pattern, playbackRate }: SimulatorAppProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const simulatorRef = useRef<Simulator>(null);

    useEffect(() => {
        simulatorRef.current = new Simulator({
            canvas: canvasRef.current!,
            enableAudio: true,
            scene: { backgroundColor: sceneBackgroundColor }
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
    //     simulatorRef.current!.timeConductor.playbackRate = playbackRate ?? 1;
    // }, [playbackRate]);

    return (
        <>
            <canvas ref={canvasRef} className={styles.simulator} />
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
