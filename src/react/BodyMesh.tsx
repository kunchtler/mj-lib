import * as THREE from "three";
import {
    createJugglerCubeGeometry as createBodyGeometry,
    createJugglerMaterial as createBodyMaterial
} from "./Default3DModels";
import {
    DEFAULT_CUBE_BODY_COLOR,
    DEFAULT_CUBE_BODY_DEPTH,
    DEFAULT_CUBE_BODY_HEIGHT,
    DEFAULT_CUBE_BODY_WIDTH
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
    height = DEFAULT_CUBE_BODY_HEIGHT,
    width = DEFAULT_CUBE_BODY_WIDTH,
    depth = DEFAULT_CUBE_BODY_DEPTH,
    color = DEFAULT_CUBE_BODY_COLOR,
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
