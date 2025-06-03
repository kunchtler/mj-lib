import { ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { PerformanceSim } from "../simulation/PerformanceSim";
import { PerformanceContext } from "./Context";
import { TimeConductor } from "../MusicalJuggling";
import { PerformanceModel } from "../model/PerformanceModel";
import { ThreeElements, useFrame, useThree } from "@react-three/fiber";
import { enableMapSet } from "immer";
import * as THREE from "three";
import mergeRefs from "merge-refs";
import { FiberObject3D } from "./FiberTypeUtils";

type PerformanceReactProps = {
    clock: TimeConductor;
    // model: PerformanceModel;
    performance: PerformanceSim;
    audio: boolean;
    // pattern: JugglingAppParams;
} & FiberObject3D;

// enableMapSet();

// TODO : Cool render when timeconductor is paused.

export function Performance({ performance, clock, audio, ref, ...props }: PerformanceReactProps) {
    // const [performance] = useState(() => new PerformanceSim({ model: model }));
    const object3DRef = useRef<THREE.Object3D>(null!);

    //TODO : SoundNames / buffer

    // useEffect(() => {
    //     performance.model = model;
    // }, [performance, model]);

    // useEffect(() => {
    //     if (audio) {
    //         performance.enableAudio({ballsThreeAudio: , bufferMap: })
    //     } else {
    //         performance.disableAudio();
    //     }
    // })

    // useEffect(() => {
    //     performance.audio?.setClock(clock);
    //     // The cleanup happens when a new clock is set.
    //     // TODO : Change this to make it behave more naturally, with cleanup func ?
    // }, [clock, performance.audio]);

    return (
        <PerformanceContext value={performance}>
            <object3D ref={mergeRefs(object3DRef, ref)} {...props}></object3D>
        </PerformanceContext>
    );
}
