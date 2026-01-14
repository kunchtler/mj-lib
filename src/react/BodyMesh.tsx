import * as THREE from "three";
import {
    createJugglerCubeGeometry as createBodyGeometry,
    createJugglerMaterial as createBodyMaterial
} from "./Default3DModels";
import {
    DEFAULT_JUGGLER_CUBE_COLOR,
    DEFAULT_JUGGLER_CUBE_DEPTH,
    DEFAULT_JUGGLER_CUBE_HEIGHT,
    DEFAULT_JUGGLER_CUBE_WIDTH
} from "../constants/miseEnSceneDefaultValues";
import { Ref } from "react";

export type BodyMeshProps = {
    height?: number;
    width?: number;
    depth?: number;
    color?: THREE.ColorRepresentation;
    ref?: Ref<THREE.Mesh>;
};

//TODO : Customization options

export function BodyMesh({
    height = DEFAULT_JUGGLER_CUBE_HEIGHT,
    width = DEFAULT_JUGGLER_CUBE_WIDTH,
    depth = DEFAULT_JUGGLER_CUBE_DEPTH,
    color = DEFAULT_JUGGLER_CUBE_COLOR,
    ref
}: BodyMeshProps) {
    return (
        <mesh
            geometry={createBodyGeometry({ height, width, depth })}
            material={createBodyMaterial({ color })}
            ref={ref}
        />
    );
}
