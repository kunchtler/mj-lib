import { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import {
    DEFAULT_BALL_RADIUS,
    DEFAULT_BALL_WIDTH_SEGMENT,
    DEFAULT_BALL_HEIGHT_SEGMENT,
    DEFAULT_BALL_COLOR
} from "../../view";
import { Ball } from "../core/Ball";
import { BallMesh } from "../mesh/BallMesh";

export type BasicBallProps = {
    name?: string;
    id: string;
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    color?: THREE.ColorRepresentation;
} & ThreeElements["object3D"];

export function BasicBall({
    id,
    name,
    radius,
    widthSegments,
    heightSegments,
    color,
    ...props
}: BasicBallProps) {
    //Default values.
    radius ??= DEFAULT_BALL_RADIUS;
    widthSegments ??= DEFAULT_BALL_WIDTH_SEGMENT;
    heightSegments ??= DEFAULT_BALL_HEIGHT_SEGMENT;
    color ??= DEFAULT_BALL_COLOR;
    // Three fiber sub-scene.
    return (
        <Ball name={name} id={id} radius={radius} {...props}>
            <BallMesh
                radius={radius}
                widthSegments={widthSegments}
                heightSegments={heightSegments}
                color={color}
            />
        </Ball>
    );
}
