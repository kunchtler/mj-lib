import * as THREE from "three";
import { ReactNode, RefObject, use, useEffect, useRef } from "react";
import { PerformanceContext } from "./Context";
import { BallSim as BallSim } from "../simulation/BallSim";
import { ThreeElements } from "@react-three/fiber";
import mergeRefs from "merge-refs";
import { FiberObject3D } from "./FiberTypeUtils";

export type BallReactProps = {
    name?: string;
    id: string;
    radius: number;
} & FiberObject3D;

export function Ball({ radius, id, ref, ...props }: BallReactProps) {
    const performance = use(PerformanceContext);
    const object3DRef = useRef<THREE.Object3D>(null!);

    // Create / delete the ball.
    useEffect(() => {
        if (performance === undefined) {
            return;
        }
        const ballModel = performance.model.balls.get(id);
        if (ballModel === undefined) {
            return;
        }
        const ball = new BallSim({
            model: ballModel
        });
        performance.balls.set(id, ball);
        return () => {
            performance.balls.delete(id);
        };
    }, [performance, radius, id]);

    /*@ts-expect-error React 19's refs are weirdly typed*/
    return <object3D ref={mergeRefs(object3DRef, ref)} {...props}></object3D>;
}
