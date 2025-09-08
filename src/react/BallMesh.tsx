import * as THREE from "three";
import {
    createBallGeometry,
    createBallMaterial,
    DEFAULT_BALL_COLOR,
    DEFAULT_BALL_HEIGHT_SEGMENT,
    DEFAULT_BALL_RADIUS,
    DEFAULT_BALL_WIDTH_SEGMENT
} from "../view";
import { Ref } from "react";
import { ThreeElements } from "@react-three/fiber";

export type BallMeshProps = {
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    color?: THREE.ColorRepresentation;
    ref?: Ref<THREE.Mesh>;
} & ThreeElements["mesh"];

// TODO : Add customization options (striped, with middle band, ...)

export function BallMesh({
    radius = DEFAULT_BALL_RADIUS,
    widthSegments = DEFAULT_BALL_WIDTH_SEGMENT,
    heightSegments = DEFAULT_BALL_HEIGHT_SEGMENT,
    color = DEFAULT_BALL_COLOR,
    ref,
    ...props
}: BallMeshProps) {
    return (
        <mesh
            geometry={createBallGeometry({
                radius,
                widthSegments,
                heightSegments
            })}
            material={createBallMaterial({ color })}
            ref={ref}
            {...props}
        />
    );
}
