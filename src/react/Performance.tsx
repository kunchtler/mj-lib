import { useRef } from "react";
import { PerformanceView } from "../view/PerformanceView";
import { PerformanceContext } from "./Context";
import { Clock } from "../MusicalJuggling";
import { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import mergeRefs from "merge-refs";

type PerformanceReactProps = {
    clock: Clock;
    // model: PerformanceModel;
    performance: PerformanceView;
    audio: boolean;
    // pattern: JugglingAppParams;
} & ThreeElements["object3D"];

// enableMapSet();

// TODO : Cool render when timeconductor is paused.

export function Performance({
    performance,
    /*clock, audio,*/ ref,
    ...props
}: PerformanceReactProps) {
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
            {/*@ts-expect-error React 19's refs are weirdly typed*/}
            <object3D ref={mergeRefs(object3DRef, ref)} {...props}></object3D>
        </PerformanceContext>
    );
}
