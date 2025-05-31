import * as THREE from "three";
import { ReactNode, use, useEffect, useRef } from "react";
import { PerformanceContext } from "./Context";
import { BallSim as BallSim } from "../simulation/BallSim";

export const DEFAULT_BALL_RADIUS = 0.05;
export const DEFAULT_BALL_COLOR = 0xffdbac;

export function Ball({ name, children }: { name: string; children?: ReactNode }) {
    const performance = use(PerformanceContext);
    const object3DRef = useRef<THREE.Object3D>(null!);

    // Setup the ball.
    useEffect(() => {
        if (performance === undefined) {
            return;
        }
        const ballModel = performance.model.balls.get(name);
        if (ballModel === undefined) {
            return;
        }
        const ball = new BallSim({
            object3D: object3DRef.current,
            model: ballModel
        }); //TODO Fill in debug
        performance.addBall(name, ball);
        return () => {
            performance.removeBall(name);
        };
    }, [performance, name]);

    return <object3D ref={object3DRef}>{children}</object3D>;
}

// TODO : Add customization options (striped, with middle band, ...)
export function BallMesh({
    radius,
    color
}: {
    radius?: number;
    color?: THREE.ColorRepresentation;
}) {
    radius ??= DEFAULT_BALL_RADIUS;
    color ??= DEFAULT_BALL_COLOR;
    return (
        <mesh>
            <sphereGeometry args={[radius, 8, 4]} />
            <meshPhongMaterial args={[{ color }]} />
        </mesh>
    );
}

