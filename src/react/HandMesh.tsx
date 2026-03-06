import * as THREE from "three";
import {
    createCircleHandGeometry,
    createHandMaterial,
    createRectHandGeometry
} from "./Default3DModels";
import {
    DEFAULT_HAND_COLOR as DEFAULT_CIRCLE_HAND_COLOR,
    DEFAULT_CIRCLE_HAND_HEIGHT_SEGMENT,
    DEFAULT_CIRCLE_HAND_RADIUS,
    DEFAULT_CIRCLE_HAND_WIDTH_SEGMENT,
    DEFAULT_HAND_VISIBILITY,
    DEFAULT_CUBE_HAND_DEPTH,
    DEFAULT_CUBE_HAND_WIDTH,
    DEFAULT_CUBE_HAND_COLOR
} from "../constants/miseEnSceneDefaultValues";
import { Ref } from "react";

export type HandCircleMeshProps = {
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    color?: THREE.ColorRepresentation;
    visible?: boolean;
    ref?: Ref<THREE.Mesh>;
};

export function HandCircleMesh({
    radius = DEFAULT_CIRCLE_HAND_RADIUS,
    widthSegments = DEFAULT_CIRCLE_HAND_WIDTH_SEGMENT,
    heightSegments = DEFAULT_CIRCLE_HAND_HEIGHT_SEGMENT,
    color = DEFAULT_CIRCLE_HAND_COLOR,
    visible = DEFAULT_HAND_VISIBILITY,
    ref
}: HandCircleMeshProps) {
    return (
        <mesh
            geometry={createCircleHandGeometry({
                radius,
                widthSegments,
                heightSegments
            })}
            material={createHandMaterial({ color })}
            visible={visible}
            ref={ref}
        />
    );
}


export type HandRectMeshProps = {
    length?: number;
    width?: number;
    depth?: number;
    color?: THREE.ColorRepresentation;
    visible?: boolean;
    ref?: Ref<THREE.Mesh>;
};

export function HandRectMesh({
    length = DEFAULT_CUBE_HAND_DEPTH,
    width = DEFAULT_CUBE_HAND_WIDTH,
    depth = DEFAULT_CUBE_HAND_DEPTH,
    color = DEFAULT_CUBE_HAND_COLOR,
    visible = DEFAULT_HAND_VISIBILITY,
    ref
}: HandRectMeshProps) {
    const geometry = createRectHandGeometry({
        length,
        width,
        depth
    });
    const material = createHandMaterial({ color });
    return <mesh geometry={geometry} material={material} visible={visible} ref={ref} />;
}
