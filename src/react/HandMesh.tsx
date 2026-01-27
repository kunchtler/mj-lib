import * as THREE from "three";
import {
    createCircleHandGeometry,
    createHandMaterial,
    createRectHandGeometry
} from "./Default3DModels";
import {
    DEFAULT_HAND_COLOR,
    DEFAULT_CIRCLE_HAND_HEIGHT_SEGMENT,
    DEFAULT_CIRCLE_HAND_RADIUS,
    DEFAULT_CIRCLE_HAND_WIDTH_SEGMENT
} from "../constants/miseEnSceneDefaultValues";
import { Ref } from "react";

export type HandMeshProps = {
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    color?: THREE.ColorRepresentation;
    ref?: Ref<THREE.Mesh>;
};

export function HandCircleMesh({
    radius = DEFAULT_CIRCLE_HAND_RADIUS,
    widthSegments = DEFAULT_CIRCLE_HAND_WIDTH_SEGMENT,
    heightSegments = DEFAULT_CIRCLE_HAND_HEIGHT_SEGMENT,
    color = DEFAULT_HAND_COLOR,
    ref
}: HandMeshProps) {
    return (
        <mesh
            geometry={createCircleHandGeometry({
                radius,
                widthSegments,
                heightSegments
            })}
            material={createHandMaterial({ color })}
            ref={ref}
        />
    );
}

export function HandRectMesh({
    radius = DEFAULT_CIRCLE_HAND_RADIUS,
    widthSegments = DEFAULT_CIRCLE_HAND_WIDTH_SEGMENT,
    heightSegments = DEFAULT_CIRCLE_HAND_HEIGHT_SEGMENT,
    color = DEFAULT_HAND_COLOR,
    ref
}: HandMeshProps) {
    const geometry = createRectHandGeometry({
        radius,
        widthSegments,
        heightSegments
    });
    const material = createHandMaterial({ color });
    return <mesh geometry={geometry} material={material} ref={ref} />;
}
