import { JSX, useRef } from "react";
import { PerformanceView } from "../../view/PerformanceView";
import { PerformanceContext } from "./Context";
import { Clock } from "../..";
import { RenderCallback, ThreeElements, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import mergeRefs from "merge-refs";

type PerformanceReactProps = {
    performance: PerformanceView;
    // audio: boolean;
    onFrameUpdate: RenderCallback;
    jugglers: JSX.Element;
    balles: JSX.Element;
};

// enableMapSet();

// TODO : Cool render when timeconductor is paused.

//TODO : onFrameUpdate takes all the balls and jugglers and hands ?
//TODO : First step : Have the hard in stone set render loop. Or customizable ?

export function Performance({ performance, onFrameUpdate }: PerformanceReactProps) {
    const balls: any[] = [];
    const jugglers: any[] = [];

    useFrame((state, delta, frame) => {
        onFrameUpdate(state, delta, frame);
    });

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
            {/*@ts-expect-error React 19's refs are weirdly typed*/}
            <object3D ref={mergeRefs(object3DRef, ref)} {...props}></object3D>
        </PerformanceContext>
    );
}

// Have as param for each element (ball, juggler, etc) an updatePosition method as parameter.
// Use it in a top call to UseFrame (once only from Performance).
// How would a pause be handled ?
// The clock pauses, thus it is reflected in the update.
// Only pass the event inference layer, not the ones above, at it really is the one needed.
