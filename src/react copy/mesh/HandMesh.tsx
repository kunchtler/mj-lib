import * as THREE from "three";
import {
    createHandGeometry,
    createHandMaterial,
    DEFAULT_HAND_COLOR,
    DEFAULT_HAND_HEIGHT_SEGMENT,
    DEFAULT_HAND_RADIUS,
    DEFAULT_HAND_WIDTH_SEGMENT
} from "../../view";

export function HandMesh({
    radius = DEFAULT_HAND_RADIUS,
    widthSegments = DEFAULT_HAND_WIDTH_SEGMENT,
    heightSegments = DEFAULT_HAND_HEIGHT_SEGMENT,
    color = DEFAULT_HAND_COLOR
}: {
    radius?: number;
    widthSegments?: number;
    heightSegments?: number;
    color?: THREE.ColorRepresentation;
}) {
    return (
        <mesh
            geometry={createHandGeometry({
                radius,
                widthSegments,
                heightSegments
            })}
            material={createHandMaterial({ color })}
        />
    );
}
