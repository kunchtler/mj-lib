import { JSX, RefObject, useRef } from "react";
import { PerformanceView } from "../view/PerformanceView";
import { PerformanceContext } from "./Context";
import { BallModel, Clock, HandModel } from "..";
import { RenderCallback, ThreeElements, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import mergeRefs from "merge-refs";
import { BodyMesh } from ".";

// type PerformanceReactProps = {
//     performance: PerformanceView;
//     // audio: boolean;
//     onFrameUpdate: RenderCallback;
//     jugglers: JSX.Element;
//     balles: JSX.Element;
// };

// enableMapSet();

// TODO : Cool render when timeconductor is paused.

//TODO : onFrameUpdate takes all the balls and jugglers and hands ?
//TODO : First step : Have the hard in stone set render loop. Or customizable ?

// TODO : How to move the whole performance ?
// Is the Performance secretely an object3D ?

export type ReactPatternDescription = {
    balls: {
        id: string;
        sounds: {
            whenCaught: (param: any) => AudioBuffer;
            whenTossed: (param: any) => AudioBuffer;
            whileAirborne: (param: any) => AudioBuffer;
        };
        mesh: JSX.Element;
        model: BallModel;
        updateMeshPosition: (param: any) => void;
    }[];
    jugglers: {
        // TODO : Make jugglers also have unique ID instead of name ?
        name: string;
        table: JSX.Element;
        bodyMesh: JSX.Element;
        rightHandMesh: JSX.Element;
        leftHandMesh: JSX.Element;
        rightHandModel: HandModel;
        leftHandModel: HandModel;
        updateMeshPosition: (param: any) => void;
    }[];
};

export function Performance({ performance, onFrameUpdate }: PerformanceReactProps) {
    const ballsRef: RefObject<any[]> = [];
    const jugglersRef: RefObject<any[]> = [];

    useFrame((state, delta, frame) => {
        onFrameUpdate(state, delta, frame);
    });

    return (
        <>
            {jugglers.map((elem) => {})}
            {}
            {}
        </>
    );
}

function mapJugglers({}: {}) {
    return <BodyMesh/>
}

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

// Have as param for each element (ball, juggler, etc) an updatePosition method as parameter.
// Use it in a top call to UseFrame (once only from Performance).
// How would a pause be handled ?
// The clock pauses, thus it is reflected in the update.
// Only pass the event inference layer, not the ones above, at it really is the one needed.
